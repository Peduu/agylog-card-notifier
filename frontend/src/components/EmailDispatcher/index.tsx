import { useState, useEffect, useCallback } from 'react'
import { Send, Plus, History, X, Trash2, MailPlus, Copy, ShieldCheck, ShieldAlert, PlugZap, LogOut } from 'lucide-react'
import { RichEditor } from './RichEditor'
import { RecipientField } from './RecipientField'
import { SubjectField } from './SubjectField'
import { SentHistory } from './SentHistory'
import { SenderModal } from './SenderModal'
import { MicrosoftConfigModal } from './MicrosoftConfigModal'
import {
  getSenders, getTemplates, updateTemplate, sendEmail, openOutlookDraft,
  getSent, archiveSent, deleteSent, deleteSender, logSentEmail,
} from '../../api/client'
import { Toast } from '../ui/Toast'
import type { Sender, Template, SentEmail, EmailDraft } from '../../types'
import {
  clearMicrosoftGraphConfig,
  clearMicrosoftGraphSession,
  completePendingMicrosoftLogin,
  getMicrosoftRedirectUri,
  getStoredMicrosoftGraphConfig,
  getStoredMicrosoftGraphSession,
  loginWithMicrosoft,
  saveMicrosoftGraphConfig,
  sendMailWithMicrosoftGraph,
  type MicrosoftGraphConfig,
  type MicrosoftGraphSession,
} from '../../lib/microsoftGraph'

interface ToastState { message: string; type: 'success' | 'error' }

interface Props {
  initialDraft?: EmailDraft | null
  onDraftConsumed?: () => void
}

