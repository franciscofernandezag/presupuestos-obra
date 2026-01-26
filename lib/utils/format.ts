/**
 * Format a number as currency (ARS)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%'
  return `${formatNumber(value, 2)}%`
}

/**
 * Format a date
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

/**
 * Parse a formatted number back to number
 */
export function parseFormattedNumber(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
