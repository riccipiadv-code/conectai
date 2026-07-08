import { format, parseISO } from 'date-fns'
import type { ExcelCell, ExcelCellStyle, CellValue, ExcelSheet } from '@/lib/excel'

const CURRENCY_FMT = '"R$" #,##0.00'
const PERCENT_FMT = '0.00%'
const DATE_FMT = 'dd/mm/yyyy'
const BORDER_COLOR = '8EAADB'

const HEADER_STYLE: ExcelCellStyle = {
  bold: true,
  bgColor: '4472C4',
  alignment: 'center',
  border: true,
  borderColor: BORDER_COLOR,
}
const TITLE_STYLE: ExcelCellStyle = {
  bold: true,
  bgColor: '1F4E79',
  alignment: 'center',
  fontSize: 14,
}
const SECTION_STYLE: ExcelCellStyle = {
  bold: true,
  bgColor: '8EAADB',
  alignment: 'center',
  border: true,
  borderColor: BORDER_COLOR,
}
const TOTAL_BASE: ExcelCellStyle = {
  bold: true,
  bgColor: 'D9E2F3',
  border: true,
  borderColor: BORDER_COLOR,
}
const TOTAL_LEFT: ExcelCellStyle = { ...TOTAL_BASE, alignment: 'left' }
const TOTAL_RIGHT: ExcelCellStyle = { ...TOTAL_BASE, alignment: 'right' }
const TOTAL_CENTER: ExcelCellStyle = { ...TOTAL_BASE, alignment: 'center' }
const TEXT_LEFT: ExcelCellStyle = { alignment: 'left', border: true, borderColor: BORDER_COLOR }
const NUM_RIGHT: ExcelCellStyle = { alignment: 'right', border: true, borderColor: BORDER_COLOR }
const CENTER: ExcelCellStyle = { alignment: 'center', border: true, borderColor: BORDER_COLOR }
const PCT_CENTER: ExcelCellStyle = {
  bold: true,
  alignment: 'center',
  border: true,
  borderColor: BORDER_COLOR,
}
const EMPTY_BD: ExcelCellStyle = { border: true, borderColor: BORDER_COLOR }

const STAGE_APROVADO = 'orcamento_aprovado'
const STAGE_CANCELADO = 'cancelado'
const MONTH_NAMES_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

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

const eb = (): ExcelCell => sc('', EMPTY_BD)
const txt = (v: string | number | null): ExcelCell => sc(v ?? '', TEXT_LEFT)
const num = (v: number): ExcelCell => sc(v, NUM_RIGHT, 'n')
const ctr = (v: string | number | null): ExcelCell => sc(v ?? '', CENTER)
const mon = (v: number): ExcelCell => sc(v, NUM_RIGHT, 'n', CURRENCY_FMT)
const dat = (s: string): ExcelCell => sc(parseISO(s), CENTER, 'd', DATE_FMT)
const pct = (r: number): ExcelCell => sc(r, PCT_CENTER, 'n', PERCENT_FMT)
const secRow = (title: string, w: number): ExcelCell[] =>
  Array.from({ length: w }, (_, i) => sc(i === 0 ? title : '', SECTION_STYLE))

function formatMonthBR(key: string): string {
  const [mm, yyyy] = key.split('/')
  return `${MONTH_NAMES_BR[Number(mm) - 1]}/${yyyy}`
}

function categorizeOrigin(originName: string): string {
  const lower = (originName || '').toLowerCase().replace(/[-\s]/g, '')
  if (lower.includes('whatsapp') || lower.includes('manychat')) return 'ManyChat'
  if (lower.includes('email')) return 'Email Ricci'
  if (lower.includes('telefone') || lower.includes('phone')) return 'Telefone'
  return 'ManyChat'
}

function padBlock(block: CellValue[][], width: number): CellValue[][] {
  return block.map((row) => {
    const padded = [...row]
    while (padded.length < width) padded.push(eb())
    return padded
  })
}

export function buildControladoriaSheet(data: any[]): ExcelSheet {
  const b1 = padBlock(buildResumoMesOrigem(data), 5)
  const b2 = padBlock(buildConversaoOrigem(data), 5)
  const b3 = padBlock(buildConversaoArea(data), 4)
  const maxRows = Math.max(b1.length, b2.length, b3.length)

  const rows: CellValue[][] = []
  rows.push(Array.from({ length: 16 }, (_, i) => sc(i === 0 ? 'CONTROLADORIA' : '', TITLE_STYLE)))

  for (let i = 0; i < maxRows; i++) {
    const r1 = b1[i] || Array.from({ length: 5 }, () => eb())
    const r2 = b2[i] || Array.from({ length: 5 }, () => eb())
    const r3 = b3[i] || Array.from({ length: 4 }, () => eb())
    rows.push([...r1, '', ...r2, '', ...r3])
  }

  rows.push([])
  buildDetalheFechados(data, rows)

  const rowHeights = rows.map((_, i) => (i === 0 ? 30 : i === 1 || i === 2 ? 22 : 20))

  return {
    name: 'Controladoria',
    colWidths: [8, 14, 12, 24, 22, 12, 10, 14, 24, 22, 10, 3, 22, 14, 10, 8],
    data: rows,
    rowHeights,
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 10 } },
      { s: { r: 1, c: 12 }, e: { r: 1, c: 15 } },
    ],
  }
}

