const GRAPH_CONFIG_KEY = 'mqf_microsoft_graph_config'
const GRAPH_SESSION_KEY = 'mqf_microsoft_graph_session'
const GRAPH_AUTH_RESULT_KEY = 'mqf_microsoft_auth_result'
const GRAPH_AUTH_PENDING_KEY = 'mqf_microsoft_auth_pending'
const POPUP_RESULT_TYPE = 'mqf-microsoft-auth-result'
const GRAPH_SCOPES = ['openid', 'profile', 'offline_access', 'User.Read', 'Mail.Send']
const DEFAULT_GRAPH_CONFIG: MicrosoftGraphConfig = {
  clientId: '5a29afc6-a5ac-4eaf-95e7-92847113c119',
  tenantId: '14777978-a859-4812-916b-8c146f02c46a',
}

export interface MicrosoftGraphConfig {
  clientId: string
  tenantId: string
}

export interface MicrosoftGraphSession {
  accessToken: string
  expiresAt: number
  accountEmail: string
  displayName: string
}

interface PopupResult {
  type?: string
  code?: string
  state?: string
  error?: string
  errorDescription?: string
}

interface StoredPopupResult extends PopupResult {
  createdAt?: number
}

interface PendingMicrosoftAuth {
  state: string
  codeVerifier: string
  config: MicrosoftGraphConfig
  createdAt: number
}

interface GraphMeResponse {
  displayName?: string
  mail?: string
  userPrincipalName?: string
}

interface GraphSendRequest {
  recipients: string[]
  subject: string
  body: string
  sendMode: 'cc' | 'individual'
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length)
  window.crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes).slice(0, length)
}

function getTokenEndpoint(config: MicrosoftGraphConfig) {
  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`
}

function getAuthorizeEndpoint(config: MicrosoftGraphConfig) {
  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`
}

export function getMicrosoftRedirectUri() {
  const { protocol, hostname, port } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (isLocalhost) {
    return 'http://localhost:8000/auth-popup.html'
  }

  const host = port ? `${hostname}:${port}` : hostname
  return `${protocol}//${host}/auth-popup.html`
}

export function getStoredMicrosoftGraphConfig() {
  const raw = window.localStorage.getItem(GRAPH_CONFIG_KEY)
  if (!raw) return DEFAULT_GRAPH_CONFIG

  try {
    const parsed = JSON.parse(raw) as MicrosoftGraphConfig
    if (!parsed.clientId || !parsed.tenantId) return DEFAULT_GRAPH_CONFIG
    return parsed
  } catch {
    return DEFAULT_GRAPH_CONFIG
  }
}

export function saveMicrosoftGraphConfig(config: MicrosoftGraphConfig) {
  window.localStorage.setItem(GRAPH_CONFIG_KEY, JSON.stringify({
    clientId: config.clientId.trim(),
    tenantId: config.tenantId.trim(),
  }))
}

export function clearMicrosoftGraphConfig() {
  window.localStorage.removeItem(GRAPH_CONFIG_KEY)
}

export function getStoredMicrosoftGraphSession() {
  const raw = window.localStorage.getItem(GRAPH_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as MicrosoftGraphSession
    if (!parsed.accessToken || !parsed.accountEmail || !parsed.expiresAt) return null
    if (parsed.expiresAt <= Date.now() + 60_000) {
      clearMicrosoftGraphSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveMicrosoftGraphSession(session: MicrosoftGraphSession) {
  window.localStorage.setItem(GRAPH_SESSION_KEY, JSON.stringify(session))
}

export function clearMicrosoftGraphSession() {
  window.localStorage.removeItem(GRAPH_SESSION_KEY)
}

function savePendingMicrosoftAuth(pending: PendingMicrosoftAuth) {
  window.localStorage.setItem(GRAPH_AUTH_PENDING_KEY, JSON.stringify(pending))
}

function clearPendingMicrosoftAuth() {
  window.localStorage.removeItem(GRAPH_AUTH_PENDING_KEY)
}

function getPendingMicrosoftAuth() {
  const raw = window.localStorage.getItem(GRAPH_AUTH_PENDING_KEY)
  if (!raw) return null

  try {
    const pending = JSON.parse(raw) as PendingMicrosoftAuth
    if (!pending.state || !pending.codeVerifier || !pending.config?.clientId || !pending.config?.tenantId) {
      clearPendingMicrosoftAuth()
      return null
    }

    if (Date.now() - pending.createdAt > 180_000) {
      clearPendingMicrosoftAuth()
      return null
    }

    return pending
  } catch {
    clearPendingMicrosoftAuth()
    return null
  }
}

function consumeStoredPopupResult(state: string) {
  const raw = window.localStorage.getItem(GRAPH_AUTH_RESULT_KEY)
  if (!raw) return null

  try {
    const result = JSON.parse(raw) as StoredPopupResult
    if (result.type !== POPUP_RESULT_TYPE || result.state !== state) return null
    if (result.createdAt && Date.now() - result.createdAt > 180_000) {
      window.localStorage.removeItem(GRAPH_AUTH_RESULT_KEY)
      return null
    }

    window.localStorage.removeItem(GRAPH_AUTH_RESULT_KEY)
    return result
  } catch {
    window.localStorage.removeItem(GRAPH_AUTH_RESULT_KEY)
    return null
  }
}

async function fetchGraphMe(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Consegui autenticar, mas nao consegui ler os dados da conta Microsoft.')
  }

  return response.json() as Promise<GraphMeResponse>
}

async function exchangeCodeForToken(config: MicrosoftGraphConfig, code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getMicrosoftRedirectUri(),
    code_verifier: codeVerifier,
    scope: GRAPH_SCOPES.join(' '),
  })

  const response = await fetch(getTokenEndpoint(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) {
    const description = typeof payload.error_description === 'string' ? payload.error_description : ''
    throw new Error(description || 'A Microsoft recusou a autenticacao desta aplicacao.')
  }

  return payload as { access_token: string; expires_in: number }
}

async function buildSessionFromCode(config: MicrosoftGraphConfig, code: string, codeVerifier: string) {
  const token = await exchangeCodeForToken(config, code, codeVerifier)
  const me = await fetchGraphMe(token.access_token)
  const accountEmail = me.mail || me.userPrincipalName

  if (!accountEmail) {
    throw new Error('Nao consegui identificar o e-mail desta conta Microsoft.')
  }

  const session = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (Math.max(60, Number(token.expires_in || 3600)) * 1000),
    accountEmail,
    displayName: me.displayName || accountEmail,
  }

  saveMicrosoftGraphSession(session)
  return session
}

