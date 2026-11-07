import { useMemo } from 'react'
import { BarChart3, TrendingUp, Target, Coins, Layers, Download, Info } from 'lucide-react'
import { useStore, useUserApplications } from '../../lib/store.jsx'
import { STATUSES, SOURCES } from '../../lib/constants.js'
import { fmtLPA, groupCount, pct, sum } from '../../lib/format.js'
import { ActivityStrip, Funnel, StatusDonut, VolumeChart } from '../../components/charts.jsx'
import { Button, Metric, Tag } from '../../components/ui.jsx'

export default function Insights() {
  const apps = useUserApplications()
  const { toast } = useStore()

  const applied = apps.filter((a) => a.status !== 'wishlist')
  const responded = apps.filter((a) => ['screening', 'interview', 'offer', 'rejected'].includes(a.status))
  const interviews = apps.filter((a) => ['interview', 'offer'].includes(a.status))
  const offers = apps.filter((a) => a.status === 'offer')
  const rejected = apps.filter((a) => a.status === 'rejected')

  const bySource = useMemo(() => {
    const counts = groupCount(applied, (a) => a.source)
    return Object.entries(counts)
      .map(([source, count]) => {
        const sApps = applied.filter((a) => a.source === source)
        const sWin = sApps.filter((a) => ['screening', 'interview', 'offer'].includes(a.status)).length
        return { source, count, win: sWin, rate: pct(sWin, count) }
      })
      .sort((a, b) => b.count - a.count)
  }, [applied])

  const byWorkMode = groupCount(applied, (a) => a.workMode)
  const salaries = apps.filter((a) => a.salaryMax)
  const avgTop = salaries.length ? sum(salaries, (a) => a.salaryMax) / salaries.length : 0
  const topBand = salaries.length ? Math.max(...salaries.map((a) => a.salaryMax)) : 0

  const monthly = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      out.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        count: apps.filter((a) => a.appliedDate.slice(0, 7) === key).length,
      })
    }
    return out
  }, [apps])

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1)

  const fmtRate = (n) => `${Math.round(n)}%`

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Analytics</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Insights</h1>
          <p className="page-sub">What is working, what is quiet, and where your energy should go next week.</p>
        </div>
        <Button icon={Download} onClick={() => toast('CSV export is queued in this demo — 32 rows ready.', 'ok')}>Export report</Button>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Metric label="Applied" value={applied.length} icon={Layers} foot={<span className="tiny muted">wishlist excluded</span>} />
        <Metric label="Response rate" value={fmtRate(pct(responded, applied.length))} icon={Target} accent="var(--moss)" foot={<span className="tiny muted">{responded.length} replied</span>} />
        <Metric label="Interview rate" value={fmtRate(pct(interviews.length, applied.length))} icon={TrendingUp} accent="var(--clay)" foot={<span className="tiny muted">{interviews.length} reached interviews</span>} />
        <Metric label="Avg top band" value={avgTop ? fmtLPA(Math.round(avgTop * 10) / 10) : '—'} icon={Coins} foot={<span className="tiny muted">highest: {fmtLPA(topBand)}</span>} />
      </div>

      <div className="grid g-main" style={{ marginBottom: 14 }}>
        <div className="card pad">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="eyebrow">Volume</div>
              <div className="serif" style={{ fontSize: 23, marginTop: 2 }}>Applications per week</div>
            </div>
            <Tag tone="slate"><Info size={10} /> rolling 10 weeks</Tag>
          </div>
          <VolumeChart applications={apps} weeks={10} height={170} />
          <div className="hairline" style={{ margin: '16px 0 12px' }} />
          <div className="eyebrow" style={{ marginBottom: 8 }}>Consistency map · 12 weeks</div>
          <ActivityStrip applications={apps} days={84} />
        </div>

        <div className="card pad">
          <div className="eyebrow">Mix</div>
          <div className="serif" style={{ fontSize: 23, margin: '2px 0 14px' }}>Status split</div>
          <StatusDonut applications={apps} size={150} />
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 14 }}>
        <div className="card pad">
          <div className="eyebrow">Conversion</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>Funnel</div>
          <Funnel applications={apps} />
        </div>

        <div className="card pad">
          <div className="eyebrow">Where they come from</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>Source effectiveness</div>
          <div className="col" style={{ gap: 10 }}>
            {bySource.slice(0, 6).map((s) => (
              <div key={s.source}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="small" style={{ color: 'var(--ink-2)' }}>{s.source}</span>
                  <span className="tiny tnum dim">{s.count} · {s.rate}% replied</span>
                </div>
                <div className="bar" style={{ height: 6 }}>
                  <span style={{ width: `${(s.count / (bySource[0]?.count || 1)) * 100}%`, background: s.rate >= 50 ? 'var(--moss)' : 'var(--ink)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div className="eyebrow">Trend</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>Last 6 months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 118 }}>
            {monthly.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span className="mono tiny dim">{m.count}</span>
                <div style={{ width: '100%', height: `${(m.count / maxMonthly) * 84}px`, minHeight: 3, background: 'var(--ink)', borderRadius: '4px 4px 2px 2px', opacity: 0.2 + (m.count / maxMonthly) * 0.8 }} />
                <span className="eyebrow" style={{ fontSize: 8 }}>{m.label}</span>
              </div>
            ))}
          </div>
          <div className="hairline" style={{ margin: '14px 0 10px' }} />
          <div className="col" style={{ gap: 6 }}>
            {Object.entries(byWorkMode).map(([mode, n]) => (
              <div key={mode} className="row-between small">
                <span className="muted">{mode}</span>
                <span className="tnum strong">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card pad">
          <div className="eyebrow">Money</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>Salary bands in play</div>
          <div className="col" style={{ gap: 8 }}>
            {salaries
              .sort((a, b) => b.salaryMax - a.salaryMax)
              .slice(0, 7)
              .map((a) => {
                const scale = topBand || 1
                return (
                  <div key={a.id}>
                    <div className="row-between tiny" style={{ marginBottom: 3 }}>
                      <span className="small">{a.company} <span className="dim">· {a.role}</span></span>
                      <span className="tnum dim">{fmtLPA(a.salaryMin)} – {fmtLPA(a.salaryMax)}</span>
                    </div>
                    <div className="bar" style={{ height: 5 }}>
                      <span style={{ width: `${(a.salaryMax / scale) * 100}%`, background: a.status === 'offer' ? 'var(--moss)' : 'var(--ink)' }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="card pad">
          <div className="eyebrow">Honest read</div>
          <div className="serif" style={{ fontSize: 21, margin: '2px 0 12px' }}>What the numbers say</div>
          <div className="col" style={{ gap: 10 }}>
            <Insight
              icon={TrendingUp}
              title={`${bySource[0]?.source || 'LinkedIn'} brings the most volume`}
              body={`${bySource[0]?.count || 0} of ${applied.length} applications, with a ${bySource[0]?.rate || 0}% reply rate. ${bySource[0]?.rate > 40 ? 'Keep doubling down there.' : 'Volume is high but replies are low — try referrals for the next few.'}`}
            />
            <Insight
              icon={Target}
              title={`${rejected.length} rejections, ${offers.length} offer${offers.length === 1 ? '' : 's'}`}
              body={offers.length ? 'You are converting. Negotiate on the top band and keep the rest warm until you sign.' : 'Late stages are where the work is. Ask for feedback after every rejection — it compounds.'}
            />
            <Insight
              icon={Coins}
              title={`Your average top band is ${avgTop ? fmtLPA(Math.round(avgTop * 10) / 10) : '—'}`}
              body={salaries.length ? `${salaries.length} roles disclosed a band. Anchor your asks at the ${Math.round(70)}th percentile of this range instead of the average.` : 'Add salary bands when you log roles — negotiation prep starts on day one.'}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function Insight({ icon: Icon, title, body }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: 'flex-start', paddingBottom: 9, borderBottom: '1px solid var(--line)' }}>
      <span className="empty-icon" style={{ width: 28, height: 28, borderRadius: 8, flex: 'none' }}>
        <Icon style={{ width: 13, height: 13 }} />
      </span>
      <div>
        <div className="small strong">{title}</div>
        <p className="tiny muted" style={{ marginTop: 2, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  )
}
