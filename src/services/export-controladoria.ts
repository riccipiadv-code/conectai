import { format, parseISO } from 'date-fns'
import type { ExcelCell, ExcelCellStyle, CellValue, ExcelSheet } from '@/lib/excel'

const BL = '000000',
  WH = 'FFFFFF',
  GR = 'D9D9D9',
  YL = 'FFFF00'
const FT = 'Calibri',
  SZ = 11
const CUR = 'R$ #,##0.00',
  PCT_F = '0.00%',
  DT_F = 'dd/mm/yyyy'

const B: ExcelCellStyle = { fontFamily: FT, fontSize: SZ, border: true, borderColor: BL }
const HDR: ExcelCellStyle = { ...B, bold: true, bgColor: WH, alignment: 'center' }
const TXT: ExcelCellStyle = { ...B, bgColor: WH, alignment: 'left' }
const NUM: ExcelCellStyle = { ...B, bgColor: WH, alignment: 'right' }
const NUMC: ExcelCellStyle = { ...B, bgColor: WH, alignment: 'center' }
const CTR: ExcelCellStyle = { ...B, bgColor: WH, alignment: 'center' }
const TL: ExcelCellStyle = { ...B, bold: true, bgColor: GR, alignment: 'left' }
const TR: ExcelCellStyle = { ...B, bold: true, bgColor: GR, alignment: 'right' }
const TC: ExcelCellStyle = { ...B, bold: true, bgColor: GR, alignment: 'center' }
const LHDR: ExcelCellStyle = { ...B, bold: true, bgColor: YL, alignment: 'center' }
const SEP: ExcelCellStyle = { fontFamily: FT, fontSize: SZ, bgColor: WH }
const TOT_LBL: ExcelCellStyle = {
  fontFamily: FT,
  fontSize: SZ,
  bold: true,
  bgColor: WH,
  alignment: 'center',
  borderTop: true,
  borderBottom: true,
  borderColor: BL,
}
const TOT_VAL: ExcelCellStyle = {
  fontFamily: FT,
  fontSize: SZ,
  bold: true,
  bgColor: WH,
  alignment: 'right',
  borderTop: true,
  borderBottom: true,
  borderColor: BL,
}

const APR = 'orcamento_aprovado',
  CAN = 'cancelado'
