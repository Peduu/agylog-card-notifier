import type {
  Sender,
  SenderCreate,
  Template,
  SentEmail,
  SendEmailRequest,
  OutlookDraftRequest,
  SentLogRequest,
} from '../types'

export type TemplateCreate = Pick<Template, 'subject' | 'body'> & { is_favorite?: boolean }

const BASE = '/api'

function formatApiError(detail: unknown, fallback: string) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item?.msg === 'string') return item.msg
        return typeof item === 'string' ? item : ''
      })
      .filter(Boolean)
      .join(' | ') || fallback
  }
  return fallback
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(formatApiError(err.detail, res.statusText || 'Erro desconhecido'))
  }
  return res.json()
}

// Senders
export const getSenders = () => req<Sender[]>('/senders')
export const createSender = (body: SenderCreate) => req<{ id: number }>('/senders', { method: 'POST', body: JSON.stringify(body) })
export const updateSender = (id: number, body: Partial<SenderCreate>) => req<{ ok: boolean }>(`/senders/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteSender = (id: number) => req<{ ok: boolean }>(`/senders/${id}`, { method: 'DELETE' })
export const testSmtp = (body: Pick<SenderCreate, 'smtp_host' | 'smtp_port' | 'smtp_user' | 'smtp_pass' | 'use_tls'>) =>
  req<{ ok: boolean }>('/senders/test', { method: 'POST', body: JSON.stringify(body) })

// Templates
export const getTemplates = () => req<Template[]>('/templates')
export const createTemplate = (body: TemplateCreate) => req<{ id: number }>('/templates', { method: 'POST', body: JSON.stringify(body) })
export const updateTemplate = (id: number, body: Partial<TemplateCreate>) => req<{ ok: boolean }>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const deleteTemplate = (id: number) => req<{ ok: boolean }>(`/templates/${id}`, { method: 'DELETE' })

// Email
export const sendEmail = (body: SendEmailRequest) => req<{ id: number; ok: boolean }>('/send', { method: 'POST', body: JSON.stringify(body) })
export const openOutlookDraft = (body: OutlookDraftRequest) =>
  req<{ ok: boolean; drafts: number }>('/outlook/draft', { method: 'POST', body: JSON.stringify(body) })
export const logSentEmail = (body: SentLogRequest) =>
  req<{ id: number; ok: boolean }>('/sent/log', { method: 'POST', body: JSON.stringify(body) })

// Sent history
export const getSent = (includeArchived = false) => req<SentEmail[]>(`/sent?include_archived=${includeArchived}`)
export const archiveSent = (id: number) => req<{ ok: boolean }>(`/sent/${id}/archive`, { method: 'PATCH' })
export const deleteSent = (id: number) => req<{ ok: boolean }>(`/sent/${id}`, { method: 'DELETE' })