export function EmailDispatcher({ initialDraft, onDraftConsumed }: Props) {
  const [senders, setSenders] = useState<Sender[]>([])
  const [selectedSender, setSelectedSender] = useState<number | ''>('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [sent, setSent] = useState<SentEmail[]>([])
  const [showSenderModal, setShowSenderModal] = useState(false)
  const [showMicrosoftConfigModal, setShowMicrosoftConfigModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSmtpFallback, setShowSmtpFallback] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [sending, setSending] = useState(false)
  const [openingOutlook, setOpeningOutlook] = useState(false)
  const [graphSending, setGraphSending] = useState(false)
  const [graphConnecting, setGraphConnecting] = useState(false)
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [recipientPending, setRecipientPending] = useState(false)
  const [microsoftConfig, setMicrosoftConfig] = useState<MicrosoftGraphConfig | null>(null)
  const [microsoftSession, setMicrosoftSession] = useState<MicrosoftGraphSession | null>(null)

  const [recipients, setRecipients] = useState<string[]>([])
  const [mode, setMode] = useState<'cc' | 'individual'>('cc')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const notify = (message: string, type: 'success' | 'error' = 'success') =>
    setToast({ message, type })

  const loadSenders   = useCallback(async () => { try { setSenders(await getSenders()) } catch { /* */ } }, [])
  const loadTemplates = useCallback(async () => { try { setTemplates(await getTemplates()) } catch { /* */ } }, [])
  const loadSent      = useCallback(async () => { try { setSent(await getSent(includeArchived)) } catch { /* */ } }, [includeArchived])

  useEffect(() => { loadSenders(); loadTemplates(); loadSent() }, [loadSenders, loadTemplates, loadSent])
  useEffect(() => {
    setMicrosoftConfig(getStoredMicrosoftGraphConfig())
    setMicrosoftSession(getStoredMicrosoftGraphSession())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function finishMicrosoftLogin() {
      setGraphConnecting(true)
      try {
        const session = await completePendingMicrosoftLogin()
        if (!session || cancelled) return

        setMicrosoftConfig(getStoredMicrosoftGraphConfig())
        setMicrosoftSession(session)
        notify(`Microsoft conectado: ${session.accountEmail}`)

        if (window.location.search.includes('microsoftAuth=1')) {
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } catch (err) {
        if (!cancelled) notify((err as Error).message, 'error')
      } finally {
        if (!cancelled) setGraphConnecting(false)
      }
    }

    finishMicrosoftLogin()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!initialDraft) return
    setSubject(initialDraft.subject)
    setBody(initialDraft.body)
    notify('Rascunho de extravio carregado no e-mail')
    onDraftConsumed?.()
  }, [initialDraft, onDraftConsumed])

  function validateDraft() {
    if (recipientPending) return 'Confirme o destinatario digitado com Enter ou apague o campo pendente'
    if (recipients.length === 0) return 'Adicione ao menos um destinatario'
    if (!subject.trim()) return 'Informe o assunto'
    if (!body.trim() || body === '<p></p>') return 'Escreva o corpo do e-mail'
    return null
  }

  function resetComposerAfterSend() {
    setRecipients([])
    setSubject('')
    setBody('')
    setSaveTemplate(false)
    setRecipientPending(false)
  }

  async function handleSend() {
    const draftError = validateDraft()
    if (!selectedSender) return notify('Selecione um remetente', 'error')
    if (draftError) return notify(draftError, 'error')

    setSending(true)
    try {
      await sendEmail({ sender_id: selectedSender as number, recipients, subject, body, send_mode: mode, save_as_template: saveTemplate })
      notify('E-mail enviado!')
      if (saveTemplate) loadTemplates()
      loadSent()
      resetComposerAfterSend()
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleMicrosoftConnect() {
    if (!microsoftConfig) {
      setShowMicrosoftConfigModal(true)
      return
    }

    setGraphConnecting(true)
    try {
      const session = await loginWithMicrosoft(microsoftConfig)
      setMicrosoftSession(session)
      notify(`Microsoft conectado: ${session.accountEmail}`)
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setGraphConnecting(false)
    }
  }

  function handleMicrosoftDisconnect() {
    clearMicrosoftGraphSession()
    setMicrosoftSession(null)
    notify('Conexao Microsoft encerrada.')
  }

  function handleSaveMicrosoftConfig(config: MicrosoftGraphConfig) {
    saveMicrosoftGraphConfig(config)
    clearMicrosoftGraphSession()
    setMicrosoftConfig(config)
    setMicrosoftSession(null)
    notify('Configuracao Microsoft salva.')
  }

  function handleClearMicrosoftConfig() {
    clearMicrosoftGraphConfig()
    clearMicrosoftGraphSession()
    setMicrosoftConfig(null)
    setMicrosoftSession(null)
    notify('Configuracao Microsoft removida.')
  }

  async function handleGraphSend() {
    const draftError = validateDraft()
    if (draftError) return notify(draftError, 'error')
    if (!microsoftSession) return notify('Entre com a conta Microsoft corporativa antes de enviar.', 'error')

    setGraphSending(true)
    try {
      const result = await sendMailWithMicrosoftGraph(microsoftSession, {
        recipients,
        subject,
        body,
        sendMode: mode,
      })

      await logSentEmail({
        sender_email: microsoftSession.accountEmail,
        recipients,
        subject,
        body,
        send_mode: mode,
        status: 'sent_graph',
      })

      if (saveTemplate) await loadTemplates()
      await loadSent()
      notify(result.sentCount > 1
        ? `${result.sentCount} envios concluidos com Microsoft Graph.`
        : 'E-mail enviado com Microsoft Graph.'
      )
      resetComposerAfterSend()
    } catch (err) {
      notify((err as Error).message, 'error')
      const freshSession = getStoredMicrosoftGraphSession()
      setMicrosoftSession(freshSession)
    } finally {
      setGraphSending(false)
    }
  }

  async function handleOpenOutlook() {
    const draftError = validateDraft()
    if (draftError) return notify(draftError, 'error')

    setOpeningOutlook(true)
    try {
      const result = await openOutlookDraft({ recipients, subject, body, send_mode: mode })
      notify(result.drafts > 1
        ? `${result.drafts} rascunhos abertos no Outlook. Revise e envie por lá.`
        : 'Rascunho aberto no Outlook. Revise e envie por lá.'
      )
      setRecipientPending(false)
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setOpeningOutlook(false)
    }
  }

  function htmlToText(html: string) {
    const container = document.createElement('div')
    container.innerHTML = html
    return container.innerText.trim()
  }

  async function handleCopyDraft() {
    const draftError = validateDraft()
    if (draftError) return notify(draftError, 'error')

    const plainText = [
      `Para: ${recipients.join('; ')}`,
      `Assunto: ${subject}`,
      '',
      htmlToText(body),
    ].join('\n')

    const htmlText = `
      <p><strong>Para:</strong> ${recipients.join('; ')}</p>
      <p><strong>Assunto:</strong> ${subject}</p>
      <hr />
      ${body}
    `

    try {
      if ('ClipboardItem' in window && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlText], { type: 'text/html' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainText)
      }
      notify('Rascunho copiado. Cole no Outlook Web ou no Gmail.')
    } catch {
      await navigator.clipboard.writeText(plainText)
      notify('Rascunho copiado em texto simples.')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', minHeight: 0 }}>

      {/* ── Compose ─────────────────────────────────── */}
      <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Novo e-mail</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, gap: 5 }}
            onClick={() => setShowHistory(h => !h)}
          >
            <History size={13} />
            Histórico
            {sent.length > 0 && (
              <span style={{ background: 'rgba(59,130,246,0.3)', color: '#93c5fd', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>
                {sent.length}
              </span>
            )}
          </button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="microsoft-bridge">
            <div className="microsoft-bridge__header">
              <div>
                <p className="microsoft-bridge__eyebrow">Microsoft 365 corporativo</p>
                <strong className="microsoft-bridge__title">Envio em lote sem SMTP</strong>
              </div>
              <div className={`microsoft-bridge__badge ${microsoftSession ? 'is-connected' : 'is-disconnected'}`}>
                {microsoftSession ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                {microsoftSession ? 'Conectado' : 'Nao conectado'}
              </div>
            </div>

            <p className="microsoft-bridge__text">
              {microsoftSession
                ? `Conta ativa: ${microsoftSession.displayName} <${microsoftSession.accountEmail}>`
                : 'Conecte a conta Outlook corporativa para enviar em lote pelo Microsoft Graph.'}
            </p>

            <div className="microsoft-bridge__meta">
              <span>Tenant: {microsoftConfig?.tenantId || 'nao configurado'}</span>
              <span>Redirect: {getMicrosoftRedirectUri()}</span>
            </div>

            <div className="microsoft-bridge__actions">
              <button className="btn btn-ghost" onClick={() => setShowMicrosoftConfigModal(true)}>
                <PlugZap size={14} />
                Configurar Microsoft
              </button>
              {microsoftSession ? (
                <button className="btn btn-danger" onClick={handleMicrosoftDisconnect}>
                  <LogOut size={14} />
                  Sair da conta
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleMicrosoftConnect} disabled={graphConnecting}>
                  <ShieldCheck size={14} />
                  {graphConnecting ? 'Conectando...' : 'Conectar remetente Microsoft'}
                </button>
              )}
            </div>
          </div>

          <div className="sender-route">
            <div className="sender-route__main">
              <div>
                <label>Conta de envio</label>
                <p>
                  {microsoftSession
                    ? `${microsoftSession.displayName} <${microsoftSession.accountEmail}>`
                    : 'Clique em Conectar remetente Microsoft para escolher a conta corporativa.'}
                </p>
              </div>
              <span className={`sender-route__pill ${microsoftSession ? 'is-ready' : ''}`}>
                {microsoftSession ? 'Microsoft Graph' : 'Aguardando login'}
              </span>
            </div>

            <button
              type="button"
              className="sender-route__toggle"
              onClick={() => setShowSmtpFallback(current => !current)}
            >
              {showSmtpFallback ? 'Ocultar envio direto antigo' : 'Mostrar envio direto antigo'}
            </button>

            {showSmtpFallback && (
              <div className="sender-route__fallback">
                <div className="field">
                  <label>Remetente para envio direto</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="input"
                      style={{ flex: 1 }}
                      value={selectedSender}
                      onChange={e => setSelectedSender(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Selecione…</option>
                      {senders.map(s => (
                        <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;</option>
                      ))}
                    </select>
                    <button className="btn btn-ghost" style={{ padding: '0 12px' }} onClick={() => setShowSenderModal(true)} title="Adicionar conta">
                      <Plus size={15} />
                    </button>
                    {selectedSender !== '' && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0 12px' }}
                        title="Remover esta conta"
                        onClick={async () => {
                          if (!confirm('Remover esta conta de e-mail?')) return
                          await deleteSender(selectedSender as number)
                          setSelectedSender('')
                          loadSenders()
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <p className="field-hint">Este campo so vale para o botao `Enviar direto`.</p>
                </div>
              </div>
            )}
          </div>

          <RecipientField
            recipients={recipients}
            onChange={setRecipients}
            mode={mode}
            onModeChange={setMode}
            onPendingInputChange={setRecipientPending}
          />

          <SubjectField
            value={subject} onChange={setSubject}
            templates={templates}
            onLoadTemplate={t => { setSubject(t.subject); setBody(t.body) }}
            onToggleFavorite={async t => { await updateTemplate(t.id, { is_favorite: !t.is_favorite }); loadTemplates() }}
          />

          <div className="field">
            <label>Mensagem</label>
            <RichEditor content={body} onChange={setBody} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} />
            Salvar como template
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={!microsoftSession || graphSending || openingOutlook || sending} onClick={handleGraphSend}>
              <ShieldCheck size={14} />
              {graphSending ? 'Enviando...' : 'Enviar com Microsoft'}
            </button>
            <button className="btn btn-ghost" disabled={openingOutlook || sending} onClick={handleOpenOutlook}>
              <MailPlus size={14} />
              {openingOutlook ? 'Abrindo…' : 'Abrir no Outlook'}
            </button>
            <button className="btn btn-ghost" disabled={openingOutlook || sending} onClick={handleCopyDraft}>
              <Copy size={14} />
              Copiar rascunho
            </button>
            {showSmtpFallback && (
              <button className="btn btn-send" disabled={sending || openingOutlook} onClick={handleSend}>
                <Send size={14} />
                {sending ? 'Enviando…' : 'Enviar direto'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── History drawer ───────────────────────────── */}
      {showHistory && (
        <div className="glass" style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Enviados</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setIncludeArchived(a => !a)}
              >
                {includeArchived ? 'Ocultar arquivados' : 'Ver arquivados'}
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowHistory(false)}>
                <X size={13} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <SentHistory entries={sent} onArchive={async id => { await archiveSent(id); loadSent() }} onDelete={async id => { if (!confirm('Excluir?')) return; await deleteSent(id); loadSent() }} />
          </div>
        </div>
      )}

      {showSenderModal && <SenderModal onClose={() => setShowSenderModal(false)} onCreated={loadSenders} />}
      {showMicrosoftConfigModal && (
        <MicrosoftConfigModal
          initialConfig={microsoftConfig}
          redirectUri={getMicrosoftRedirectUri()}
          onClose={() => setShowMicrosoftConfigModal(false)}
          onSave={handleSaveMicrosoftConfig}
          onClear={handleClearMicrosoftConfig}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