function buildResumoMesOrigem(data: any[]): CellValue[][] {
  const rows: CellValue[][] = []
  rows.push(secRow('RESUMO POR MÊS E ORIGEM', 5))
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
    .sort((a, b) => {
      const [ma, ya] = a.split('/')
      const [mb, yb] = b.split('/')
      return ya.localeCompare(yb) || ma.localeCompare(mb)
    })
    .forEach((m) => {
      const v = monthMap.get(m)!
      gMC += v.mc
      gER += v.er
      gTel += v.tel
      gTotal += v.total
      rows.push([txt(formatMonthBR(m)), num(v.mc), num(v.er), num(v.tel), num(v.total)])
    })

  rows.push([
    sc('Total Geral', TOTAL_LEFT),
    sc(gMC, TOTAL_RIGHT, 'n'),
    sc(gER, TOTAL_RIGHT, 'n'),
    sc(gTel, TOTAL_RIGHT, 'n'),
    sc(gTotal, TOTAL_RIGHT, 'n'),
  ])
  rows.push([
    sc('Participação %', TOTAL_LEFT),
    gTotal ? pct(gMC / gTotal) : pct(0),
    gTotal ? pct(gER / gTotal) : pct(0),
    gTotal ? pct(gTel / gTotal) : pct(0),
    eb(),
  ])

  return rows
}

function buildConversaoOrigem(data: any[]): CellValue[][] {
  const rows: CellValue[][] = []
  rows.push(secRow('CONVERSÃO POR ORIGEM', 5))
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
    rows.push([txt(o), num(v.auth), num(v.notAuth), num(v.pend), num(v.total)])
  })

  rows.push([
    sc('Total Geral', TOTAL_LEFT),
    sc(cAuth, TOTAL_RIGHT, 'n'),
    sc(cNotAuth, TOTAL_RIGHT, 'n'),
    sc(cPend, TOTAL_RIGHT, 'n'),
    sc(cTotal, TOTAL_RIGHT, 'n'),
  ])
  rows.push([
    sc('Participação %', TOTAL_LEFT),
    cTotal ? pct(cAuth / cTotal) : pct(0),
    cTotal ? pct(cNotAuth / cTotal) : pct(0),
    cTotal ? pct(cPend / cTotal) : pct(0),
    eb(),
  ])

  return rows
}

function buildConversaoArea(data: any[]): CellValue[][] {
  const rows: CellValue[][] = []
  rows.push(secRow('CONVERSÃO POR ÁREA', 4))
  rows.push([
    sc('Área', HEADER_STYLE),
    sc('Solicitados', HEADER_STYLE),
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
    rows.push([txt(a), num(v.sol), num(v.fech), v.sol ? pct(v.fech / v.sol) : pct(0)])
  })

  rows.push([
    sc('Total', TOTAL_LEFT),
    sc(tSol, TOTAL_RIGHT, 'n'),
    sc(tFech, TOTAL_RIGHT, 'n'),
    tSol ? sc(tFech / tSol, TOTAL_CENTER, 'n', PERCENT_FMT) : sc(0, TOTAL_CENTER, 'n', PERCENT_FMT),
  ])

  return rows
}

function buildDetalheFechados(data: any[], rows: CellValue[][]) {
  rows.push([
    sc('', HEADER_STYLE),
    sc('Origem', HEADER_STYLE),
    sc('Data', HEADER_STYLE),
    sc('Contato', HEADER_STYLE),
    sc('Empresa', HEADER_STYLE),
    sc('Porte Empresa', HEADER_STYLE),
    sc('Nº Cliente', HEADER_STYLE),
    sc('Valor Faturado', HEADER_STYLE),
    sc('Responsável', HEADER_STYLE),
    sc('Departamento', HEADER_STYLE),
  ])

  const billed = data.filter((c) => Number(c.valor) > 0)
  let totalValor = 0
  billed.forEach((c, i) => {
    const valor = Number(c.valor) || 0
    totalValor += valor
    rows.push([
      ctr(i + 1),
      txt(c.manychat_origens?.nome || c.origem || ''),
      dat(c.created_at),
      txt(c.lead_nome_exibicao || c.lead_nome || c.nome || ''),
      txt(c.empresa_pf || c.lead_empresa_pf || ''),
      txt(c.porte_empresa || ''),
      ctr(c.numero_cliente ?? ''),
      mon(valor),
      txt(c.responsavel_nome || c.legaldesk_usuarios?.nome || ''),
      txt(c.departamento || c.manychat_deptos?.nome || ''),
    ])
  })

  rows.push([
    sc('', TOTAL_BASE),
    sc('', TOTAL_BASE),
    sc('', TOTAL_BASE),
    sc('Total', TOTAL_LEFT),
    sc('', TOTAL_BASE),
    sc('', TOTAL_BASE),
    sc('', TOTAL_BASE),
    sc(totalValor, TOTAL_RIGHT, 'n', CURRENCY_FMT),
    sc('', TOTAL_BASE),
    sc('', TOTAL_BASE),
  ])
}
