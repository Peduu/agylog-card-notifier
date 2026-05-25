from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, PlainTextResponse
from contextlib import asynccontextmanager
import aiosqlite
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pydantic import BaseModel
from typing import Optional
import asyncio
import socket
import json
import os
import ipaddress

DB_PATH = os.path.join(os.path.dirname(__file__), "db", "app.db")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
LOCALHOST_IPS = {"127.0.0.1", "::1"}

def _split_env_list(value: str) -> list[str]:
    return [item.strip() for item in value.replace(";", ",").split(",") if item.strip()]

def _client_ip_from_request(request: Request) -> str:
    trust_proxy = os.getenv("APP_TRUST_PROXY", "").strip().lower() in {"1", "true", "yes", "on"}
    if trust_proxy:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    return request.client.host if request.client else ""

def _ip_allowed(client_ip: str) -> bool:
    allowed_entries = _split_env_list(os.getenv("APP_ALLOWED_CLIENT_IPS", ""))
    if not allowed_entries:
        return True

    if client_ip in LOCALHOST_IPS:
        return True

    try:
        remote_ip = ipaddress.ip_address(client_ip)
    except ValueError:
        return False

    for entry in allowed_entries:
        try:
            if "/" in entry:
                if remote_ip in ipaddress.ip_network(entry, strict=False):
                    return True
            elif remote_ip == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue

    return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS senders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                smtp_host TEXT NOT NULL,
                smtp_port INTEGER NOT NULL DEFAULT 587,
                smtp_user TEXT NOT NULL,
                smtp_pass TEXT NOT NULL,
                use_tls INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sent_emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER,
                sender_email TEXT NOT NULL,
                recipients TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                send_mode TEXT NOT NULL DEFAULT 'cc',
                status TEXT NOT NULL DEFAULT 'sent',
                archived INTEGER NOT NULL DEFAULT 0,
                sent_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (sender_id) REFERENCES senders(id) ON DELETE SET NULL
            );
        """)
        await db.commit()
    yield

app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def restrict_by_client_ip(request: Request, call_next):
    if _ip_allowed(_client_ip_from_request(request)):
        return await call_next(request)

    return PlainTextResponse("Not found", status_code=404)

@app.get("/api/health")
async def health():
    return {"ok": True}


# ── Models ──────────────────────────────────────────────────────────────────

class SenderCreate(BaseModel):
    name: str
    email: str
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_pass: str
    use_tls: bool = True

class SenderUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    use_tls: Optional[bool] = None

class TemplateCreate(BaseModel):
    subject: str
    body: str
    is_favorite: bool = False

class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    is_favorite: Optional[bool] = None

class SendEmailRequest(BaseModel):
    sender_id: int
    recipients: list[str]
    subject: str
    body: str
    send_mode: str = "cc"  # "cc" | "individual"
    save_as_template: bool = False

class OutlookDraftRequest(BaseModel):
    recipients: list[str]
    subject: str
    body: str
    send_mode: str = "cc"  # "cc" | "individual"

class SentLogRequest(BaseModel):
    sender_email: str
    recipients: list[str]
    subject: str
    body: str
    send_mode: str = "cc"
    status: str = "sent"


# ── Senders ─────────────────────────────────────────────────────────────────

class SmtpTestRequest(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_pass: str
    use_tls: bool = True

def _smtp_error_text(exc: Exception) -> str:
    text = str(exc).strip()
    return text[:500] if text else exc.__class__.__name__

def _smtp_auth_message(exc: Exception) -> str:
    detail = _smtp_error_text(exc)
    lower = detail.lower()
    if "basic authentication is disabled" in lower:
        return (
            "O servidor Microsoft recusou o login porque a autenticacao SMTP por senha esta desativada nesta conta. "
            f"Detalhe: {detail}"
        )
    if "username and password not accepted" in lower or "badcredentials" in lower:
        return (
            "O provedor recusou usuario ou senha. Se for Gmail, use senha de app em vez da senha normal. "
            f"Detalhe: {detail}"
        )
    return f"O servidor recusou o login SMTP. Detalhe: {detail}"

def _smtp_modes(port: int, use_tls: bool = True):
    # 465 usa SSL direto; 587 normalmente usa STARTTLS.
    primary_mode = (True, False) if port == 465 else (False, bool(use_tls))
    fallback_mode = (False, True) if port == 465 else (True, False)
    return primary_mode, fallback_mode

async def _smtp_login(host: str, port: int, user: str, password: str, use_tls: bool = True):
    primary_mode, fallback_mode = _smtp_modes(port, use_tls)

    async def _attempt(use_ssl: bool, start_tls: bool):
        smtp = aiosmtplib.SMTP(
            hostname=host,
            port=port,
            timeout=12,
            use_tls=use_ssl,
            start_tls=False,
        )
        try:
            await smtp.connect()
            if start_tls:
                await smtp.starttls()
            await smtp.login(user, password)
        finally:
            if smtp.is_connected:
                try:
                    await smtp.quit()
                except Exception:
                    smtp.close()

    try:
        await _attempt(*primary_mode)
    except aiosmtplib.SMTPAuthenticationError:
        raise
    except Exception as e:
        msg = str(e)
        # Servidor ja em TLS mas tentamos STARTTLS, ou o contrario: inverte o modo.
        if "already using TLS" in msg or "SSL" in msg:
            await _attempt(*fallback_mode)
        else:
            raise

@app.post("/api/senders/test")
async def test_smtp(body: SmtpTestRequest):
    try:
        await _smtp_login(body.smtp_host, body.smtp_port, body.smtp_user, body.smtp_pass, body.use_tls)
        return {"ok": True}
    except aiosmtplib.SMTPAuthenticationError as e:
        raise HTTPException(401, _smtp_auth_message(e))
    except (
        aiosmtplib.SMTPConnectError,
        aiosmtplib.SMTPConnectTimeoutError,
        aiosmtplib.SMTPReadTimeoutError,
        aiosmtplib.SMTPTimeoutError,
        OSError,
        TimeoutError,
        ConnectionRefusedError,
    ) as e:
        raise HTTPException(
            502,
            f"Nao conectou ao servidor SMTP ({body.smtp_host}:{body.smtp_port}). Detalhe: {_smtp_error_text(e)}"
        )
    except Exception as e:
        raise HTTPException(500, f"Falha no teste SMTP. Detalhe: {_smtp_error_text(e)}")


@app.get("/api/senders")
async def list_senders():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT id, name, email, smtp_host, smtp_port, smtp_user, use_tls, created_at FROM senders ORDER BY name") as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]

@app.post("/api/senders", status_code=201)
async def create_sender(body: SenderCreate):
    async with aiosqlite.connect(DB_PATH) as db:
        try:
            cur = await db.execute(
                "INSERT INTO senders (name, email, smtp_host, smtp_port, smtp_user, smtp_pass, use_tls) VALUES (?,?,?,?,?,?,?)",
                (body.name, body.email, body.smtp_host, body.smtp_port, body.smtp_user, body.smtp_pass, int(body.use_tls))
            )
            await db.commit()
            return {"id": cur.lastrowid, "updated": False}
        except aiosqlite.IntegrityError:
            await db.execute(
                """
                UPDATE senders
                SET name=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, use_tls=?
                WHERE email=?
                """,
                (body.name, body.smtp_host, body.smtp_port, body.smtp_user, body.smtp_pass, int(body.use_tls), body.email)
            )
            async with db.execute("SELECT id FROM senders WHERE email=?", (body.email,)) as cur:
                row = await cur.fetchone()
            await db.commit()
            return {"id": row[0], "updated": True}

@app.put("/api/senders/{sender_id}")
async def update_sender(sender_id: int, body: SenderUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(400, "Nenhum campo fornecido")
    if "use_tls" in fields:
        fields["use_tls"] = int(fields["use_tls"])
    set_clause = ", ".join(f"{k}=?" for k in fields)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE senders SET {set_clause} WHERE id=?", (*fields.values(), sender_id))
        await db.commit()
    return {"ok": True}

@app.delete("/api/senders/{sender_id}")
async def delete_sender(sender_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM senders WHERE id=?", (sender_id,))
        await db.commit()
    return {"ok": True}


# ── Templates ────────────────────────────────────────────────────────────────

@app.get("/api/templates")
async def list_templates():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM templates ORDER BY is_favorite DESC, created_at DESC") as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]

@app.post("/api/templates", status_code=201)
async def create_template(body: TemplateCreate):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "INSERT INTO templates (subject, body, is_favorite) VALUES (?,?,?)",
            (body.subject, body.body, int(body.is_favorite))
        )
        await db.commit()
        return {"id": cur.lastrowid}

@app.put("/api/templates/{template_id}")
async def update_template(template_id: int, body: TemplateUpdate):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        raise HTTPException(400, "Nenhum campo fornecido")
    if "is_favorite" in fields:
        fields["is_favorite"] = int(fields["is_favorite"])
    set_clause = ", ".join(f"{k}=?" for k in fields)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE templates SET {set_clause} WHERE id=?", (*fields.values(), template_id))
        await db.commit()
    return {"ok": True}

@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM templates WHERE id=?", (template_id,))
        await db.commit()
    return {"ok": True}


# ── Email Send ───────────────────────────────────────────────────────────────

def _open_outlook_drafts(req: OutlookDraftRequest) -> int:
    try:
        import pythoncom
        import win32com.client
    except Exception as e:
        raise RuntimeError(f"Outlook do Windows nao esta disponivel neste PC. Detalhe: {_smtp_error_text(e)}")

    pythoncom.CoInitialize()
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        groups = [[recipient] for recipient in req.recipients] if req.send_mode == "individual" else [req.recipients]

        for group in groups:
            mail = outlook.CreateItem(0)
            mail.To = "; ".join(group)
            mail.Subject = req.subject
            mail.HTMLBody = req.body
            mail.Display(False)

        return len(groups)
    finally:
        pythoncom.CoUninitialize()

@app.post("/api/outlook/draft")
async def open_outlook_draft(req: OutlookDraftRequest):
    if not req.recipients:
        raise HTTPException(400, "Adicione ao menos um destinatario.")
    if not req.subject.strip():
        raise HTTPException(400, "Informe o assunto.")
    if not req.body.strip() or req.body.strip() == "<p></p>":
        raise HTTPException(400, "Escreva o corpo do e-mail.")

    try:
        drafts = await asyncio.to_thread(_open_outlook_drafts, req)
        return {"ok": True, "drafts": drafts}
    except Exception as e:
        raise HTTPException(500, f"Nao consegui abrir o Outlook. Detalhe: {_smtp_error_text(e)}")

@app.post("/api/send")
async def send_email(req: SendEmailRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM senders WHERE id=?", (req.sender_id,)) as cur:
            sender = await cur.fetchone()
    if not sender:
        raise HTTPException(404, "Remetente não encontrado")
    sender = dict(sender)

    async def _send(to_list: list[str]):
        msg = MIMEMultipart("alternative")
        msg["Subject"] = req.subject
        msg["From"] = f"{sender['name']} <{sender['email']}>"
        msg["To"] = ", ".join(to_list)
        msg.attach(MIMEText(req.body, "html", "utf-8"))

        primary_mode, fallback_mode = _smtp_modes(sender["smtp_port"], bool(sender["use_tls"]))

        async def _attempt(use_ssl: bool, start_tls: bool):
            await aiosmtplib.send(
                msg,
                hostname=sender["smtp_host"],
                port=sender["smtp_port"],
                username=sender["smtp_user"],
                password=sender["smtp_pass"],
                use_tls=use_ssl,
                start_tls=start_tls,
                timeout=12,
            )

        try:
            await _attempt(*primary_mode)
        except aiosmtplib.SMTPAuthenticationError:
            raise
        except Exception as e:
            if "already using TLS" in str(e) or "SSL" in str(e):
                await _attempt(*fallback_mode)
            else:
                raise

    try:
        if req.send_mode == "individual":
            for recipient in req.recipients:
                await _send([recipient])
        else:
            await _send(req.recipients)
    except aiosmtplib.SMTPAuthenticationError as e:
        raise HTTPException(401, _smtp_auth_message(e))
    except (aiosmtplib.SMTPRecipientsRefused, aiosmtplib.SMTPRecipientRefused, aiosmtplib.SMTPSenderRefused) as e:
        raise HTTPException(400, f"O servidor recusou remetente ou destinatario. Detalhe: {_smtp_error_text(e)}")
    except Exception as e:
        raise HTTPException(500, f"Falha ao enviar. Detalhe: {_smtp_error_text(e)}")

    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            "INSERT INTO sent_emails (sender_id, sender_email, recipients, subject, body, send_mode) VALUES (?,?,?,?,?,?)",
            (req.sender_id, sender["email"], json.dumps(req.recipients), req.subject, req.body, req.send_mode)
        )
        if req.save_as_template:
            await db.execute(
                "INSERT INTO templates (subject, body) VALUES (?,?)",
                (req.subject, req.body)
            )
        await db.commit()
        return {"id": cur.lastrowid, "ok": True}


# ── Sent History ─────────────────────────────────────────────────────────────

@app.get("/api/sent")
async def list_sent(include_archived: bool = False):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = "SELECT * FROM sent_emails"
        if not include_archived:
            query += " WHERE archived=0"
        query += " ORDER BY sent_at DESC"
        async with db.execute(query) as cur:
            rows = await cur.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["recipients"] = json.loads(d["recipients"])
        result.append(d)
    return result

@app.patch("/api/sent/{entry_id}/archive")
async def archive_entry(entry_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE sent_emails SET archived=1 WHERE id=?", (entry_id,))
        await db.commit()
    return {"ok": True}

@app.delete("/api/sent/{entry_id}")
async def delete_entry(entry_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM sent_emails WHERE id=?", (entry_id,))
        await db.commit()
    return {"ok": True}

@app.post("/api/sent/log", status_code=201)
async def log_sent_entry(body: SentLogRequest):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute(
            """
            INSERT INTO sent_emails (sender_id, sender_email, recipients, subject, body, send_mode, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                None,
                body.sender_email,
                json.dumps(body.recipients),
                body.subject,
                body.body,
                body.send_mode,
                body.status,
            )
        )
        await db.commit()
    return {"id": cur.lastrowid, "ok": True}


# ── Frontend estático ────────────────────────────────────────────────────────
# Deve ficar por último — monta os assets e faz fallback para index.html (SPA)

@app.get("/docs", include_in_schema=False)
@app.get("/redoc", include_in_schema=False)
@app.get("/openapi.json", include_in_schema=False)
async def disabled_technical_endpoint():
    raise HTTPException(404, "Not found")


if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/auth-popup.html", include_in_schema=False)
    async def microsoft_auth_popup():
        return FileResponse(os.path.join(STATIC_DIR, "auth-popup.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
