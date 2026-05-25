import type { LostDeliveryNotificationData, OccurrenceType } from '../../types'

export interface OccurrenceCopy {
  type: OccurrenceType
  label: string
  shortLabel: string
  badge: string
  risk: 'Crítico' | 'Alto' | 'Médio'
  tone: 'red' | 'amber' | 'blue'
  title: string
  classification: string
  summary: string
  defaultAction: string
}

export const OCCURRENCE_OPTIONS: OccurrenceCopy[] = [
  {
    type: 'extravio',
    label: 'Extravio',
    shortLabel: 'Extravio',
    badge: 'Perda confirmada ou provável',
    risk: 'Alto',
    tone: 'amber',
    title: 'Comunicado de extravio de entrega',
    classification: 'extravio operacional / entrega perdida',
    summary: 'não teve/tiveram entrega concluída ao destinatário final e foi/foram classificada(s) como possível extravio operacional.',
    defaultAction: 'Solicitamos bloqueio/cancelamento preventivo dos itens vinculados e orientação sobre os próximos procedimentos.',
  },
  {
    type: 'roubo_furto',
    label: 'Roubo / furto / assalto',
    shortLabel: 'Roubo/Furto',
    badge: 'Incidente de segurança',
    risk: 'Crítico',
    tone: 'red',
    title: 'Comunicado de ocorrência de roubo/furto',
    classification: 'roubo, furto ou subtração de remessa em rota',
    summary: 'foi/foram impactada(s) por ocorrência de segurança envolvendo roubo, furto ou subtração durante a operação logística.',
    defaultAction: 'Solicitamos bloqueio/cancelamento imediato dos itens vinculados, registro interno de risco e orientação sobre reposição ou procedimento de contingência.',
  },
  {
    type: 'entrega_indevida',
    label: 'Entrega indevida',
    shortLabel: 'Entrega indevida',
    badge: 'Destino ou recebedor divergente',
    risk: 'Crítico',
    tone: 'red',
    title: 'Comunicado de entrega indevida',
    classification: 'entrega realizada a terceiro, endereço ou recebedor divergente',
    summary: 'apresentou/apresentaram indício de entrega indevida, com divergência entre o fluxo previsto e a confirmação operacional disponível.',
    defaultAction: 'Solicitamos análise de bloqueio preventivo, validação junto ao destinatário final e orientação sobre tratativa com o recebedor divergente.',
  },
  {
    type: 'violacao_avaria',
    label: 'Violação / avaria',
    shortLabel: 'Violação/Avaria',
    badge: 'Lacre, envelope ou volume comprometido',
    risk: 'Alto',
    tone: 'amber',
    title: 'Comunicado de violação ou avaria',
    classification: 'violação de embalagem, lacre rompido ou avaria física',
    summary: 'apresentou/apresentaram indício de violação, lacre rompido, envelope aberto ou avaria física identificada na operação.',
    defaultAction: 'Solicitamos avaliação de risco, orientação sobre bloqueio preventivo dos itens e validação quanto à necessidade de substituição.',
  },
  {
    type: 'divergencia_conteudo',
    label: 'Divergência de conteúdo',
    shortLabel: 'Conteúdo divergente',
    badge: 'Item faltante ou incorreto',
    risk: 'Médio',
    tone: 'blue',
    title: 'Comunicado de divergência de conteúdo',
    classification: 'conteúdo faltante, divergente ou quantidade incompatível',
    summary: 'apresentou/apresentaram divergência entre o conteúdo esperado e o conteúdo efetivamente conferido na operação.',
    defaultAction: 'Solicitamos validação do conteúdo esperado, orientação sobre recomposição da remessa e definição do procedimento de regularização.',
  },
  {
    type: 'contestacao_entrega',
    label: 'Contestação de entrega',
    shortLabel: 'Contestação',
    badge: 'Consta entregue, cliente nega',
    risk: 'Alto',
    tone: 'amber',
    title: 'Comunicado de contestação de entrega',
    classification: 'entrega contestada pelo destinatário ou contratante',
    summary: 'consta/constam como entregue(s) no fluxo operacional, porém houve contestação de recebimento pelo destinatário ou contratante.',
    defaultAction: 'Solicitamos análise conjunta do comprovante de entrega, validação com o destinatário e orientação sobre bloqueio preventivo enquanto a ocorrência é apurada.',
  },
  {
    type: 'atraso_critico',
    label: 'Atraso crítico',
    shortLabel: 'Atraso crítico',
    badge: 'SLA ou risco operacional',
    risk: 'Médio',
    tone: 'blue',
    title: 'Comunicado de atraso crítico',
    classification: 'atraso com impacto em SLA, segurança ou janela operacional',
    summary: 'encontra/encontram-se em atraso crítico, com impacto potencial em SLA, janela operacional ou procedimento sensível do cliente.',
    defaultAction: 'Solicitamos ciência formal do atraso, priorização da tratativa e orientação sobre eventual contingência ou comunicação ao destinatário final.',
  },
]

