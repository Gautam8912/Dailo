import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Save, Plus } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { STATUSES, SOURCES, WORK_MODES, PRIORITIES } from '../lib/constants.js'
import { fmtLPA, pickLogoColor, todayISO, uid } from '../lib/format.js'
import { Button, Field, Input, Modal, Select, Textarea, Switch } from './ui.jsx'

const blank = {
  company: '',
  role: '',
  status: 'applied',
  priority: 'medium',
  appliedDate: todayISO(),
  location: 'Bengaluru, IN',
  workMode: 'Hybrid',
  source: 'LinkedIn',
  salaryMin: '',
  salaryMax: '',
  tags: '',
  nextStep: '',
  notes: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  createTask: true,
}

export default function ApplicationForm({ open, onClose, editing, actorName }) {
  const { dispatch, currentUser, toast, tasks } = useStore()
  const [form, setForm] = useState(blank)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    if (editing) {
      setForm({
        company: editing.company,
        role: editing.role,
        status: editing.status,
        priority: editing.priority,
        appliedDate: editing.appliedDate,
        location: editing.location,
        workMode: editing.workMode,
        source: editing.source,
        salaryMin: editing.salaryMin ?? '',
        salaryMax: editing.salaryMax ?? '',
        tags: (editing.tags || []).join(', '),
        nextStep: editing.nextStep || '',
        notes: editing.notes || '',
        contactName: editing.contact?.name || '',
        contactRole: editing.contact?.role || '',
        contactEmail: editing.contact?.email || '',
        createTask: false,
      })
    } else {
      setForm(blank)
    }
  }, [open, editing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = () => {
    if (!form.company.trim() || !form.role.trim()) {
      setErr('Company and role are required.')
      return
    }
    const tags = form.tags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean)
      .slice(0, 6)
    const contact =
      form.contactName || form.contactEmail
        ? { name: form.contactName || 'Recruiter', role: form.contactRole || 'Point of contact', email: form.contactEmail }
        : null

    if (editing) {
      dispatch({
        type: 'updateApp',
        id: editing.id,
        patch: {
          company: form.company.trim(),
          role: form.role.trim(),
          status: form.status,
          priority: form.priority,
          appliedDate: form.appliedDate,
          location: form.location,
          workMode: form.workMode,
          source: form.source,
          salaryMin: Number(form.salaryMin) || 0,
          salaryMax: Number(form.salaryMax) || 0,
          tags,
          nextStep: form.nextStep,
          notes: form.notes,
          contact,
          updatedAt: new Date().toISOString(),
          logo: editing.company !== form.company ? pickLogoColor(form.company) : editing.logo,
        },
      })
      if (editing.status !== form.status) {
        dispatch({ type: 'addTimeline', appId: editing.id, entry: { id: uid('tl'), at: new Date().toISOString(), type: 'status', text: `Status changed to ${STATUSES.find((s) => s.id === form.status)?.label}` } })
      }
      toast('Application updated')
      onClose()
      return
    }

    const id = uid('app')
    const now = new Date().toISOString()
    const app = {
      id,
      userId: currentUser.id,
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      priority: form.priority,
      appliedDate: form.appliedDate,
      createdAt: now,
      updatedAt: now,
      location: form.location,
      workMode: form.workMode,
      source: form.source,
      salaryMin: Number(form.salaryMin) || 0,
      salaryMax: Number(form.salaryMax) || 0,
      tags,
      starred: false,
      archived: false,
      logo: pickLogoColor(form.company),
      contact,
      nextStep: form.nextStep,
      notes: form.notes,
      interviews: [],
      timeline: [{ id: uid('tl'), at: now, type: 'created', text: `Added ${form.role.trim()} at ${form.company.trim()} to the tracker` }],
    }
    dispatch({ type: 'addApp', app, actorName: actorName || currentUser.name })

    if (form.createTask) {
      dispatch({
        type: 'addTask',
        task: { id: uid('tsk'), userId: currentUser.id, title: `Follow up with ${form.company.trim()} if silent for 5 days`, kind: 'Follow up', due: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), done: false, appId: id, priority: form.priority },
      })
    }
    toast(`${form.company.trim()} added to your pipeline`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit application' : 'New application'}
      subtitle={editing ? `${editing.company} · ${editing.role}` : 'Log a role you applied to — or one you are eyeing.'}
      icon={editing ? BriefcaseBusiness : Plus}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="dark" icon={Save} onClick={submit}>{editing ? 'Save changes' : 'Add application'}</Button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Company *">
            <Input value={form.company} onChange={set('company')} placeholder="Razorpay" autoFocus />
          </Field>
          <Field label="Role *">
            <Input value={form.role} onChange={set('role')} placeholder="Senior Frontend Engineer" />
          </Field>
        </div>

        <div className="grid g3" style={{ gap: 10 }}>
          <Field label="Stage">
            <Select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Applied on">
            <Input type="date" value={form.appliedDate} onChange={set('appliedDate')} />
          </Field>
        </div>

        <div className="grid g3" style={{ gap: 10 }}>
          <Field label="Source">
            <Select value={form.source} onChange={set('source')}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Work mode">
            <Select value={form.workMode} onChange={set('workMode')}>
              {WORK_MODES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Bengaluru" />
          </Field>
        </div>

        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Salary min (LPA)" hint={form.salaryMin ? fmtLPA(Number(form.salaryMin)) : 'annual CTC, in lakhs'}>
            <Input type="number" min="0" step="0.5" value={form.salaryMin} onChange={set('salaryMin')} placeholder="24" />
          </Field>
          <Field label="Salary max (LPA)" hint={form.salaryMax ? fmtLPA(Number(form.salaryMax)) : 'upper end of the band'}>
            <Input type="number" min="0" step="0.5" value={form.salaryMax} onChange={set('salaryMax')} placeholder="32" />
          </Field>
        </div>

        <Field label="Tags" hint="comma separated — react, fintech, remote">
          <Input value={form.tags} onChange={set('tags')} placeholder="react, fintech" />
        </Field>

        <Field label="Next step">
          <Input value={form.nextStep} onChange={set('nextStep')} placeholder="Send portfolio before Friday" />
        </Field>

        <div className="card" style={{ padding: 12, background: 'var(--paper)' }}>
          <span className="label">Recruiter / contact (optional)</span>
          <div className="grid g3" style={{ gap: 8, marginTop: 7 }}>
            <Input value={form.contactName} onChange={set('contactName')} placeholder="Nikhil Bansal" />
            <Input value={form.contactRole} onChange={set('contactRole')} placeholder="Talent Partner" />
            <Input type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="nikhil@co.com" />
          </div>
        </div>

        <Field label="Notes">
          <Textarea value={form.notes} onChange={set('notes')} placeholder="JD highlights, referral name, gut feel…" rows={3} />
        </Field>

        {!editing ? (
          <div className="row-between card" style={{ padding: '10px 12px' }}>
            <div>
              <div className="small strong">Auto-create a follow-up task</div>
              <div className="tiny dim">Queued in 5 days if nothing moves.</div>
            </div>
            <Switch checked={form.createTask} onChange={(v) => setForm((f) => ({ ...f, createTask: v }))} label="Auto create task" />
          </div>
        ) : null}

        {err ? <div className="banner banner-clay" style={{ padding: '8px 11px' }}>{err}</div> : null}
      </div>
    </Modal>
  )
}
