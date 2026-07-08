import { format, parseISO } from 'date-fns'
import type { ExcelCell, ExcelCellStyle, CellValue, ExcelSheet } from '@/lib/excel'

const CURRENCY_FMT = '"R$" #,##0.00'
const PERCENT_FMT = '0.00%'
const DATE_TIME_FMT = 'dd/mm/yyyy hh:mm'

const HEADER_STYLE: ExcelCellStyle = { bold: true, bgColor: '4472C4', alignment: 'center' }
const TOTAL_STYLE: ExcelCellStyle = { bold: true, bgColor: 'D9E2F3' }
const TITLE_STYLE: ExcelCellStyle = {
  bold: true,
  bgColor: '1F4E79',
  alignment: 'center',
  fontSize: 14,
}
const SECTION_STYLE: ExcelCellStyle = { bold: true, bgColor: '8EAADB' }
const PCT_STYLE: ExcelCellStyle = { bold: true }

const STAGE_APROVADO = 'orcamento_aprovado'
const STAGE_CANCELADO = 'cancelado'

function sc(
  value: string | number | Date | null,
  style: ExcelCellStyle,
  type?: 's' | 'n' | 'd' | 'b',
  fmt?: string,
): ExcelCell {
  const cell: ExcelCell = { value, style }
  if (type) cell.type = type
  if (fmt) cell.fmt = fmt
  return cell
}

function categorizeOrigin(originName: string): string {
  const lower = (originName || '').toLowerCase()
  if (lower.includes('whatsapp') || lower.includes('manychat')) return 'ManyChat'
  if (lower.includes('email')) return 'Email Ricci'
  if (lower.includes('telefone') || lower.includes('phone')) return 'Telefone'
  return 'ManyChat'
}

function pctCell(ratio: number): ExcelCell {
  return sc(ratio, PCT_STYLE, 'n', PERCENT_FMT)
}

