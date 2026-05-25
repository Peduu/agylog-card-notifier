import { useState } from 'react'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import type { Template } from '../../types'

interface Props {
  value: string
  onChange: (v: string) => void
  templates: Template[]
  onLoadTemplate: (t: Template) => void
  onToggleFavorite: (t: Template) => void
}

export function SubjectField({ value, onChange, templates, onLoadTemplate, onToggleFavorite }: Props) {
  const [open, setOpen] = useState(false)
  const favorites = templates.filter(t => t.is_favorite)

  return (
    <div className="field">
      <div className="flex items-center justify-between">
        <label style={{ margin: 0 }}>Assunto</label>
        {templates.length > 0 && (
          <button type="button" className="text-xs text-blue-400/70 flex items-center gap-1"
            onClick={() => setOpen(o => !o)}>
            Templates {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      <input className="input" placeholder="Assunto do e-mail" value={value}
        onChange={e => onChange(e.target.value)} />

      {open && (
        <div className="glass-sm mt-1 p-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
          {templates.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">Nenhum template salvo</p>
          )}
          {templates.map(t => (
            <div key={t.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-white/5 group"
              onClick={() => { onLoadTemplate(t); setOpen(false) }}>
              <button type="button"
                className="flex-shrink-0"
                onClick={e => { e.stopPropagation(); onToggleFavorite(t) }}>
                <Star size={13}
                  className={t.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-white/20 group-hover:text-white/40'} />
              </button>
              <span className="text-sm text-white/70 truncate flex-1">{t.subject}</span>
              {favorites.includes(t) && (
                <span className="text-[10px] text-yellow-400/60">favorito</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
