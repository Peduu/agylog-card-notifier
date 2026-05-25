import { useState } from 'react'
import { Modal } from '../ui/Modal'
import type { MicrosoftGraphConfig } from '../../lib/microsoftGraph'

interface Props {
  initialConfig: MicrosoftGraphConfig | null
  redirectUri: string
  onClose: () => void
  onSave: (config: MicrosoftGraphConfig) => void
  onClear: () => void
}

export function MicrosoftConfigModal({ initialConfig, redirectUri, onClose, onSave, onClear }: Props) {
  const [tenantId, setTenantId] = useState(initialConfig?.tenantId ?? '')
  const [clientId, setClientId] = useState(initialConfig?.clientId ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanTenant = tenantId.trim()
    const cleanClient = clientId.trim()
    if (!cleanTenant || !cleanClient) return
    onSave({ tenantId: cleanTenant, clientId: cleanClient })
    onClose()
  }

  return (
    <Modal title="Configurar Microsoft 365" onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label>Tenant ID</label>
          <input
            className="input"
            placeholder="GUID do tenant corporativo"
            value={tenantId}
            onChange={event => setTenantId(event.target.value)}
          />
        </div>

        <div className="field">
          <label>Client ID</label>
          <input
            className="input"
            placeholder="GUID da aplicacao registrada"
            value={clientId}
            onChange={event => setClientId(event.target.value)}
          />
        </div>

        <div className="field">
          <label>Redirect URI</label>
          <input className="input" value={redirectUri} readOnly />
          <p className="field-hint">
            Cadastre este endereco na aplicacao Microsoft como SPA. Permissoes esperadas: `User.Read` e `Mail.Send`.
          </p>
        </div>

        <div className="field">
          <label>Resumo rapido</label>
          <div className="glass-sm" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p className="field-hint">1. Registrar a aplicacao no Entra ID.</p>
            <p className="field-hint">2. Adicionar este `redirect URI` como Single-page application.</p>
            <p className="field-hint">3. Liberar consentimento para `User.Read` e `Mail.Send`.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
          <button type="button" className="btn btn-danger" onClick={onClear}>
            Limpar dados
          </button>
          <button type="submit" className="btn btn-primary" disabled={!tenantId.trim() || !clientId.trim()}>
            Salvar configuracao
          </button>
        </div>
      </form>
    </Modal>
  )
}
