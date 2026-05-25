import type { LetterFormData } from '../../types'

const STATES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
}

function formatDate(iso: string): string {
  if (!iso) return '___/___/______'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function buildLetterHtml(f: LetterFormData): string {
  const validCodes = f.shipmentCodes.filter(c => c.trim())
  const stateLabel = STATES[f.state] || f.state
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return `
    <h2>Comunicado de Extravio de Cartão</h2>

    <p class="meta">
      <strong>${f.city || '_______________'}–${f.state || '__'}</strong>, ${today}
    </p>

    <p>À<br/>
    <strong>${f.bankName || '[Banco / Empresa destinatária]'}</strong><br/>
    A/C: ${f.recipientName || '[Nome do responsável]'}</p>

    <p>Prezado(a) Senhor(a),</p>

    <p>Vimos por meio deste comunicado formal informar que o(s) cartão(ões) bancário(s)
    abaixo relacionado(s), encaminhado(s) sob nossa responsabilidade de transporte, não
    foram entregues ao destinatário final em razão de <strong>extravio ocorrido em
    ${formatDate(f.incidentDate)}</strong>, durante as atividades operacionais conduzidas
    pelo transportador <strong>${f.courierName || '[Nome do transportador]'}</strong>.</p>

    <p><strong>Código(s) de remessa envolvido(s):</strong></p>
    <ul class="codes">
      ${validCodes.length > 0
        ? validCodes.map(c => `<li>${c}</li>`).join('\n      ')
        : '<li>—</li>'}
    </ul>

    <p>Em cumprimento às obrigações legais e regulatórias aplicáveis, registramos
    Boletim de Ocorrência sob o número <strong>${f.boNumber || '[N.º do BO]'}</strong>
    junto às autoridades competentes do Estado de ${stateLabel}.</p>

    <p>Colocamo-nos à disposição para prestar quaisquer esclarecimentos adicionais,
    bem como para colaborar com as providências que V.Sa. julgar necessárias,
    incluindo o fornecimento de documentação complementar.</p>

    <p>Atenciosamente,</p>

    <div class="sign-block">
      <p>_______________________________________</p>
      <p><strong>MQF LOGÍSTICA LTDA</strong></p>
      <p>Departamento Operacional</p>
    </div>
  `
}
