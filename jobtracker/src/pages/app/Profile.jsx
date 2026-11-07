import { useState } from 'react'
import { Save, MapPin, Mail, Phone, BriefcaseBusiness, Target, CalendarDays, Sparkles, Camera } from 'lucide-react'
import { useStore, useUserApplications } from '../../lib/store.jsx'
import { fmtDate, fmtLPA, todayISO, daysBetween } from '../../lib/format.js'
import { Avatar, Button, Field, Input, Textarea, Tag, Metric, StatusPill } from '../../components/ui.jsx'
import { StatusDonut } from '../../components/charts.jsx'

export default function Profile() {
  const { currentUser, dispatch, toast } = useStore()
  const apps = useUserApplications()
  const [form, setForm] = useState({
    name: currentUser.name,
    title: currentUser.title,
    location: currentUser.location,
    phone: currentUser.phone || '',
    bio: currentUser.bio || '',
    goal: String(currentUser.goal || 5),
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const save = () => {
    dispatch({ type: 'updateUser', id: currentUser.id, patch: { ...form, goal: Number(form.goal) || 5 } })
    toast('Profile saved')
  }

  const applied = apps.filter((a) => a.status !== 'wishlist')

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Profile</h1>
          <p className="page-sub">How you show up in the workspace. This is a local demo profile.</p>
        </div>
        <Button variant="dark" icon={Save} onClick={save}>Save changes</Button>
      </div>

      <div className="grid g-main">
        <div className="col" style={{ gap: 14 }}>
          <div className="card pad">
            <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={currentUser.name} size="xl" color={currentUser.avatarColor} />
                <span className="icon-btn" style={{ position: 'absolute', right: -6, bottom: -6, background: 'var(--card)', border: '1px solid var(--line)', width: 28, height: 28 }}>
                  <Camera style={{ width: 13, height: 13 }} />
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1 }}>{currentUser.name}</h2>
                <div className="row small muted wrap" style={{ gap: 12, marginTop: 6 }}>
                  <span className="row" style={{ gap: 4 }}><BriefcaseBusiness size={13} /> {currentUser.title}</span>
                  <span className="row" style={{ gap: 4 }}><MapPin size={13} /> {currentUser.location}</span>
                  <span className="row" style={{ gap: 4 }}><Mail size={13} /> {currentUser.email}</span>
                  {currentUser.phone ? <span className="row" style={{ gap: 4 }}><Phone size={13} /> {currentUser.phone}</span> : null}
                </div>
                <div className="row wrap" style={{ gap: 5, marginTop: 10 }}>
                  <Tag tone="moss">{currentUser.plan} plan</Tag>
                  <Tag>Joined {fmtDate(currentUser.joinedAt, { year: true })}</Tag>
                  <Tag tone="slate">Active</Tag>
                </div>
              </div>
            </div>
            {currentUser.bio ? <p className="small muted" style={{ marginTop: 14, lineHeight: 1.6, maxWidth: '70ch' }}>{currentUser.bio}</p> : null}
          </div>

          <div className="card pad">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Edit details</div>
            <div className="col" style={{ gap: 11 }}>
              <div className="grid g2" style={{ gap: 10 }}>
                <Field label="Full name"><Input value={form.name} onChange={set('name')} /></Field>
                <Field label="Current role"><Input value={form.title} onChange={set('title')} /></Field>
                <Field label="Location"><Input value={form.location} onChange={set('location')} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="+91 …" /></Field>
              </div>
              <Field label="Email" hint="Email is fixed in this demo."><Input value={currentUser.email} disabled /></Field>
              <Field label="Weekly goal">
                <div className="row wrap" style={{ gap: 6 }}>
                  {['3', '5', '8', '10', '15'].map((g) => (
                    <button key={g} type="button" className={`btn btn-sm ${form.goal === g ? 'btn-dark' : ''}`} onClick={() => setForm((f) => ({ ...f, goal: g }))}>
                      {g} apps
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Short bio"><Textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="What you do, what you're looking for." /></Field>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <Button variant="dark" icon={Save} onClick={save}>Save changes</Button>
              </div>
            </div>
          </div>

          <div className="card pad">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div>
                <div className="eyebrow">Recent activity</div>
                <div className="serif" style={{ fontSize: 21, marginTop: 2 }}>Your last moves</div>
              </div>
              <Tag tone="clay"><Sparkles size={10} /> live</Tag>
            </div>
            <div className="timeline">
              {apps
                .slice()
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 6)
                .map((a) => (
                  <div key={a.id} className="tl-item">
                    <div className="tl-rail"><span className="tl-dot" /></div>
                    <div className="tl-body">
                      <div className="small">
                        <strong>{a.company}</strong> — {a.role} · <StatusPill status={a.status} />
                      </div>
                      <div className="tiny dim" style={{ marginTop: 2 }}>updated {fmtDate(a.updatedAt, { year: true })}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="grid g2" style={{ gap: 10 }}>
            <Metric label="Tracked" value={apps.length} icon={Target} />
            <Metric label="Applied" value={applied.length} icon={BriefcaseBusiness} />
            <Metric label="Offers" value={apps.filter((a) => a.status === 'offer').length} icon={Sparkles} accent="var(--moss)" />
            <Metric label="Interviews" value={apps.filter((a) => a.status === 'interview').length} icon={CalendarDays} accent="var(--clay)" />
          </div>

          <div className="card pad">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Your split</div>
            <StatusDonut applications={apps} size={140} />
          </div>

          <div className="card pad" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow">This week</div>
            <div className="serif" style={{ fontSize: 34, marginTop: 4 }}>
              {applied.filter((a) => daysBetween(a.appliedDate, todayISO()) <= 7 && daysBetween(a.appliedDate, todayISO()) >= 0).length}
              <span className="small muted" style={{ fontFamily: 'var(--sans)', marginLeft: 6 }}>/ {currentUser.goal || 5} goal</span>
            </div>
            <p className="tiny dim" style={{ marginTop: 6 }}>Average top band: {fmtLPA(Math.round((apps.reduce((s, a) => s + (a.salaryMax || 0), 0) / Math.max(1, apps.filter((a) => a.salaryMax).length)) * 10) / 10)}</p>
          </div>
        </div>
      </div>
    </>
  )
}
