export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string, headers?: Record<keyof T, string>) {
  if (!data.length) return

  const keys = Object.keys(data[0]) as (keyof T)[]
  const headerRow = headers
    ? keys.map((k) => headers[k] || String(k))
    : keys.map(String)

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
