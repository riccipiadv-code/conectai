import * as XLSX from 'xlsx'

export interface ExcelCellStyle {
  bold?: boolean
  bgColor?: string
  fontSize?: number
  alignment?: 'left' | 'center' | 'right'
}

export interface ExcelCell {
  value: string | number | Date | boolean | null
  fmt?: string
  type?: 's' | 'n' | 'd' | 'b'
  style?: ExcelCellStyle
}

export type CellValue = ExcelCell | string | number | Date | boolean | null

export interface ExcelSheet {
  name: string
  data: CellValue[][]
  colWidths?: number[]
}

function normalizeCell(cell: CellValue): any {
  if (cell === null || cell === undefined) {
    return { t: 's', v: '' }
  }
  if (cell instanceof Date) {
    return { t: 'd', v: cell }
  }
  if (typeof cell === 'number') {
    return { t: 'n', v: cell }
  }
  if (typeof cell === 'boolean') {
    return { t: 'b', v: cell }
  }
  if (typeof cell === 'string') {
    return { t: 's', v: cell }
  }
  const ec = cell as ExcelCell
  if (ec.value === null || ec.value === undefined) {
    return { t: 's', v: '' }
  }
  const inferredType: string =
    ec.type ||
    (ec.value instanceof Date
      ? 'd'
      : typeof ec.value === 'number'
        ? 'n'
        : typeof ec.value === 'boolean'
          ? 'b'
          : 's')
  const result: any = { t: inferredType, v: ec.value }
  if (ec.fmt) result.z = ec.fmt
  if (ec.style) {
    const s: any = {}
    if (ec.style.bold || ec.style.fontSize) {
      s.font = {}
      if (ec.style.bold) s.font.bold = true
      if (ec.style.fontSize) s.font.sz = ec.style.fontSize
    }
    if (ec.style.bgColor) {
      s.fill = { patternType: 'solid', fgColor: { rgb: ec.style.bgColor } }
    }
    if (ec.style.alignment) {
      s.alignment = { horizontal: ec.style.alignment }
    }
    if (Object.keys(s).length > 0) result.s = s
  }
  return result
}

function buildWorksheet(data: CellValue[][], colWidths?: number[]): any {
  const ws: any = {}
  const maxCols = data.length > 0 ? Math.max(...data.map((row) => row.length)) : 0
  const range = {
    s: { r: 0, c: 0 },
    e: { r: Math.max(data.length - 1, 0), c: Math.max(maxCols - 1, 0) },
  }
  ws['!ref'] = XLSX.utils.encode_range(range)

  data.forEach((row, r) => {
    row.forEach((cell, c) => {
      const addr = XLSX.utils.encode_cell({ r, c })
      ws[addr] = normalizeCell(cell)
    })
  })

  if (colWidths) {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }))
  }

  return ws
}

export function exportToExcel(sheets: ExcelSheet[], filename: string) {
  const wb = XLSX.utils.book_new()

  sheets.forEach((sheet) => {
    const cleanName = sheet.name.replace(/[\\/?*[\]]/g, '').substring(0, 31)
    const ws = buildWorksheet(sheet.data, sheet.colWidths)
    XLSX.utils.book_append_sheet(wb, ws, cleanName)
  })

  XLSX.writeFile(wb, filename, { cellDates: true, bookType: 'xlsx', cellStyles: true })
}