export function buildControladoriaSheet(data: any[]): ExcelSheet {
  const rows: CellValue[][] = []

  rows.push([sc('CONTROLADORIA', TITLE_STYLE), '', '', '', '', '', '', '', '', '', ''])
  rows.push([])

  rows.push([sc('RESUMO POR MÊS E ORIGEM', SECTION_STYLE), '', '', '', ''])
  rows.push([
    sc('Mês', HEADER_STYLE),
    sc('ManyChat', HEADER_STYLE),
    sc('Email Ricci', HEADER_STYLE),
    sc('Telefone', HEADER_STYLE),
    sc('Total', HEADER_STYLE),
  ])

  const monthMap = new Map<string, { mc: number; er: number; tel: number; total: number }>()
  data.forEach((c) => {
    const m = format(parseISO(c.created_at), 'MM/yyyy')
    if (!monthMap.has(m)) monthMap.set(m, { mc: 0, er: 0, tel: 0, total: 0 })
    const item = monthMap.get(m)!
    const cat = categorizeOrigin(c.manychat_origens?.nome || c.origem || '')
    if (cat === 'ManyChat') item.mc++
    else if (cat === 'Email Ricci') item.er++
    else item.tel++
    item.total++
  })

  let gMC = 0,
    gER = 0,
    gTel = 0,
    gTotal = 0
  Array.from(monthMap.keys())
    .sort()
    .forEach((m) => {
      const v = monthMap.get(m)!
      gMC += v.mc
      gER += v.er
      gTel += v.tel
      gTotal += v.total
      rows.push([m, v.mc, v.er, v.tel, v.total])
    })
  rows.push([
    sc('Total Geral', TOTAL_STYLE),
    sc(gMC, TOTAL_STYLE, 'n'),
    sc(gER, TOTAL_STYLE, 'n'),
    sc(gTel, TOTAL_STYLE, 'n'),
    sc(gTotal, TOTAL_STYLE, 'n'),
  ])
  rows.push([])
  rows.push([sc('Participação por Origem', SECTION_STYLE), '', '', '', ''])
  rows.push([sc('ManyChat', PCT_STYLE), gTotal ? pctCell(gMC / gTotal) : pctCell(0), '', '', ''])
  rows.push([sc('Email Ricci', PCT_STYLE), gTotal ? pctCell(gER / gTotal) : pctCell(0), '', '', ''])
  rows.push([sc('Telefone', PCT_STYLE), gTotal ? pctCell(gTel / gTotal) : pctCell(0), '', '', ''])
  rows.push([])

  rows.push([sc('CONVERSÃO POR ORIGEM', SECTION_STYLE), '', '', '', ''])
  rows.push([
    sc('Origem', HEADER_STYLE),
    sc('Autorizado', HEADER_STYLE),
    sc('Não Autorizado', HEADER_STYLE),
    sc('Pendente', HEADER_STYLE),
    sc('Total', HEADER_STYLE),
  ])

  const originMap = new Map<
    string,
    { auth: number; notAuth: number; pend: number; total: number }
  >()
  data.forEach((c) => {
    const o = c.manychat_origens?.nome || c.origem || 'Não informada'
    if (!originMap.has(o)) originMap.set(o, { auth: 0, notAuth: 0, pend: 0, total: 0 })
    const item = originMap.get(o)!
    if (c.current_stage === STAGE_APROVADO) item.auth++
    else if (c.current_stage === STAGE_CANCELADO) item.notAuth++
    else item.pend++
    item.total++
  })

  let cAuth = 0,
    cNotAuth = 0,
    cPend = 0,
    cTotal = 0
  Array.from(originMap.entries()).forEach(([o, v]) => {
    cAuth += v.auth
    cNotAuth += v.notAuth
    cPend += v.pend
    cTotal += v.total
    rows.push([o, v.auth, v.notAuth, v.pend, v.total])
  })
  rows.push([
    sc('Total Geral', TOTAL_STYLE),
    sc(cAuth, TOTAL_STYLE, 'n'),
    sc(cNotAuth, TOTAL_STYLE, 'n'),
    sc(cPend, TOTAL_STYLE, 'n'),
    sc(cTotal, TOTAL_STYLE, 'n'),
  ])
  rows.push([])
  rows.push([
    sc('% Autorizado', PCT_STYLE),
    cTotal ? pctCell(cAuth / cTotal) : pctCell(0),
    '',
    '',
    '',
  ])
  rows.push([
    sc('% Não Autorizado', PCT_STYLE),
    cTotal ? pctCell(cNotAuth / cTotal) : pctCell(0),
    '',
    '',
    '',
  ])
  rows.push([
    sc('% Pendente', PCT_STYLE),
    cTotal ? pctCell(cPend / cTotal) : pctCell(0),
    '',
    '',
    '',
  ])
  rows.push([])

  rows.push([sc('CONVERSÃO POR ÁREA', SECTION_STYLE), '', '', ''])
  rows.push([
    sc('Área', HEADER_STYLE),
    sc('Orçamentos Solicitados', HEADER_STYLE),
    sc('Fechado', HEADER_STYLE),
    sc('%', HEADER_STYLE),
  ])

  const areaMap = new Map<string, { sol: number; fech: number }>()
  data.forEach((c) => {
    const a = c.manychat_deptos?.nome || c.departamento || 'Sem departamento'
    if (!areaMap.has(a)) areaMap.set(a, { sol: 0, fech: 0 })
    const item = areaMap.get(a)!
    item.sol++
    if (c.current_stage === STAGE_APROVADO) item.fech++
  })

  let tSol = 0,
    tFech = 0
  Array.from(areaMap.entries()).forEach(([a, v]) => {
    tSol += v.sol
    tFech += v.fech
    rows.push([a, v.sol, v.fech, v.sol ? pctCell(v.fech / v.sol) : pctCell(0)])
  })
  rows.push([
    sc('Total', TOTAL_STYLE),
    sc(tSol, TOTAL_STYLE, 'n'),
    sc(tFech, TOTAL_STYLE, 'n'),
    tSol ? sc(tFech / tSol, TOTAL_STYLE, 'n', PERCENT_FMT) : sc(0, TOTAL_STYLE, 'n', PERCENT_FMT),
  ])
  rows.push([])

  rows.push([sc('RELAÇÃO DOS FECHADOS', SECTION_STYLE), '', '', '', '', '', '', '', '', '', ''])
  rows.push([
    sc('Seq', HEADER_STYLE),
    sc('Origem', HEADER_STYLE),
    sc('Data', HEADER_STYLE),
    sc('Contato', HEADER_STYLE),
    sc('Cliente', HEADER_STYLE),
    sc('Porte Empresa', HEADER_STYLE),
    sc('Nº Cliente', HEADER_STYLE),
    sc('Valor Faturado', HEADER_STYLE),
    sc('Resumo', HEADER_STYLE),
    sc('Responsável', HEADER_STYLE),
    sc('Departamento', HEADER_STYLE),
  ])

  const closed = data.filter((c) => c.current_stage === STAGE_APROVADO)
  let totalValor = 0
  closed.forEach((c, i) => {
    const valor = Number(c.valor) || 0
    totalValor += valor
    rows.push([
      i + 1,
      c.manychat_origens?.nome || c.origem || '',
      { value: parseISO(c.created_at), type: 'd', fmt: DATE_TIME_FMT },
      c.lead_nome_exibicao || c.lead_nome || c.nome || '',
      c.empresa_pf || c.lead_empresa_pf || '',
      c.porte_empresa || '',
      c.numero_cliente ?? '',
      { value: valor, type: 'n', fmt: CURRENCY_FMT },
      c.lead_resumo || '',
      c.responsavel_nome || c.legaldesk_usuarios?.nome || '',
      c.departamento || c.manychat_deptos?.nome || '',
    ])
  })
  rows.push([
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc('Total', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc(totalValor, TOTAL_STYLE, 'n', CURRENCY_FMT),
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
    sc('', TOTAL_STYLE),
  ])

  return {
    name: 'Controladoria',
    colWidths: [6, 22, 18, 24, 20, 14, 12, 18, 30, 22, 22],
    data: rows,
  }
}
