import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/* build CSV text and trigger download */
export function exportCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n')
  downloadBlob(`${filename}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
}

/*escape commas/quotes/newlines for CSV */
function escapeCell(val) {
  const s = (val ?? '').toString()
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/*download a Blob as a file */
function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* create a simple PDF table with title */
export function exportPDF(filename, title, headers, rows) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(16)
  doc.text(title, 40, 40)

  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: rows,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [240, 240, 240] },
    margin: { left: 40, right: 40 },
    tableWidth: 'auto',
  })

  doc.save(`${filename}.pdf`)
}
