import { useState } from 'react'
import { ChevronDown, XCircle, Loader } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { createSender, testSmtp } from '../../api/client'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const PROVIDERS = {
  outlook:      { label: 'Outlook / Hotmail',       host: 'smtp-mail.outlook.com', port: 587, tls: true },
  microsoft365: { label: 'Microsoft 365 (empresa)', host: 'smtp.office365.com',    port: 587, tls: true },
  gmail:        { label: 'Gmail',                   host: 'smtp.gmail.com',        port: 587, tls: true },
  yahoo:        { label: 'Yahoo Mail',              host: 'smtp.mail.yahoo.com',   port: 587, tls: true },
  uol:          { label: 'UOL',                     host: 'smtp.uol.com.br',       port: 587, tls: true },
  terra:        { label: 'Terra',                   host: 'smtp.terra.com.br',     port: 587, tls: true },
  custom:       { label: 'Outro (manual)',          host: '',                      port: 587, tls: true },
} as const

const DEFAULT_PROVIDER = 'outlook'

type ProviderKey = keyof typeof PROVIDERS

type TestState = 'idle' | 'testing' | 'error'

export function SenderModal({ onClose, onCreated }: Props) {
  const [provider, setProvider] = useState<ProviderKey>(DEFAULT_PROVIDER)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [customHost, setCustomHost] = useState('')
  const [customPort, setCustomPort] = useState(587)
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)

  const prov = PROVIDERS[provider]
  const smtpHost = (provider === 'custom' ? customHost : prov.host).trim()
  const smtpPort = provider === 'custom' ? customPort : prov.port
  const hasDraft = Boolean(name || email || pass || customHost || provider !== DEFAULT_PROVIDER)
  const isBusy = testState === 'testing' || saving

  function isValidEmailAddress(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
  }

  function requestClose() {
    if (isBusy) return
    if (hasDraft && !confirm('Fechar sem salvar esta conta de e-mail?')) return
    onClose()
  }

  function resetTest() {
    setTestState('idle')
    setTestError('')
  }

  function getPasswordPlaceholder() {
    if (provider === 'gmail') return 'Senha de app do Google'
    if (provider === 'microsoft365') return 'Senha da conta corporativa'
    if (provider === 'outlook') return 'Senha da conta ou senha de app'
    return 'Senha do e-mail'
  }

  function getEmailPlaceholder() {
    if (provider === 'gmail') return 'seuemail@gmail.com'
    if (provider === 'outlook') return 'seuemail@outlook.com'
    if (provider === 'microsoft365') return 'voce@empresa.com.br'
    return 'seuemail@dominio.com'
  }

  function detectProviderFromEmail(value: string): ProviderKey | null {
    const domain = value.split('@')[1]?.trim().toLowerCase()
    if (!domain) return null
    if (domain === 'gmail.com' || domain === 'googlemail.com') return 'gmail'
    if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'outlook'
    if (domain === 'yahoo.com' || domain === 'yahoo.com.br') return 'yahoo'
    if (domain === 'uol.com.br' || domain === 'bol.com.br') return 'uol'
    if (domain === 'terra.com.br') return 'terra'
    return null
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    resetTest()
    const detectedProvider = detectProviderFromEmail(value)
    if (detectedProvider && provider !== 'custom') {
      setProvider(detectedProvider)
    }
  }

  function normalizePassword(value: string) {
    return provider === 'gmail' ? value.replace(/\s+/g, '') : value.trim()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const cleanPassword = normalizePassword(pass)

    if (!cleanName) {
      setName(cleanEmail)
    }
    if (!isValidEmailAddress(cleanEmail)) {
      setTestState('error')
      setTestError('Informe um e-mail válido antes de verificar.')
      return
    }
    if (!cleanPassword) {
      setTestState('error')
      setTestError('Informe a senha desta conta de e-mail.')
      return
    }
    if (provider === 'custom' && !customHost.trim()) {
      setTestState('error')
      setTestError('Informe o servidor SMTP.')
      return
    }
    if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
      setTestState('error')
      setTestError('Informe uma porta SMTP válida.')
      return
    }
    setTestState('testing')
    setTestError('')
    setSaving(false)
    try {
      await testSmtp({ smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: cleanEmail, smtp_pass: cleanPassword, use_tls: prov.tls })
      setSaving(true)
      await createSender({
        name: cleanName || cleanEmail,
        email: cleanEmail,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: cleanEmail,
        smtp_pass: cleanPassword,
        use_tls: prov.tls,
      })
      onCreated()
      onClose()
    } catch (err) {
      setTestState('error')
      setTestError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal title="Adicionar conta de e-mail" onClose={requestClose}>
      <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div className="field">
          <label>Provedor de e-mail</label>
          <div style={{ position: 'relative' }}>
            <select
              className="input"
              style={{ paddingRight: 32, appearance: 'none' }}
              value={provider}
              onChange={e => { setProvider(e.target.value as ProviderKey); resetTest() }}
            >
              {Object.entries(PROVIDERS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div className="field">
          <label>Nome de exibição <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>(opcional)</span></label>
          <input className="input" placeholder="Ex: MQF Notificações" value={name}
            onChange={e => { setName(e.target.value); resetTest() }} />
        </div>

        <div className="field">
          <label>Endereço de e-mail</label>
          <input type="email" className="input" placeholder={getEmailPlaceholder()}
            value={email} onChange={e => handleEmailChange(e.target.value)} />
          {email && !isValidEmailAddress(email) && (
            <p className="field-error">Use um e-mail válido com @ e domínio.</p>
          )}
        </div>

        <div className="field">
          <label>Senha</label>
          <input type="password" className="input"
            placeholder={getPasswordPlaceholder()}
            value={pass} onChange={e => { setPass(e.target.value); resetTest() }} />
          {provider === 'gmail' && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Gmail exige "senha de app" — ative em Conta Google → Segurança → Senhas de app.
            </p>
          )}
        </div>

        {provider === 'custom' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Servidor</label>
              <input className="input" placeholder="smtp.empresa.com" value={customHost}
                onChange={e => { setCustomHost(e.target.value); resetTest() }} />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>Porta</label>
              <input type="number" className="input" value={customPort}
                onChange={e => { setCustomPort(Number(e.target.value)); resetTest() }} />
            </div>
          </div>
        )}

        <p className="field-hint">SMTP usado: {smtpHost || 'informe o servidor'}:{smtpPort}</p>

        {testState === 'error' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <XCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#f87171' }}>{testError}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}
          disabled={isBusy}>
          {isBusy
            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {saving ? 'Salvando...' : 'Verificando...'}</>
            : 'Verificar e salvar'}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </Modal>
  )
}
