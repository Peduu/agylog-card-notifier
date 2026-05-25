import { useState } from 'react'
import { Archive, Trash2, ChevronUp, Eye } from 'lucide-react'
import type { SentEmail } from '../../types'

interface Props {
  entries: SentEmail[]
  onArchive: (id: number) => void
  onDelete: (id: number) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function HistoryEntry({ entry, onArchive, onDelete }: {
  entry: SentEmail
  onArchive: (id: number) => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="history-item">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-white/85 truncate">{entry.subject}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/35 flex-shrink-0">
              {entry.send_mode === 'cc' ? 'CC' : 'Ind.'}
            </span>
          </div>
          <p className="text-xs text-white/40 truncate">→ {entry.recipients.join(', ')}</p>
          <p className="text-xs text-white/25 mt-0.5">{formatDate(entry.sent_at)}</p>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <button className="btn btn-ghost p-1.5" title="Ver corpo" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={13} /> : <Eye size={13} />}
          </button>
          <button className="btn btn-ghost p-1.5" title="Arquivar" onClick={() => onArchive(entry.id)}>
            <Archive size={13} />
          </button>
          <button className="btn btn-danger p-1.5" title="Excluir" onClick={() => onDelete(entry.id)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div
            className="text-xs text-white/50 leading-relaxed"
            style={{ maxHeight: 160, overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: entry.body }}
          />
        </div>
      )}
    </div>
  )
}

export function SentHistory({ entries, onArchive, onDelete }: Props) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Nenhum e-mail enviado ainda</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
      {entries.map(e => (
        <HistoryEntry key={e.id} entry={e} onArchive={onArchive} onDelete={onDelete} />
      ))}
    </div>
  )
}
