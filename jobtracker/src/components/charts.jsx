import { useMemo } from 'react'
import { STATUSES } from '../lib/constants.js'

/* ---------------------------------------------------------- weekly volume */
export function VolumeChart({ applications, weeks = 10, height = 150 }) {
  const buckets = useMemo(() => {
    const out = []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    for (let i = weeks - 1; i >= 0; i -= 1) {
      const end = new Date(now)
      end.setDate(end.getDate() - i * 7)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      const count = applications.filter((a) => {
        const d = new Date(a.appliedDate)
        return d >= start && d <= end
      }).length
      out.push({ label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count })
    }
    return out
  }, [applications, weeks])

  const max = Math.max(...buckets.map((b) => b.count), 3)
  const W = 560
  const H = height
  const padBottom = 30
  const padTop = 16
  const bw = W / weeks
  const innerH = H - padBottom - padTop

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="vol-chart" role="img" aria-label="Applications per week">
        {[0.33, 0.66, 1].map((t) => (
          <line key={t} x1="0" x2={W} y1={padTop + innerH - innerH * t} y2={padTop + innerH - innerH * t} stroke="var(--line)" strokeWidth="1" />
        ))}
        {buckets.map((b, i) => {
          const h = (b.count / max) * innerH
          const x = i * bw + bw * 0.2
          const w = bw * 0.6
          return (
            <g key={i} className="barx">
              <rect x={x} y={padTop + innerH - h} width={w} height={Math.max(h, 2)} rx="3" fill={i === buckets.length - 1 ? 'var(--clay)' : 'var(--ink)'} opacity={i === buckets.length - 1 ? 1 : 0.84} />
              {b.count ? (
                <text x={x + w / 2} y={padTop + innerH - h - 6} textAnchor="middle" fontSize="11" fill="var(--ink-3)" fontWeight="600">
                  {b.count}
                </text>
              ) : null}
              <text x={x + w / 2} y={H - 10} textAnchor="middle" fontSize="9.5" fill="var(--ink-4)">
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="row-between" style={{ marginTop: 4 }}>
        <span className="tiny dim">{weeks} weeks · applications added</span>
        <span className="tiny dim">{applications.length} total</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ funnel */
export function Funnel({ applications }) {
  const stages = [
    { id: 'applied', label: 'Applied', match: ['applied', 'screening', 'interview', 'offer', 'rejected'] },
    { id: 'screening', label: 'Screened', match: ['screening', 'interview', 'offer'] },
    { id: 'interview', label: 'Interviewed', match: ['interview', 'offer'] },
    { id: 'offer', label: 'Offer', match: ['offer'] },
  ]
  const counts = stages.map((s) => ({ ...s, count: applications.filter((a) => s.match.includes(a.status)).length }))
  const top = Math.max(...counts.map((c) => c.count), 1)
  const colors = ['var(--ink)', 'var(--moss)', 'var(--clay)', 'var(--mustard)']
  return (
    <div className="col" style={{ gap: 11 }}>
      {counts.map((c, i) => (
        <div key={c.id}>
          <div className="row-between" style={{ marginBottom: 5 }}>
            <span className="small strong">{c.label}</span>
            <span className="small tnum" style={{ color: 'var(--ink-3)' }}>
              {c.count} · {Math.round((c.count / top) * 100)}%
            </span>
          </div>
          <div className="bar" style={{ height: 8, background: 'var(--paper-2)' }}>
            <span style={{ width: `${(c.count / top) * 100}%`, background: colors[i] }} />
          </div>
        </div>
      ))}
      <div className="tiny dim" style={{ marginTop: 2 }}>
        Conversion to interview:{' '}
        <strong style={{ color: 'var(--ink-2)' }}>
          {applications.filter((a) => a.status !== 'wishlist').length
            ? Math.round((applications.filter((a) => ['interview', 'offer'].includes(a.status)).length / applications.filter((a) => a.status !== 'wishlist').length) * 100)
            : 0}
          %
        </strong>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- donut */
export function StatusDonut({ applications, size = 168 }) {
  const data = STATUSES.map((s) => ({ ...s, count: applications.filter((a) => a.status === s.id).length })).filter((d) => d.count > 0)
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const r = 54
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="row" style={{ gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
        <svg viewBox="0 0 140 140" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="15" />
          {data.map((d) => {
            const len = (d.count / total) * c
            const el = (
              <circle
                key={d.id}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="15"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += len
            return el
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div className="serif" style={{ fontSize: 38, lineHeight: 1 }}>{total}</div>
            <div className="eyebrow" style={{ fontSize: 9 }}>tracked</div>
          </div>
        </div>
      </div>
      <div className="donut-legend" style={{ flex: 1, minWidth: 130 }}>
        {STATUSES.map((s) => {
          const count = applications.filter((a) => a.status === s.id).length
          return (
            <button
              key={s.id}
              type="button"
              className="row-between"
              style={{ border: 0, background: 'transparent', padding: '2px 0', cursor: 'default', fontSize: 12 }}
            >
              <span className="row" style={{ gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flex: 'none' }} />
                <span style={{ color: 'var(--ink-2)' }}>{s.label}</span>
              </span>
              <span className="tnum strong">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- heat strip */
export function ActivityStrip({ applications, days = 84 }) {
  const cells = useMemo(() => {
    const map = new Map()
    applications.forEach((a) => {
      const d = new Date(a.appliedDate)
      const key = d.toISOString().slice(0, 10)
      map.set(key, (map.get(key) || 0) + 1)
    })
    const out = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      out.push({ key, count: map.get(key) || 0, date: d })
    }
    return out
  }, [applications, days])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.ceil(days / 7)}, 1fr)`, gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 1fr)', gap: 3 }}>
      {cells.map((c) => (
        <span
          key={c.key}
          title={`${c.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — ${c.count} application(s)`}
          style={{
            aspectRatio: '1',
            borderRadius: 2.5,
            background: c.count === 0 ? 'var(--paper-2)' : c.count === 1 ? '#e8c9b6' : c.count === 2 ? '#d09a78' : 'var(--clay)',
            border: '1px solid rgba(25,23,20,.04)',
          }}
        />
      ))}
    </div>
  )
}
