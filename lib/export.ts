export function exportToCSV(data: Record<string, unknown>[], filename: string, headers?: Record<string, string>) {
  if (!data.length) return

  const keys = Object.keys(data[0])
  const headerRow = headers
    ? keys.map((k) => headers[k] || k)
    : keys

  const csvRows = [
    headerRow.join(','),
    ...data.map((row) =>
      keys
        .map((k) => {
          const val = row[k]
          const str = val === null || val === undefined ? '' : String(val)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        })
        .join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
