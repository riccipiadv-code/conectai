import { format, parseISO } from 'date-fns'
import { getStageLabel } from '@/constants/stages'
import {
  exportToExcel,
  type ExcelCell,
  type CellValue,
  type ExcelSheet,
  type ExcelCellStyle,
} from '@/lib/excel'
import { getAllContactsForExport } from '@/services/contacts'
import { supabase } from '@/lib/supabase/client'

const CUR_FMT = '"R$" #,##0.00'
const DATE_FMT = 'dd/mm/yyyy'

const HDR: ExcelCellStyle = {
  bold: true,
  bgColor: 'D9E1F2',
  border: true,
  borderColor: 'B4C6E7',
  alignment: 'center',
}
const TXT: ExcelCellStyle = { alignment: 'left' }
const WRAP: ExcelCellStyle = { alignment: 'left', wrapText: true }
const CTR: ExcelCellStyle = { alignment: 'center' }
const CUR_S: ExcelCellStyle = { alignment: 'right' }

const HEADERS = [
  'Origem',
  'Nº Cliente',
  'Data Entrada',
  'Responsável',
  'Nome do Contato',
  'Empresa / PF',
  'E-mail',
  'Telefone',
  'Serviço Selecionado',
  'Departamento',
  'Porte Empresa',
  'Valor Faturado',
  'Resumo da Solicitação',
  'Observações',
  'Estágio',
  'Data Follow Up',
  'Serviços Contratados',
]

function sc(
  v: string | number | Date | null,
  s: ExcelCellStyle,
  t?: 's' | 'n' | 'd' | 'b',
  f?: string,
): ExcelCell {
  const c: ExcelCell = { value: v, style: s }
  if (t) c.type = t
  if (f) c.fmt = f
  return c
}

function safeStr(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function sortData(data: any[]): any[] {
  return [...data].sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0
    if (!a.created_at) return 1
    if (!b.created_at) return -1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

async function fetchSubservicos(contactIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  const batchSize = 200
  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize)
    const { data } = await supabase
      .from('manychat_contatos_subservicos')
      .select('contato_id, manychat_subservicos(nome)')
      .in('contato_id', batch)
    data?.forEach((s: any) => {
      const cid = s.contato_id
      if (!result.has(cid)) result.set(cid, [])
      if (s.manychat_subservicos?.nome) {
        result.get(cid)!.push(s.manychat_subservicos.nome)
      }
    })
  }
  return result
}

async function generateExcel(data: any[]): Promise<{ success: boolean; message?: string }> {
  if (!data || data.length === 0) {
    return { success: false, message: 'Nenhum atendimento encontrado para exportação' }
  }

  const sortedData = sortData(data)
  const contactIds = sortedData.map((d: any) => d.id)
  const subservicoMap = await fetchSubservicos(contactIds)

  const rows: CellValue[][] = []
  rows.push(HEADERS.map((h) => sc(h, HDR)))

  for (const c of sortedData) {
    const contactName = safeStr(
      c.lead_nome ||
        c.nome ||
        `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
        'Desconhecido',
    )
    const phone = safeStr(c.telefone || c.whatsapp_phone)
    const servico = safeStr(c.manychat_servicos?.descricao || c.lead_servico)
    const depto = safeStr(c.manychat_deptos?.nome)
    const porte = safeStr(c.manychat_portes_empresa?.nome || c.porte_empresa)
    const responsavel = safeStr(c.legaldesk_usuarios?.nome || c.profiles?.name)
    const origem = safeStr(c.manychat_origens?.nome || c.origem)
    const stageLabel = getStageLabel(c.current_stage)
    const subservicos = subservicoMap.get(c.id)?.join(', ') || ''
    const valor = Number(c.valor) || 0

    const dataEntrada: ExcelCell = c.created_at
      ? sc(parseISO(c.created_at), CTR, 'd', DATE_FMT)
      : sc('', CTR)

    const dataFollowUp: ExcelCell = c.data_follow_up
      ? sc(parseISO(c.data_follow_up), CTR, 'd', DATE_FMT)
      : sc('', CTR)

    rows.push([
      sc(origem, TXT),
      sc(c.numero_cliente != null ? c.numero_cliente : '', CTR, 'n'),
      dataEntrada,
      sc(responsavel, TXT),
      sc(contactName, TXT),
      sc(safeStr(c.lead_empresa_pf), TXT),
      sc(safeStr(c.lead_email), TXT),
      sc(phone, CTR),
      sc(servico, TXT),
      sc(depto, TXT),
      sc(porte, TXT),
      sc(valor, CUR_S, 'n', CUR_FMT),
      sc(safeStr(c.lead_resumo), WRAP),
      sc(safeStr(c.observacoes), WRAP),
      sc(stageLabel, TXT),
      dataFollowUp,
      sc(subservicos, WRAP),
    ])
  }

  const colWidths = HEADERS.map((h, i) => {
    let maxLen = h.length
    for (const row of rows.slice(1)) {
      const cell = row[i] as ExcelCell
      const val = cell?.value
      const str = val instanceof Date ? format(val, 'dd/mm/yyyy') : String(val ?? '')
      maxLen = Math.max(maxLen, Math.min(str.length, 60))
    }
    return Math.max(maxLen + 2, 10)
  })

  const sheet: ExcelSheet = {
    name: 'Atendimentos',
    data: rows,
    colWidths,
    autofilter: true,
  }

  const filename = `atendimentos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`
  exportToExcel([sheet], filename)

  return { success: true }
}

export async function exportVisibleContactsExcel(
  data: any[],
): Promise<{ success: boolean; message?: string }> {
  return generateExcel(data)
}

export async function exportAllContactsExcel(): Promise<{ success: boolean; message?: string }> {
  const data = await getAllContactsForExport()
  return generateExcel(data)
}
