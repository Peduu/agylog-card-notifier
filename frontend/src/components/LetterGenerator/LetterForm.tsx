import { Plus, Trash2 } from 'lucide-react'
import type { LetterFormData } from '../../types'

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

interface Props {
  data: LetterFormData
  onChange: (d: LetterFormData) => void
}

export function LetterForm({ data, onChange }: Props) {
  function set<K extends keyof LetterFormData>(key: K, value: LetterFormData[K]) {
    onChange({ ...data, [key]: value })
  }

  function addCode() {
    set('shipmentCodes', [...data.shipmentCodes, ''])
  }

  function updateCode(i: number, val: string) {
    const codes = [...data.shipmentCodes]
    codes[i] = val
    set('shipmentCodes', codes)
  }

  function removeCode(i: number) {
    set('shipmentCodes', data.shipmentCodes.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="field">
        <label>Banco / Empresa destinatária</label>
        <input className="input" placeholder="Ex: Banco Bradesco S.A." value={data.bankName}
          onChange={e => set('bankName', e.target.value)} />
      </div>

      <div className="field">
        <label>Nome do responsável (A/C)</label>
        <input className="input" placeholder="Ex: Central de Cartões" value={data.recipientName}
          onChange={e => set('recipientName', e.target.value)} />
      </div>

      <div className="field">
        <div className="flex items-center justify-between mb-1">
          <label style={{ margin: 0 }}>Códigos de remessa</label>
          <button className="btn btn-ghost text-xs py-1 px-2" onClick={addCode}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {data.shipmentCodes.map((code, i) => (
            <div key={i} className="flex gap-2">
              <input className="input" placeholder={`Código ${i + 1}`} value={code}
                onChange={e => updateCode(i, e.target.value)} />
              {data.shipmentCodes.length > 1 && (
                <button className="btn btn-danger px-2.5" onClick={() => removeCode(i)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Data do incidente</label>
        <input type="date" className="input" value={data.incidentDate}
          onChange={e => set('incidentDate', e.target.value)} />
      </div>

      <div className="field">
        <label>Nome do transportador</label>
        <input className="input" placeholder="Ex: João Silva" value={data.courierName}
          onChange={e => set('courierName', e.target.value)} />
      </div>

      <div className="field">
        <label>Número do BO</label>
        <input className="input" placeholder="Ex: 2024/123456" value={data.boNumber}
          onChange={e => set('boNumber', e.target.value)} />
      </div>

      <div className="flex gap-3">
        <div className="field flex-1">
          <label>Cidade</label>
          <input className="input" placeholder="Ex: São Paulo" value={data.city}
            onChange={e => set('city', e.target.value)} />
        </div>
        <div className="field" style={{ width: 100 }}>
          <label>Estado</label>
          <select className="input" value={data.state} onChange={e => set('state', e.target.value)}>
            <option value="">UF</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