export function getOccurrenceCopy(type: OccurrenceType): OccurrenceCopy {
  return OCCURRENCE_OPTIONS.find(option => option.type === type) ?? OCCURRENCE_OPTIONS[0]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safe(value: string, fallback: string): string {
  const trimmed = value.trim()
  return escapeHtml(trimmed || fallback)
}

function isValidIsoDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= 2000
  )
}

function formatDate(iso: string, fallback = 'data não informada'): string {
  if (!isValidIsoDate(iso)) return fallback
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.04em;width:190px;">${label}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
    </tr>
  `
}

function toneColor(tone: OccurrenceCopy['tone']): string {
  if (tone === 'red') return '#dc2626'
  if (tone === 'blue') return '#2563eb'
  return '#f59e0b'
}

function toneBg(tone: OccurrenceCopy['tone']): string {
  if (tone === 'red') return '#fef2f2'
  if (tone === 'blue') return '#eff6ff'
  return '#fffbeb'
}

function toneText(tone: OccurrenceCopy['tone']): string {
  if (tone === 'red') return '#7f1d1d'
  if (tone === 'blue') return '#1e3a8a'
  return '#78350f'
}

export function buildLostDeliverySubject(data: LostDeliveryNotificationData): string {
  const copy = getOccurrenceCopy(data.incidentType)
  const firstCode = data.shipmentCodes.find(code => code.trim())?.trim()
  return firstCode
    ? `${copy.title} - ${firstCode}`
    : copy.title
}

export function buildLostDeliveryEmailHtml(data: LostDeliveryNotificationData): string {
  const copy = getOccurrenceCopy(data.incidentType)
  const accent = toneColor(copy.tone)
  const codes = data.shipmentCodes
    .map(code => code.trim())
    .filter(Boolean)
    .map(code => `<li style="margin:4px 0;"><strong>${escapeHtml(code)}</strong></li>`)
    .join('')

  const locationParts = [data.city, data.state].filter(Boolean)
  const location = locationParts.length > 0 ? locationParts.join(' - ') : 'localidade a confirmar'
  const contact = [
    data.contactName.trim() && escapeHtml(data.contactName.trim()),
    data.contactEmail.trim() && `<a href="mailto:${escapeHtml(data.contactEmail.trim())}" style="color:#2563eb;">${escapeHtml(data.contactEmail.trim())}</a>`,
    data.contactPhone.trim() && escapeHtml(data.contactPhone.trim()),
  ].filter(Boolean).join(' | ')

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#172033;line-height:1.55;background:#f8fafc;padding:24px;">
      <div style="max-width:740px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(15,23,42,.08);">
        <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:24px 28px;color:#ffffff;position:relative;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#bfdbfe;">Comunicado operacional formal</p>
          <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(copy.title)}</h1>
          <p style="margin:10px 0 0;color:#dbeafe;font-size:14px;">${escapeHtml(copy.badge)} • Risco ${escapeHtml(copy.risk)}</p>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 16px;">Prezados(as),</p>

          <p style="margin:0 0 16px;">
            Informamos, para ciência e providências cabíveis, que a(s) remessa(s) abaixo,
            sob acompanhamento operacional da MQF Logística, ${escapeHtml(copy.summary)}
          </p>

          <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin:18px 0;background:#f8fafc;">
            <p style="margin:0;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Classificação formal</p>
            <p style="margin:4px 0 0;color:#0f172a;font-size:16px;font-weight:700;">${escapeHtml(copy.classification)}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:20px 0;background:#ffffff;">
            <tbody>
              ${row('Tipo de ocorrência', escapeHtml(copy.label))}
              ${row('Cliente / empresa', safe(data.companyName, 'A confirmar'))}
              ${row('A/C', safe(data.attentionTo, 'Responsável operacional'))}
              ${row('Data do incidente', escapeHtml(formatDate(data.incidentDate)))}
              ${row('Última localização', safe(data.lastKnownLocation, location))}
              ${row('Boletim de Ocorrência', safe(data.boNumber, 'Não informado'))}
            </tbody>
          </table>

          <p style="margin:0 0 8px;"><strong>Código(s) de remessa envolvido(s):</strong></p>
          <ul style="margin:0 0 18px;padding-left:22px;color:#0f172a;">
            ${codes || '<li style="margin:4px 0;"><strong>Código a confirmar</strong></li>'}
          </ul>

          <div style="border-left:4px solid ${accent};background:${toneBg(copy.tone)};padding:14px 16px;border-radius:0 12px 12px 0;margin:20px 0;">
            <p style="margin:0;color:${toneText(copy.tone)};">
              <strong>Providência solicitada:</strong>
              ${safe(data.actionRequired, copy.defaultAction)}
            </p>
          </div>

          <p style="margin:0 0 16px;">
            Permanecemos à disposição para encaminhar documentação complementar,
            boletim de ocorrência, histórico de movimentação ou demais registros necessários à apuração.
          </p>

          <p style="margin:0 0 4px;">Atenciosamente,</p>
          <p style="margin:0;font-weight:700;">MQF Logística</p>
          ${contact ? `<p style="margin:6px 0 0;color:#475569;font-size:13px;">Contato para retorno: ${contact}</p>` : ''}
        </div>
      </div>
    </div>
  `
}
