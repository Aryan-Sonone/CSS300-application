import { format as fmt } from 'date-fns'

type Nullish = null | undefined | number

function bad(n: Nullish): boolean {
  return n === null || n === undefined || (typeof n === 'number' && (Number.isNaN(n) || !Number.isFinite(n)))
}

export function fmtCss(n: Nullish): string {
  return bad(n) ? '—' : (n as number).toFixed(3)
}

export function fmtPct(n: Nullish, dp = 1): string {
  return bad(n) ? '—' : `${(n as number).toFixed(dp)}%`
}

export function fmtMetric(n: Nullish, dp = 1): string {
  return bad(n) ? '—' : (n as number).toFixed(dp)
}

export function fmtNum(n: Nullish): string {
  return bad(n) ? '—' : String(n)
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return fmt(d, 'd MMM yyyy · HH:mm')
}

export function fmtDateShort(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return fmt(d, 'yyyy-MM-dd HH:mm')
}