export async function completePendingMicrosoftLogin() {
  const pending = getPendingMicrosoftAuth()
  if (!pending) return null

  const result = consumeStoredPopupResult(pending.state)
  if (!result) return null

  try {
    if (result.error) {
      throw new Error(result.errorDescription || result.error)
    }

    if (!result.code) {
      throw new Error('A Microsoft nao devolveu o codigo de autenticacao.')
    }

    return await buildSessionFromCode(pending.config, result.code, pending.codeVerifier)
  } finally {
    clearPendingMicrosoftAuth()
  }
}

function waitForMicrosoftPopup(state: string, popup: Window) {
  return new Promise<string>((resolve, reject) => {
    let finished = false
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('A autenticacao Microsoft demorou demais para responder.'))
    }, 180_000)

    const closeCheck = window.setInterval(() => {
      if (!popup.closed) return
      const storedResult = consumeStoredPopupResult(state)
      if (storedResult) {
        finish(storedResult)
        return
      }
      cleanup()
      reject(new Error('A janela de login Microsoft foi fechada antes da conclusao.'))
    }, 600)

    const storagePoll = window.setInterval(() => {
      const storedResult = consumeStoredPopupResult(state)
      if (storedResult) finish(storedResult)
    }, 400)

    function cleanup() {
      window.clearTimeout(timeout)
      window.clearInterval(closeCheck)
      window.clearInterval(storagePoll)
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
      try {
        popup.close()
      } catch {
        // noop
      }
    }

    function finish(result: PopupResult) {
      if (finished) return
      finished = true

      cleanup()

      if (result.error) {
        reject(new Error(result.errorDescription || result.error))
        return
      }

      if (!result.code) {
        reject(new Error('A Microsoft nao devolveu o codigo de autenticacao.'))
        return
      }

      resolve(result.code)
    }

    function handleMessage(event: MessageEvent<PopupResult>) {
      if (event.origin !== new URL(getMicrosoftRedirectUri()).origin) return
      if (!event.data || event.data.type !== POPUP_RESULT_TYPE) return
      if (event.data.state !== state) return
      finish(event.data)
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== GRAPH_AUTH_RESULT_KEY) return
      const storedResult = consumeStoredPopupResult(state)
      if (storedResult) finish(storedResult)
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
  })
}

export async function loginWithMicrosoft(config: MicrosoftGraphConfig) {
  const state = randomString(32)
  const codeVerifier = randomString(96)
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier))
  savePendingMicrosoftAuth({
    state,
    codeVerifier,
    config: {
      clientId: config.clientId.trim(),
      tenantId: config.tenantId.trim(),
    },
    createdAt: Date.now(),
  })

  const params = new URLSearchParams({
    client_id: config.clientId.trim(),
    response_type: 'code',
    redirect_uri: getMicrosoftRedirectUri(),
    response_mode: 'query',
    scope: GRAPH_SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
    state,
  })

  const popup = window.open(
    `${getAuthorizeEndpoint(config)}?${params.toString()}`,
    'mqf-microsoft-login',
    'width=560,height=720'
  )

  if (!popup) {
    throw new Error('O navegador bloqueou a janela de login Microsoft.')
  }

  try {
    const code = await waitForMicrosoftPopup(state, popup)
    return await buildSessionFromCode(config, code, codeVerifier)
  } finally {
    clearPendingMicrosoftAuth()
  }
}

export async function sendMailWithMicrosoftGraph(session: MicrosoftGraphSession, request: GraphSendRequest) {
  if (session.expiresAt <= Date.now() + 60_000) {
    clearMicrosoftGraphSession()
    throw new Error('A sessao Microsoft expirou. Entre novamente para continuar.')
  }

  const groups = request.sendMode === 'individual'
    ? request.recipients.map(recipient => [recipient])
    : [request.recipients]

  for (const group of groups) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: request.subject,
          body: {
            contentType: 'HTML',
            content: request.body,
          },
          toRecipients: group.map(address => ({
            emailAddress: { address },
          })),
        },
        saveToSentItems: true,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const message = payload?.error?.message
      throw new Error(typeof message === 'string' ? message : 'A Microsoft recusou o envio pelo Graph.')
    }
  }

  return { sentCount: groups.length }
}
