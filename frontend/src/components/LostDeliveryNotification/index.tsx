import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, MailPlus, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import type { LostDeliveryNotificationData, OccurrenceType } from '../../types'
import {
  buildLostDeliveryEmailHtml,
  buildLostDeliverySubject,
  getOccurrenceCopy,
  OCCURRENCE_OPTIONS,
} from './notificationTemplate'
import { CityCombobox } from './CityCombobox'

const DEFAULT: LostDeliveryNotificationData = {
  incidentType: 'extravio',
  companyName: '',
  attentionTo: '',
  shipmentCodes: [''],
  incidentDate: '',
  lastKnownLocation: '',
  boNumber: '',
  city: '',
  state: '',
  cityIbgeCode: null,
  actionRequired: getOccurrenceCopy('extravio').defaultAction,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
}

const DEFAULT_ACTIONS = new Set(OCCURRENCE_OPTIONS.map(option => option.defaultAction))
const TODAY = new Date().toISOString().slice(0, 10)

interface Props {
  onUseEmailDraft: (draft: { subject: string; body: string }) => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-section-label">
      <span>{children}</span>
    </div>
  )
}

export function LostDeliveryNotification({ onUseEmailDraft }: Props) {
  const [form, setForm] = useState<LostDeliveryNotificationData>(DEFAULT)
  const [copied, setCopied] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const occurrence = getOccurrenceCopy(form.incidentType)
  const subject = useMemo(() => buildLostDeliverySubject(form), [form])
  const body = useMemo(() => buildLostDeliveryEmailHtml(form), [form])
  const formErrors = useMemo(() => validateForm(form), [form])
  const isFormReady = formErrors.length === 0

  function set<K extends keyof LostDeliveryNotificationData>(key: K, value: LostDeliveryNotificationData[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  function selectIncidentType(type: OccurrenceType) {
    const nextCopy = getOccurrenceCopy(type)
    setForm(current => ({
      ...current,
      incidentType: type,
      actionRequired: !current.actionRequired.trim() || DEFAULT_ACTIONS.has(current.actionRequired)
        ? nextCopy.defaultAction
        : current.actionRequired,
    }))
  }

  function addCode() {
    set('shipmentCodes', [...form.shipmentCodes, ''])
  }

  function updateCode(index: number, value: string) {
    const next = [...form.shipmentCodes]
    next[index] = value.toUpperCase()
    set('shipmentCodes', next)
  }

  function removeCode(index: number) {
    const next = form.shipmentCodes.filter((_, i) => i !== index)
    set('shipmentCodes', next.length > 0 ? next : [''])
  }

  async function copyPreviewText() {
    setAttempted(true)
    if (!isFormReady) return
    const text = previewRef.current?.innerText
    if (!text) return
    await navigator.clipboard.writeText(`${subject}\n\n${text}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function useInEmailDispatcher() {
    setAttempted(true)
    if (!isFormReady) return
    onUseEmailDraft({ subject, body })
  }

  return (
    <div className="lost-delivery-layout">

      {/* ── Left panel: form ─────────────────────────── */}
      <div className="glass p-5 overflow-y-auto lost-delivery-form">

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className={`lost-delivery-icon occurrence-tone-${occurrence.tone}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/70">Ocorrência formal</p>
            <h2 className="text-lg font-semibold text-white mt-1">Comunicado operacional</h2>
            <p className="text-xs text-white/35 mt-1 leading-relaxed">
              Escolha o tipo, preencha os dados e gere o e-mail formal.
            </p>
          </div>
        </div>

        {/* Tipo de ocorrência */}
        <SectionLabel>Tipo de ocorrência</SectionLabel>
        <div className="occurrence-type-grid mb-3">
          {OCCURRENCE_OPTIONS.map(option => (
            <button
              key={option.type}
              type="button"
              className={`occurrence-type-card occurrence-tone-${option.tone} ${form.incidentType === option.type ? 'active' : ''}`}
              onClick={() => selectIncidentType(option.type)}
            >
              <span>{option.shortLabel}</span>
              <small>{option.risk}</small>
            </button>
          ))}
        </div>

        <div className={`occurrence-risk occurrence-tone-${occurrence.tone} mb-5`}>
          <span>{occurrence.badge}</span>
          <strong>Risco {occurrence.risk}</strong>
          <p>{occurrence.classification}</p>
        </div>

        {/* Destinatário */}
        <SectionLabel>Destinatário</SectionLabel>
        <div className="flex flex-col gap-3 mb-4">
          <div className="field">
            <label>Cliente / empresa</label>
            <input className="input" placeholder="Ex: Banco Bradesco S.A." value={form.companyName}
              onChange={e => set('companyName', e.target.value)} />
          </div>
          <div className="field">
            <label>A/C responsável</label>
            <input className="input" placeholder="Ex: Central de Cartões" value={form.attentionTo}
              onChange={e => set('attentionTo', e.target.value)} />
          </div>
        </div>

        {/* Remessas */}
        <SectionLabel>Remessas</SectionLabel>
        <div className="field mb-4">
          <div className="flex items-center justify-between mb-1">
            <label style={{ margin: 0 }}>Códigos de remessa</label>
            <button type="button" className="btn btn-ghost text-xs py-1 px-2" onClick={addCode}>
              <Plus size={13} /> Adicionar
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {form.shipmentCodes.map((code, index) => (
              <div key={index} className="flex gap-2">
                <input className="input" placeholder={`Código ${index + 1}`} value={code}
                  onChange={e => updateCode(index, e.target.value)} />
                <button type="button" className="btn btn-danger px-2.5" onClick={() => removeCode(index)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Localização */}
        <SectionLabel>Localização do incidente</SectionLabel>
        <div className="flex flex-col gap-3 mb-4">
          <div className="field">
            <label>Data do incidente</label>
            <input type="date" className="input" min="2000-01-01" max={TODAY} value={form.incidentDate}
              onChange={e => set('incidentDate', e.target.value)} />
            {attempted && !isValidIsoDate(form.incidentDate) && (
              <p className="field-error">Informe uma data real do incidente.</p>
            )}
          </div>

          <div className="field">
            <label>Última localização conhecida</label>
            <input className="input" placeholder="Ex: Base operacional / rota / unidade" value={form.lastKnownLocation}
              onChange={e => set('lastKnownLocation', e.target.value)} />
          </div>

          <CityCombobox
            value={{ city: form.city, state: form.state, cityIbgeCode: form.cityIbgeCode }}
            onChange={value => setForm(current => ({ ...current, ...value }))}
            error={attempted && !form.cityIbgeCode ? 'Selecione uma cidade da lista para travar a UF correta.' : undefined}
          />

          <div className="field">
            <label>Boletim de Ocorrência</label>
            <input className="input" placeholder="Ex: 2026-000123" value={form.boNumber}
              onChange={e => set('boNumber', e.target.value)} />
          </div>
        </div>

        {/* Providência */}
        <SectionLabel>Providência solicitada</SectionLabel>
        <div className="field mb-4">
          <textarea className="input" rows={4} value={form.actionRequired}
            onChange={e => set('actionRequired', e.target.value)} />
        </div>

        {/* Contato */}
        <SectionLabel>Contato para retorno</SectionLabel>
        <div className="flex flex-col gap-3 mb-5">
          <div className="field">
            <label>Nome</label>
            <input className="input" placeholder="Nome do responsável" value={form.contactName}
              onChange={e => set('contactName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label>E-mail</label>
              <input className="input" placeholder="contato@empresa.com" value={form.contactEmail}
                onChange={e => set('contactEmail', e.target.value)} />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input className="input" placeholder="(11) 99999-9999" value={form.contactPhone}
                onChange={e => set('contactPhone', e.target.value)} />
            </div>
          </div>
        </div>

        <button type="button" className="btn btn-ghost text-xs w-full" onClick={() => { setForm(DEFAULT); setAttempted(false) }}>
          <RefreshCcw size={13} /> Limpar formulário
        </button>
      </div>

      {/* ── Right panel: preview ─────────────────────── */}
      <div className="glass flex-1 flex flex-col overflow-hidden">
        <div className="preview-header">
          <div className="preview-header__meta">
            <p className="preview-header__eyebrow">Prévia do e-mail</p>
            <p className="preview-header__subject">{subject || 'Preencha os dados para gerar o assunto'}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" className="btn btn-ghost text-xs" onClick={copyPreviewText}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button type="button" className="btn btn-primary text-xs" onClick={useInEmailDispatcher}>
              <MailPlus size={13} /> Usar no e-mail
            </button>
          </div>
        </div>

        {attempted && !isFormReady && (
          <div className="form-blocker">
            {formErrors.map(error => <p key={error}>{error}</p>)}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          <div ref={previewRef} className="notification-preview" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      </div>

    </div>
  )
}

function isValidIsoDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= 2000 &&
    iso <= TODAY
  )
}

function validateForm(form: LostDeliveryNotificationData) {
  const errors: string[] = []
  if (!isValidIsoDate(form.incidentDate)) {
    errors.push('A data do incidente é obrigatória e precisa ser uma data real.')
  }
  if (!form.cityIbgeCode || !form.city || !form.state) {
    errors.push('Selecione a cidade pela busca para confirmar a UF.')
  }
  return errors
}