const MES = [
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

const txt = (v: string | number | null): ExcelCell => sc(v ?? '', TXT)
const num = (v: number): ExcelCell => sc(v, NUMC, 'n')
const ctr = (v: string | number | null): ExcelCell => sc(v ?? '', CTR)
const mon = (v: number): ExcelCell => sc(v, NUM, 'n', CUR)
const dat = (s: string): ExcelCell => sc(parseISO(s), CTR, 'd', DT_F)
const pct = (r: number): ExcelCell => sc(r, TC, 'n', PCT_F)
const pctData = (r: number): ExcelCell => sc(r, NUMC, 'n', PCT_F)
const pad16 = (r: CellValue[]): CellValue[] => {
  const c = [...r]
  while (c.length < 16) c.push(sc('', SEP))
  return c
}

function fmtMonth(k: string): string {
  const [m, y] = k.split('/')
  return `${MES[Number(m) - 1]}/${y}`
}

function catOrigin(o: string): string {
  const l = (o || '').toLowerCase().replace(/[-\s]/g, '')
  if (l.includes('email')) return 'Email Ricci'
  if (l.includes('telefone') || l.includes('phone')) return 'Telefone'
  return 'ManyChat'
}

export function buildControladoriaSheet(data: any[]): ExcelSheet {
  const b1 = resumoMes(data)
  const b2 = convOrigem(data)
  const b3 = convArea(data)
  const maxR = Math.max(b1.length, b2.length, b3.length)
  const rows: CellValue[][] = []

  for (let i = 0; i < maxR; i++) {
    const r1 = b1[i] || Array.from({ length: 5 }, () => sc('', SEP))
    const r2 = b2[i] || Array.from({ length: 5 }, () => sc('', SEP))
    const r3 = b3[i] || Array.from({ length: 4 }, () => sc('', SEP))
    rows.push([...r1, sc('', SEP), ...r2, sc('', SEP), ...r3])
  }
  rows.push(Array.from({ length: 16 }, () => sc('', SEP)))

  detalheFechados(data, rows)

  const detailHeaderRow = maxR + 1
  const rh = rows.map((_, i) => (i === 0 ? 30 : i === detailHeaderRow ? 24 : 16))
  return {
    name: 'Controladoria',
    colWidths: [9, 10, 12, 33, 22, 12, 18, 16, 18, 12, 10, 4, 18, 14, 10, 8],
    data: rows,
    rowHeights: rh,
    merges: [],
  }
}

function resumoMes(data: any[]): CellValue[][] {
  const rows: CellValue[][] = [
    [
      sc('Mês', HDR),
      sc('Manychat', HDR),
      sc('Email Ricci', HDR),
      sc('Telefone', HDR),
      sc('Total', HDR),
    ],
  ]
  const mm = new Map<string, { mc: number; er: number; tel: number; total: number }>()
  data.forEach((c) => {
    const m = format(parseISO(c.created_at), 'MM/yyyy')
    if (!mm.has(m)) mm.set(m, { mc: 0, er: 0, tel: 0, total: 0 })
    const it = mm.get(m)!
    const cat = catOrigin(c.manychat_origens?.nome || c.origem || '')
    if (cat === 'ManyChat') it.mc++
    else if (cat === 'Email Ricci') it.er++
    else it.tel++
    it.total++
  })
  let gMC = 0,
    gER = 0,
    gTel = 0,
    gT = 0
  Array.from(mm.keys())
    .sort((a, b) => {
      const [ma, ya] = a.split('/')
      const [mb, yb] = b.split('/')
      return ya.localeCompare(yb) || ma.localeCompare(mb)
    })
    .forEach((m) => {
      const v = mm.get(m)!
      gMC += v.mc
      gER += v.er
      gTel += v.tel
      gT += v.total
      rows.push([txt(fmtMonth(m)), num(v.mc), num(v.er), num(v.tel), num(v.total)])
    })
  rows.push([
    sc('Total Geral', TL),
    sc(gMC, TC, 'n'),
    sc(gER, TC, 'n'),
    sc(gTel, TC, 'n'),
    sc(gT, TC, 'n'),
  ])
  rows.push([
    sc('Participação %', TL),
    gT ? pct(gMC / gT) : pct(0),
    gT ? pct(gER / gT) : pct(0),
    gT ? pct(gTel / gT) : pct(0),
    sc('', TC),
  ])
  return rows
}

function convOrigem(data: any[]): CellValue[][] {
  const rows: CellValue[][] = [
    [
      sc('Origem', HDR),
      sc('Autorizado', HDR),
      sc('Não Autorizado', HDR),
      sc('Pendente', HDR),
      sc('Total', HDR),
    ],
  ]
  const om = new Map<string, { auth: number; na: number; pend: number; total: number }>()
  data.forEach((c) => {
    const o = c.manychat_origens?.nome || c.origem || 'Não informada'
    if (!om.has(o)) om.set(o, { auth: 0, na: 0, pend: 0, total: 0 })
    const it = om.get(o)!
    if (c.current_stage === APR) it.auth++
    else if (c.current_stage === CAN) it.na++
    else it.pend++
    it.total++
  })
  let cA = 0,
    cN = 0,
    cP = 0,
    cT = 0
  Array.from(om.entries()).forEach(([o, v]) => {
    cA += v.auth
    cN += v.na
    cP += v.pend
    cT += v.total
    rows.push([txt(o), num(v.auth), num(v.na), num(v.pend), num(v.total)])
  })
  rows.push([
    sc('Total Geral', TL),
    sc(cA, TC, 'n'),
    sc(cN, TC, 'n'),
    sc(cP, TC, 'n'),
    sc(cT, TC, 'n'),
  ])
  rows.push([
    sc('Participação %', TL),
    cT ? pct(cA / cT) : pct(0),
    cT ? pct(cN / cT) : pct(0),
    cT ? pct(cP / cT) : pct(0),
    sc('', TC),
  ])
  return rows
}

function convArea(data: any[]): CellValue[][] {
  const rows: CellValue[][] = [
    [sc('Área', HDR), sc('Orçamentos Solicitados', HDR), sc('Fechado', HDR), sc('%', HDR)],
  ]
  const am = new Map<string, { sol: number; fech: number }>()
  data.forEach((c) => {
    const a = c.manychat_deptos?.nome || c.departamento || 'Sem departamento'
    if (!am.has(a)) am.set(a, { sol: 0, fech: 0 })
    const it = am.get(a)!
    it.sol++
    if (c.current_stage === APR) it.fech++
  })
  let tS = 0,
    tF = 0
  Array.from(am.entries()).forEach(([a, v]) => {
    tS += v.sol
    tF += v.fech
    rows.push([txt(a), num(v.sol), num(v.fech), v.sol ? pctData(v.fech / v.sol) : pctData(0)])
  })
  rows.push([
    sc('Total', TL),
    sc(tS, TC, 'n'),
    sc(tF, TC, 'n'),
    tS ? sc(tF / tS, TC, 'n', PCT_F) : sc(0, TC, 'n', PCT_F),
  ])
  return rows
}

function detalheFechados(data: any[], rows: CellValue[][]) {
  rows.push(
    pad16([
      sc('Sequencial', LHDR),
      sc('Origem', LHDR),
      sc('Data', LHDR),
      sc('Contato', LHDR),
      sc('Empresa', LHDR),
      sc('Porte Empresa', LHDR),
      sc('Nº Cliente', LHDR),
      sc('Valor Faturado', LHDR),
      sc('Responsável', LHDR),
      sc('Depto.', LHDR),
    ]),
  )

  const billed = data.filter((c) => Number(c.valor) > 0)
  let tv = 0
  billed.forEach((c, i) => {
    const v = Number(c.valor) || 0
    tv += v
    rows.push(
      pad16([
        ctr(i + 1),
        txt(c.manychat_origens?.nome || c.origem || ''),
        dat(c.created_at),
        txt(c.lead_nome_exibicao || c.lead_nome || c.nome || ''),
        txt(c.empresa_pf || c.lead_empresa_pf || ''),
        txt(c.porte_empresa || ''),
        ctr(c.numero_cliente ?? ''),
        mon(v),
        txt(c.responsavel_nome || c.legaldesk_usuarios?.nome || ''),
        txt(c.departamento || c.manychat_deptos?.nome || ''),
      ]),
    )
  })

  rows.push(
    pad16([
      sc('', SEP),
      sc('', SEP),
      sc('', SEP),
      sc('', SEP),
      sc('', SEP),
      sc('', SEP),
      sc('Total', TOT_LBL),
      sc(tv, TOT_VAL, 'n', CUR),
      sc('', SEP),
      sc('', SEP),
    ]),
  )
}
