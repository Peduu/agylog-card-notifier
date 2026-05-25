export interface Sender {
  id: number
  name: string
  email: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  use_tls: number
  created_at: string
}

export interface SenderCreate {
  name: string
  email: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  use_tls: boolean
}

export interface Template {
  id: number
  subject: string
  body: string
  is_favorite: number
  created_at: string
}

export interface SentEmail {
  id: number
  sender_id: number | null
  sender_email: string
  recipients: string[]
  subject: string
  body: string
  send_mode: 'cc' | 'individual'
  status: string
  archived: number
  sent_at: string
}

export interface SendEmailRequest {
  sender_id: number
  recipients: string[]
  subject: string
  body: string
  send_mode: 'cc' | 'individual'
  save_as_template?: boolean
}

export interface OutlookDraftRequest {
  recipients: string[]
  subject: string
  body: string
  send_mode: 'cc' | 'individual'
}

export interface SentLogRequest {
  sender_email: string
  recipients: string[]
  subject: string
  body: string
  send_mode: 'cc' | 'individual'
  status?: string
}

export interface EmailDraft {
  id: number
  subject: string
  body: string
}

export interface LetterFormData {
  bankName: string
  recipientName: string
  shipmentCodes: string[]
  incidentDate: string
  courierName: string
  boNumber: string
  city: string
  state: string
}

export type OccurrenceType =
  | 'extravio'
  | 'roubo_furto'
  | 'entrega_indevida'
  | 'violacao_avaria'
  | 'divergencia_conteudo'
  | 'contestacao_entrega'
  | 'atraso_critico'

export interface LostDeliveryNotificationData {
  incidentType: OccurrenceType
  companyName: string
  attentionTo: string
  shipmentCodes: string[]
  incidentDate: string
  lastKnownLocation: string
  boNumber: string
  city: string
  state: string
  cityIbgeCode: number | null
  actionRequired: string
  contactName: string
  contactEmail: string
  contactPhone: string
}
