import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X, Search, Inbox, ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react'
import { STATUS_MAP, PRIORITY_MAP } from '../lib/constants.js'
import { initials } from '../lib/format.js'

/* ------------------------------------------------------------------ Button */
export function Button({ variant = 'default', size, icon: Icon, iconRight: IconRight, children, className = '', ...props }) {
  const cls = ['btn', variant !== 'default' ? `btn-${variant}` : '', size ? `btn-${size}` : '', className].filter(Boolean).join(' ')
  return (
    <button className={cls} {...props}>
      {Icon ? <Icon /> : null}
      {children}
      {IconRight ? <IconRight /> : null}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} type="button" {...props}>
      <Icon />
    </button>
  )
}

/* ------------------------------------------------------------------ Avatar */
export function Avatar({ name, size = 'md', color, className = '' }) {
  return (
    <span
      className={`avatar avatar-${size} ${className}`}
      style={color ? { background: color } : undefined}
      title={name}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function Logo({ company, size = 'md', color }) {
  const cls = size === 'lg' ? 'logo logo-lg' : 'logo'
  const palette = color || { bg: '#191714', fg: '#f6efe2' }
  return (
    <span className={cls} style={{ background: palette.bg, color: palette.fg }} aria-hidden="true">
      {initials(company).slice(0, 2)}
    </span>
  )
}

/* ------------------------------------------------------------------- Badge */
export function StatusPill({ status, showDot = true }) {
  const s = STATUS_MAP[status] || STATUS_MAP.applied
  return (
    <span
      className="status"
      style={{ background: s.bg, color: s.color, borderColor: `${s.color}22` }}
    >
      {showDot ? <span className="dot" /> : null}
      {s.label}
    </span>
  )
}

export function PriorityTag({ priority }) {
  const p = PRIORITY_MAP[priority]
  if (!p) return null
  return <span className={`tag tag-${p.tone}`}>{p.label}</span>
}

export function Tag({ children, tone = '', dot, className = '' }) {
  return <span className={`tag ${tone ? `tag-${tone}` : ''} ${dot ? 'tag-dot' : ''} ${className}`.trim()}>{children}</span>
}

export function Delta({ value, suffix = '' }) {
  if (!value) return <span className="delta delta-flat"><Minus size={10} /> flat</span>
  const up = value > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(value)}
      {suffix}
    </span>
  )
}

/* ------------------------------------------------------------------ Fields */
export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {hint ? <span className="tiny dim">{hint}</span> : null}
    </div>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`select ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`} {...props} />
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`search ${className}`}>
      <Search />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  )
}

export function CheckBox({ checked, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className="check" onClick={onChange}>
      <Check />
    </button>
  )
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, subtitle, icon: Icon, children, footer, width = '' }) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${width}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {Icon ? (
            <span className="empty-icon" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <Icon />
            </span>
          ) : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="serif" style={{ fontSize: 26, lineHeight: 1.1 }}>
              {title}
            </h2>
            {subtitle ? <p className="small muted" style={{ marginTop: 3 }}>{subtitle}</p> : null}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ Drawer */
export function Drawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <>
      <div className="scrim" style={{ zIndex: 105 }} onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        {children}
      </aside>
    </>,
    document.body,
  )
}

/* ------------------------------------------------------------------- Empty */
export function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon />
      </span>
      <div>
        <div className="strong" style={{ fontSize: 14 }}>{title}</div>
        {body ? <div className="small muted" style={{ maxWidth: 340, margin: '4px auto 0' }}>{body}</div> : null}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ Metric */
export function Metric({ label, value, foot, icon: Icon, badge, accent }) {
  return (
    <div className="metric">
      <div className="metric-label">
        {Icon ? <Icon size={12} /> : null}
        {label}
      </div>
      <div className="metric-value" style={accent ? { color: accent } : undefined}>{value}</div>
      {foot ? <div className="metric-foot">{foot}</div> : null}
      {badge ? <div className="metric-badge">{badge}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Select
   A small custom dropdown used in toolbars (native <select> in forms). */
export function Dropdown({ label, value, onChange, options, icon: Icon, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const current = options.find((o) => o.value === value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button variant="default" icon={Icon} iconRight={ChevronDown} onClick={() => setOpen((v) => !v)} style={{ background: open ? 'var(--paper-2)' : undefined }}>
        {label ? `${label}: ` : ''}
        {current?.label ?? 'All'}
      </Button>
      {open ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            [align]: 0,
            top: 'calc(100% + 6px)',
            minWidth: 190,
            padding: 6,
            zIndex: 40,
            boxShadow: 'var(--shadow)',
            animation: 'pop .16s var(--ease)',
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                border: 0,
                background: o.value === value ? 'var(--paper-2)' : 'transparent',
                borderRadius: 8,
                padding: '8px 9px',
                fontSize: 12.5,
                cursor: 'pointer',
                textAlign: 'left',
                color: o.value === value ? 'var(--ink)' : 'var(--ink-2)',
                fontWeight: o.value === value ? 600 : 450,
              }}
              onMouseEnter={(e) => {
                if (o.value !== value) e.currentTarget.style.background = 'var(--paper-2)'
              }}
              onMouseLeave={(e) => {
                if (o.value !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              {o.dot ? <span style={{ width: 7, height: 7, borderRadius: 99, background: o.dot, flex: 'none' }} /> : null}
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.value === value ? <Check size={13} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Toasts */
export function Toasts({ toasts, onDismiss }) {
  return createPortal(
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => onDismiss(t.id)} role="status">
          {t.tone === 'err' ? <X /> : <Check />}
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}

/* --------------------------------------------------------------- sparkline */
export function Sparkline({ data, width = 72, height = 26, stroke = 'var(--clay)' }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const pts = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width
    const y = height - ((d - min) / span) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={width} height={height} className="chart" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={pts[pts.length - 1].split(',')[1]} r="2.2" fill={stroke} />
    </svg>
  )
}

export function SparklesIcon(props) {
  return <Sparkles {...props} />
}
