import { useState, useRef } from 'react'
import { Download, Copy, Check } from 'lucide-react'
import { LetterForm } from './LetterForm'
import { buildLetterHtml } from './letterTemplate'
import type { LetterFormData } from '../../types'

const DEFAULT: LetterFormData = {
  bankName: '', recipientName: '', shipmentCodes: [''],
  incidentDate: '', courierName: '', boNumber: '', city: '', state: '',
}

export function LetterGenerator() {
  const [form, setForm] = useState<LetterFormData>(DEFAULT)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const letterHtml = buildLetterHtml(form)

  async function downloadPdf() {
    const { default: html2pdf } = await import('html2pdf.js')
    const el = previewRef.current
    if (!el) return
    html2pdf(el, {
      margin: [15, 20],
      filename: `comunicado-extravio-${Date.now()}.pdf`,
      html2canvas: { scale: 2, backgroundColor: '#fff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
  }

  function copyText() {
    const el = previewRef.current
    if (!el) return
    const text = el.innerText
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 0 }}>
      {/* Form panel */}
      <div className="glass p-5 overflow-y-auto" style={{ width: 360, flexShrink: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Dados da carta</p>
        <LetterForm data={form} onChange={setForm} />
        <button className="btn btn-ghost w-full mt-4 text-xs"
          onClick={() => setForm(DEFAULT)}>
          Limpar campos
        </button>
      </div>

      {/* Preview panel */}
      <div className="glass flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Prévia</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-xs" onClick={copyText}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button className="btn btn-primary text-xs" onClick={downloadPdf}>
              <Download size={13} /> PDF
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div
            ref={previewRef}
            className="letter-preview"
            dangerouslySetInnerHTML={{ __html: letterHtml }}
          />
        </div>
      </div>
    </div>
  )
}
