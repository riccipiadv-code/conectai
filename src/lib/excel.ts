export interface ExcelSheet {
  name: string
  data: any[][]
}

export function exportToExcel(sheets: ExcelSheet[], filename: string) {
  let xml = `<?xml version="1.0"?>\n`
  xml += `<?mso-application progid="Excel.Sheet"?>\n`
  xml += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n`
  xml += ` xmlns:o="urn:schemas-microsoft-com:office:office"\n`
  xml += ` xmlns:x="urn:schemas-microsoft-com:office:excel"\n`
  xml += ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n`
  xml += ` xmlns:html="http://www.w3.org/TR/REC-html40">\n`

  sheets.forEach((sheet) => {
    // Excel tab names cannot exceed 31 chars or contain brackets/slashes
    const cleanName = sheet.name.replace(/[\\/?*[\]]/g, '').substring(0, 31)
    xml += ` <Worksheet ss:Name="${cleanName}">\n`
    xml += `  <Table>\n`
    sheet.data.forEach((row) => {
      xml += `   <Row>\n`
      row.forEach((cell) => {
        const cellType = typeof cell === 'number' ? 'Number' : 'String'
        const val =
          cell !== null && cell !== undefined
            ? String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : ''
        xml += `    <Cell><Data ss:Type="${cellType}">${val}</Data></Cell>\n`
      })
      xml += `   </Row>\n`
    })
    xml += `  </Table>\n`
    xml += ` </Worksheet>\n`
  })

  xml += `</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
