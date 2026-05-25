import { useCallback, useState } from 'react'
import { AlertTriangle, FileText, Mail } from 'lucide-react'
import { LetterGenerator } from './components/LetterGenerator'
import { EmailDispatcher } from './components/EmailDispatcher'
import { LostDeliveryNotification } from './components/LostDeliveryNotification'
import type { EmailDraft } from './types'

type Tab = 'lost' | 'letter' | 'email'

export default function App() {
  const [tab, setTab] = useState<Tab>('lost')
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null)

  function useEmailDraft(draft: { subject: string; body: string }) {
    setEmailDraft({ ...draft, id: Date.now() })
    setTab('email')
  }

  const consumeEmailDraft = useCallback(() => {
    setEmailDraft(null)
  }, [])

  return (
    <>
      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb" />
        <div className="aurora-orb" />
        <div className="aurora-orb" />
      </div>

      {/* App shell */}
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,15,0.6)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
            }}>
              <Mail size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#e8e8f0', lineHeight: 1.2 }}>
                Card Notifier
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>MQF Logística</p>
            </div>
          </div>

          <div className="tab-bar">
            <button
              className={`tab-btn ${tab === 'lost' ? 'active' : ''}`}
              onClick={() => setTab('lost')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> Comunicados de Ocorrência
              </span>
            </button>
            <button
              className={`tab-btn ${tab === 'letter' ? 'active' : ''}`}
              onClick={() => setTab('letter')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} /> Gerador de Carta
              </span>
            </button>
            <button
              className={`tab-btn ${tab === 'email' ? 'active' : ''}`}
              onClick={() => setTab('email')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} /> Disparador de E-mail
              </span>
            </button>
          </div>

          <div style={{ width: 180 }} />
        </header>

        {/* Main content */}
        <main style={{ flex: 1, padding: '20px 28px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {tab === 'lost' && <LostDeliveryNotification onUseEmailDraft={useEmailDraft} />}
          {tab === 'letter' && <LetterGenerator />}
          {tab === 'email' && <EmailDispatcher initialDraft={emailDraft} onDraftConsumed={consumeEmailDraft} />}
        </main>
      </div>
    </>
  )
}
