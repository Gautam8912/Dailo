export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name

export const fmtDate = (iso, opts = {}) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  // callers pass `year: true` as a flag, so translate it into a valid Intl value
  const { year, ...rest } = opts
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' } : {}),
    ...rest,
  })
}

export const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${fmtDate(iso)} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const daysFromNow = (n) => daysAgo(-n)

export const daysBetween = (a, b) => {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

export const relTime = (iso) => {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  const future = diff < 0
  const suffix = future ? 'from now' : 'ago'
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ${suffix}`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ${suffix}`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ${suffix}`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ${suffix}`
  return `${Math.round(months / 12)}y ${suffix}`
}

const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 0 })

export const fmtLPA = (n) => {
  if (!n && n !== 0) return '—'
  return `₹${money.format(n)}L`
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)

export const sum = (arr, pick) => arr.reduce((acc, x) => acc + (pick(x) || 0), 0)

export const groupCount = (arr, pick) =>
  arr.reduce((acc, x) => {
    const k = pick(x)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const slug = (s = '') =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12)

export const pickLogoColor = (seed = '') => {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 997
  const palette = [
    { bg: '#191714', fg: '#f6efe2' },
    { bg: '#b4552d', fg: '#fff3ec' },
    { bg: '#40624a', fg: '#eaf3e7' },
    { bg: '#c99a2e', fg: '#2b210a' },
    { bg: '#3f5068', fg: '#eaf0f8' },
    { bg: '#6c4b6e', fg: '#f6e9f6' },
    { bg: '#a33a3a', fg: '#fdeeee' },
  ]
  return palette[h % palette.length]
}
