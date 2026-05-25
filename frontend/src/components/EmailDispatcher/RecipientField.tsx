import { useState, KeyboardEvent } from 'react'

interface Props {
  recipients: string[]
  onChange: (r: string[]) => void
  mode: 'cc' | 'individual'
  onModeChange: (m: 'cc' | 'individual') => void
  onPendingInputChange?: (pending: boolean) => void
}

export function RecipientField({ recipients, onChange, mode, onModeChange, onPendingInputChange }: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  }

  function addEmail(raw: string) {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) {
      setError('Digite um e-mail válido e confirme com Enter.')
      return
    }
    if (recipients.includes(email)) {
      setInput('')
      setError('')
      onPendingInputChange?.(false)
      return
    }
    onChange([...recipients, email])
    setInput('')
    setError('')
    onPendingInputChange?.(false)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail(input)
    }
    if (e.key === 'Backspace' && !input && recipients.length > 0) {
      onChange(recipients.slice(0, -1))
    }
  }

  function remove(email: string) {
    onChange(recipients.filter(r => r !== email))
  }

  return (
    <div className="field">
      <div className="flex items-center justify-between">
        <label style={{ margin: 0 }}>Destinatários</label>
        <div className="flex gap-1">
          {(['cc', 'individual'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className="text-xs px-2 py-0.5 rounded-full border transition-all"
              style={{
                background: mode === m ? 'rgba(59,130,246,0.2)' : 'transparent',
                borderColor: mode === m ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.12)',
                color: mode === m ? '#93c5fd' : 'rgba(255,255,255,0.4)',
              }}
            >
              {m === 'cc' ? 'Mesmo e-mail (CC)' : 'E-mails individuais'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="input flex flex-wrap gap-1.5 cursor-text"
        style={{ height: 'auto', minHeight: 42 }}
        onClick={() => document.getElementById('recipient-input')?.focus()}
      >
        {recipients.map(r => (
          <span key={r} className="chip">
            {r}
            <button type="button" onClick={() => remove(r)}>×</button>
          </span>
        ))}
        <input
          id="recipient-input"
          value={input}
          onChange={e => {
            setInput(e.target.value)
            onPendingInputChange?.(Boolean(e.target.value.trim()))
            if (error) setError('')
          }}
          onKeyDown={onKey}
          onBlur={() => {
            if (input.trim()) setError('Confirme o destinatário com Enter antes de enviar.')
          }}
          placeholder={recipients.length === 0 ? 'email@empresa.com e Enter para confirmar' : ''}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#e8e8f0', fontSize: 13, flexGrow: 1, minWidth: 160,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {error && <p className="field-error">{error}</p>}
      {input.trim() && !error && (
        <p className="field-hint">Pressione Enter para adicionar este destinatário.</p>
      )}

      {mode === 'individual' && recipients.length > 1 && (
        <p className="text-xs text-blue-400/70">
          {recipients.length} e-mails serão enviados separadamente.
        </p>
      )}
    </div>
  )
}
