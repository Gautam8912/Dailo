import { daysAgo, daysFromNow } from './format.js'

/* ---------------------------------------------------------------------------
   Demo data. Everything is generated relative to "today" so the product always
   looks alive: fresh applications, upcoming interviews, due tasks.
   Passwords are demo-only and never represent real authentication.
--------------------------------------------------------------------------- */

export const DEMO_PASSWORD = 'demo1234'
export const DEMO_ADMIN_PASSWORD = 'admin1234'

const nowISO = () => new Date().toISOString()
const at = (days, hour = 10, min = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

let counter = 0
const nid = (p) => `${p}_${(counter += 1).toString().padStart(4, '0')}`

const COLORS = [
  { bg: '#191714', fg: '#f6efe2' },
  { bg: '#b4552d', fg: '#fff3ec' },
  { bg: '#40624a', fg: '#eaf3e7' },
  { bg: '#c99a2e', fg: '#2b210a' },
  { bg: '#3f5068', fg: '#eaf0f8' },
  { bg: '#6c4b6e', fg: '#f6e9f6' },
  { bg: '#a33a3a', fg: '#fdeeee' },
]

const S = {
  wishlist: 'wishlist',
  applied: 'applied',
  screening: 'screening',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
}

/**
 * Compact application factory.
 * applied = days ago (negative means the application is older)
 */
function app({ user, company, role, status, applied, place, mode, source, min, max, tags = [], priority = 'medium', contact, next = '', starred = false, interviews = [], notes = '' }) {
  const color = COLORS[Math.abs(company.length + company.charCodeAt(0)) % COLORS.length]
  const timeline = [
    { id: nid('tl'), at: at(-applied, 11, 20), type: 'created', text: `Added ${role} at ${company} to the tracker` },
  ]
  if (status !== S.wishlist) {
    timeline.push({ id: nid('tl'), at: at(-applied, 12, 5), type: 'status', text: `Marked as Applied via ${source}` })
  }
  if ([S.screening, S.interview, S.offer, S.rejected].includes(status)) {
    timeline.push({ id: nid('tl'), at: at(-Math.max(1, Math.round(applied * 0.45)), 16, 30), type: 'status', text: 'Recruiter reached out — moved to Screening' })
  }
  if ([S.interview, S.offer, S.rejected].includes(status)) {
    timeline.push({ id: nid('tl'), at: at(-Math.max(1, Math.round(applied * 0.25)), 18, 0), type: 'interview', text: 'Technical round scheduled with the hiring team' })
  }
  if (status === S.offer) {
    timeline.push({ id: nid('tl'), at: at(-2, 15, 10), type: 'status', text: 'Offer received 🎉 — reviewing compensation' })
  }
  if (status === S.rejected) {
    timeline.push({ id: nid('tl'), at: at(-Math.max(1, Math.round(applied * 0.15)), 9, 45), type: 'status', text: 'Rejected — role closed / not moving forward' })
  }

  return {
    id: nid('app'),
    userId: user,
    company,
    role,
    status,
    priority,
    appliedDate: daysAgo(applied),
    createdAt: at(-applied, 11, 20),
    updatedAt: timeline[timeline.length - 1].at,
    location: place,
    workMode: mode,
    source,
    salaryMin: min,
    salaryMax: max,
    tags,
    starred,
    archived: false,
    logo: color,
    contact: contact ?? null,
    nextStep: next,
    notes,
    interviews,
    timeline,
  }
}

const interview = ({ stage, date, time, mode = 'Video', withWho = '', notes = '' }) => ({
  id: nid('int'),
  stage,
  date,
  time,
  mode,
  withWho,
  notes,
  done: new Date(`${date}T${time || '00:00'}`).getTime() < Date.now(),
})

export function buildSeed() {
  counter = 0
  const users = [
    {
      id: 'usr_aarav',
      name: 'Aarav Mehta',
      email: 'aarav@hiretrail.app',
      role: 'user',
      title: 'Frontend Engineer',
      location: 'Bengaluru, IN',
      phone: '+91 98765 43210',
      goal: 8,
      status: 'active',
      joinedAt: at(-96, 10, 0),
      lastActive: at(-0, 9, 12),
      plan: 'Pro',
      avatarColor: '#191714',
      bio: 'React + TypeScript engineer, 3 years in. Currently interviewing for product-led teams.',
      resumes: [
        { id: 'res_1', name: 'Aarav_Frontend_2026.pdf', target: 'Frontend Engineer', size: '184 KB', updatedAt: at(-12), primary: true },
        { id: 'res_2', name: 'Aarav_FullStack_2026.pdf', target: 'Full-stack Engineer', size: '201 KB', updatedAt: at(-40), primary: false },
      ],
    },
    {
      id: 'usr_priya',
      name: 'Priya Sharma',
      email: 'priya@hiretrail.app',
      role: 'user',
      title: 'Product Designer',
      location: 'Pune, IN',
      phone: '+91 91234 56789',
      goal: 5,
      status: 'active',
      joinedAt: at(-54, 14, 30),
      lastActive: at(-1, 20, 5),
      plan: 'Free',
      avatarColor: '#6c4b6e',
      bio: 'Design systems, motion and a soft spot for fintech.',
      resumes: [{ id: 'res_3', name: 'Priya_ProductDesign.pdf', target: 'Product Designer', size: '2.1 MB', updatedAt: at(-6), primary: true }],
    },
    {
      id: 'usr_rohan',
      name: 'Rohan Verma',
      email: 'rohan@hiretrail.app',
      role: 'user',
      title: 'Backend Engineer',
      location: 'Hyderabad, IN',
      phone: '+91 99887 76655',
      goal: 6,
      status: 'active',
      joinedAt: at(-21, 9, 5),
      lastActive: at(-3, 18, 40),
      plan: 'Free',
      avatarColor: '#40624a',
      bio: 'Node, Go and a lot of Postgres. Looking for platform roles.',
      resumes: [{ id: 'res_4', name: 'Rohan_Backend.pdf', target: 'Backend Engineer', size: '156 KB', updatedAt: at(-21), primary: true }],
    },
    {
      id: 'usr_meera',
      name: 'Meera Iyer',
      email: 'meera@hiretrail.app',
      role: 'user',
      title: 'Data Analyst',
      location: 'Chennai, IN',
      phone: '+91 90909 80808',
      goal: 4,
      status: 'suspended',
      joinedAt: at(-8, 17, 10),
      lastActive: at(-6, 11, 0),
      plan: 'Free',
      avatarColor: '#a33a3a',
      bio: 'SQL, dashboards, experimentation.',
      resumes: [],
    },
  ]

  const admins = [
    {
      id: 'adm_1',
      name: 'Devon Rao',
      email: 'admin@hiretrail.app',
      role: 'admin',
      title: 'Platform Admin',
      status: 'active',
      avatarColor: '#b4552d',
      scope: 'Super admin',
      joinedAt: at(-220, 10, 0),
    },
  ]

  const applications = [
    /* ------------------------------------------------ Aarav (primary demo) */
    app({ user: 'usr_aarav', company: 'Razorpay', role: 'Senior Frontend Engineer', status: S.interview, applied: 24, place: 'Bengaluru', mode: 'Hybrid', source: 'LinkedIn', min: 28, max: 36, tags: ['react', 'fintech'], priority: 'high', starred: true, next: 'System design round on Thursday', contact: { name: 'Nikhil Bansal', role: 'Talent Partner', email: 'nikhil@razorpay.com' }, notes: 'Team works on checkout surfaces. Recruiter mentioned a design-heavy round.', interviews: [interview({ stage: 'Technical', date: daysAgo(9), time: '11:00', withWho: 'Rahul K.', notes: 'Deep dive on rendering and state. Went well.' }), interview({ stage: 'System design', date: daysFromNow(2), time: '15:30', withWho: 'Staff panel', notes: 'Bring a whiteboard outline for a dashboard app.' })] }),
    app({ user: 'usr_aarav', company: 'Zerodha', role: 'Frontend Engineer II', status: S.screening, applied: 15, place: 'Bengaluru', mode: 'On-site', source: 'Company site', min: 24, max: 30, tags: ['react', 'trading'], priority: 'high', starred: true, next: 'Send portfolio + salary expectation', contact: { name: 'Ananya G', role: 'Recruiter', email: 'ananya@zerodha.com' }, notes: 'Very small product team. They care about performance budgets.' }),
    app({ user: 'usr_aarav', company: 'Postman', role: 'Frontend Engineer', status: S.offer, applied: 41, place: 'Remote', mode: 'Remote', source: 'Referral', min: 30, max: 38, tags: ['typescript', 'remote'], priority: 'high', starred: true, next: 'Decide by Monday', notes: 'Offer: ₹32L base + ESOPs. Referral from Karan.', interviews: [interview({ stage: 'Take-home', date: daysAgo(28), time: '10:00', mode: 'Async', notes: 'Built a mini API client UI.' }), interview({ stage: 'Manager round', date: daysAgo(16), time: '16:00', withWho: 'Eng Manager', notes: 'Great conversation about ownership.' })] }),
    app({ user: 'usr_aarav', company: 'CRED', role: 'UI Engineer', status: S.interview, applied: 19, place: 'Bengaluru', mode: 'On-site', source: 'Instahyre', min: 26, max: 34, tags: ['design-eng', 'motion'], priority: 'high', next: 'Take-home due Sunday', contact: { name: 'Shruti M', role: 'Design Recruiter', email: 'shruti@cred.club' }, notes: 'Design-engineering hybrid role. Motion samples matter.' }),
    app({ user: 'usr_aarav', company: 'Groww', role: 'SDE II — Web', status: S.applied, applied: 6, place: 'Bengaluru', mode: 'Hybrid', source: 'Naukri', min: 22, max: 28, tags: ['react'], priority: 'medium', next: 'Follow up after 5 days' }),
    app({ user: 'usr_aarav', company: 'Swiggy', role: 'Frontend Engineer', status: S.rejected, applied: 33, place: 'Bengaluru', mode: 'Hybrid', source: 'LinkedIn', min: 20, max: 26, tags: ['react'], priority: 'medium', notes: 'Rejected after the first technical round — strong candidate pool.' }),
    app({ user: 'usr_aarav', company: 'Atlassian', role: 'Frontend Developer', status: S.applied, applied: 4, place: 'Remote', mode: 'Remote', source: 'Company site', min: 34, max: 44, tags: ['react', 'remote'], priority: 'high' }),
    app({ user: 'usr_aarav', company: 'Meesho', role: 'Senior Software Engineer', status: S.screening, applied: 11, place: 'Bengaluru', mode: 'Hybrid', source: 'Referral', min: 25, max: 32, tags: ['react', 'growth'], priority: 'medium' }),
    app({ user: 'usr_aarav', company: 'PhonePe', role: 'Frontend Engineer', status: S.applied, applied: 9, place: 'Bengaluru', mode: 'On-site', source: 'LinkedIn', min: 22, max: 30, tags: ['fintech'], priority: 'medium' }),
    app({ user: 'usr_aarav', company: 'Freshworks', role: 'Lead Frontend Engineer', status: S.wishlist, applied: 1, place: 'Chennai', mode: 'Hybrid', source: 'Company site', min: 28, max: 38, tags: ['saas'], priority: 'medium', starred: true }),
    app({ user: 'usr_aarav', company: 'Figma', role: 'Product Engineer', status: S.wishlist, applied: 0, place: 'Remote', mode: 'Remote', source: 'Wellfound', min: 40, max: 55, tags: ['design-eng', 'remote'], priority: 'high' }),
    app({ user: 'usr_aarav', company: 'Dream11', role: 'Frontend Engineer', status: S.interview, applied: 27, place: 'Mumbai', mode: 'On-site', source: 'Naukri', min: 24, max: 31, tags: ['react', 'scale'], priority: 'medium', next: 'HR round Friday', contact: { name: 'Aditya P', role: 'HR', email: 'aditya@dream11.com' } }),
    app({ user: 'usr_aarav', company: 'BrowserStack', role: 'Frontend Engineer', status: S.rejected, applied: 46, place: 'Remote', mode: 'Remote', source: 'Referral', min: 26, max: 34, tags: ['remote', 'devtools'], priority: 'low' }),
    app({ user: 'usr_aarav', company: 'Zepto', role: 'Frontend Engineer', status: S.offer, applied: 37, place: 'Bengaluru', mode: 'On-site', source: 'LinkedIn', min: 26, max: 32, tags: ['react', 'quick-commerce'], priority: 'medium', notes: 'Lower than Postman but a great team.', next: 'Negotiating notice period' }),
    app({ user: 'usr_aarav', company: 'Hasura', role: 'Software Engineer, Console', status: S.applied, applied: 2, place: 'Remote', mode: 'Remote', source: 'Company site', min: 28, max: 36, tags: ['graphql', 'remote'], priority: 'low' }),
    app({ user: 'usr_aarav', company: 'Jupiter', role: 'Frontend Engineer', status: S.screening, applied: 13, place: 'Bengaluru', mode: 'Hybrid', source: 'Instahyre', min: 21, max: 27, tags: ['fintech'], priority: 'low' }),
    app({ user: 'usr_aarav', company: 'Zomato', role: 'Web Engineer', status: S.rejected, applied: 52, place: 'Gurugram', mode: 'Hybrid', source: 'LinkedIn', min: 20, max: 28, tags: ['react'], priority: 'low' }),
    app({ user: 'usr_aarav', company: 'Notion', role: 'Frontend Engineer, India', status: S.wishlist, applied: 0, place: 'Remote', mode: 'Remote', source: 'Cold email', min: 38, max: 48, tags: ['remote', 'product'], priority: 'high', starred: true }),
    app({ user: 'usr_aarav', company: 'Flipkart', role: 'UI Engineer II', status: S.interview, applied: 22, place: 'Bengaluru', mode: 'On-site', source: 'Campus', min: 24, max: 30, tags: ['react', 'ecommerce'], priority: 'medium', next: 'Coding round tomorrow 10 AM' }),
    app({ user: 'usr_aarav', company: 'Darwinbox', role: 'Senior Frontend Engineer', status: S.applied, applied: 7, place: 'Hyderabad', mode: 'Hybrid', source: 'Naukri', min: 22, max: 29, tags: ['enterprise'], priority: 'low' }),

    /* ------------------------------------------------ Priya */
    app({ user: 'usr_priya', company: 'Zerodha', role: 'Product Designer', status: S.interview, applied: 18, place: 'Bengaluru', mode: 'On-site', source: 'Referral', min: 20, max: 28, tags: ['fintech', 'systems'], priority: 'high', starred: true, next: 'Portfolio review Thursday' }),
    app({ user: 'usr_priya', company: 'CRED', role: 'Senior Product Designer', status: S.screening, applied: 10, place: 'Bengaluru', mode: 'Hybrid', source: 'Wellfound', min: 24, max: 32, tags: ['motion'], priority: 'high' }),
    app({ user: 'usr_priya', company: 'Figma', role: 'Product Designer', status: S.wishlist, applied: 2, place: 'Remote', mode: 'Remote', source: 'Company site', min: 32, max: 42, tags: ['remote'], priority: 'medium', starred: true }),
    app({ user: 'usr_priya', company: 'Razorpay', role: 'Product Designer II', status: S.applied, applied: 5, place: 'Bengaluru', mode: 'Hybrid', source: 'LinkedIn', min: 22, max: 30, tags: ['fintech'], priority: 'medium' }),
    app({ user: 'usr_priya', company: 'Swiggy', role: 'Design Lead', status: S.rejected, applied: 29, place: 'Bengaluru', mode: 'Hybrid', source: 'LinkedIn', min: 26, max: 34, tags: ['design-lead'], priority: 'low' }),
    app({ user: 'usr_priya', company: 'Meesho', role: 'Product Designer', status: S.applied, applied: 8, place: 'Bengaluru', mode: 'Hybrid', source: 'Naukri', min: 18, max: 24, tags: ['ecommerce'], priority: 'low' }),
    app({ user: 'usr_priya', company: 'Groww', role: 'UX Designer', status: S.offer, applied: 34, place: 'Bengaluru', mode: 'On-site', source: 'Referral', min: 21, max: 27, tags: ['fintech'], priority: 'high', next: 'Respond to offer by Friday' }),
    app({ user: 'usr_priya', company: 'Postman', role: 'Product Designer', status: S.screening, applied: 12, place: 'Remote', mode: 'Remote', source: 'Company site', min: 25, max: 33, tags: ['devtools', 'remote'], priority: 'medium' }),

    /* ------------------------------------------------ Rohan */
    app({ user: 'usr_rohan', company: 'PhonePe', role: 'Backend Engineer', status: S.interview, applied: 16, place: 'Bengaluru', mode: 'On-site', source: 'LinkedIn', min: 22, max: 30, tags: ['java', 'payments'], priority: 'high', next: 'System design round Monday' }),
    app({ user: 'usr_rohan', company: 'Razorpay', role: 'Software Engineer — Platform', status: S.applied, applied: 3, place: 'Bengaluru', mode: 'Hybrid', source: 'Referral', min: 24, max: 32, tags: ['golang'], priority: 'high' }),
    app({ user: 'usr_rohan', company: 'Zepto', role: 'Backend Engineer II', status: S.screening, applied: 9, place: 'Bengaluru', mode: 'On-site', source: 'Naukri', min: 20, max: 27, tags: ['node'], priority: 'medium' }),
    app({ user: 'usr_rohan', company: 'Hasura', role: 'Backend Engineer', status: S.wishlist, applied: 1, place: 'Remote', mode: 'Remote', source: 'Wellfound', min: 26, max: 34, tags: ['graphql', 'remote'], priority: 'medium' }),
    app({ user: 'usr_rohan', company: 'Freshworks', role: 'Senior Backend Engineer', status: S.rejected, applied: 25, place: 'Chennai', mode: 'Hybrid', source: 'Company site', min: 21, max: 29, tags: ['ruby'], priority: 'low' }),
    app({ user: 'usr_rohan', company: 'Atlassian', role: 'Backend Developer', status: S.applied, applied: 6, place: 'Remote', mode: 'Remote', source: 'LinkedIn', min: 30, max: 40, tags: ['remote'], priority: 'medium' }),
  ]

  const tasks = [
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Send portfolio to Zerodha recruiter', kind: 'Send docs', due: daysFromNow(0), done: false, appId: applications[1].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Prep system design — Razorpay dashboard', kind: 'Prep', due: daysFromNow(1), done: false, appId: applications[0].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Follow up with Groww (5 days silent)', kind: 'Follow up', due: daysFromNow(1), done: false, appId: applications[4].id, priority: 'medium' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Finish CRED take-home', kind: 'Other', due: daysFromNow(2), done: false, appId: applications[3].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Thank-you note to Dream11 panel', kind: 'Thank you note', due: daysAgo(1), done: false, appId: applications[11].id, priority: 'medium' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Compare Postman vs Zepto offers', kind: 'Research', due: daysFromNow(3), done: false, appId: applications[2].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Update resume with take-home project', kind: 'Send docs', due: daysAgo(2), done: true, appId: applications[0].id, priority: 'low' },
    { id: nid('tsk'), userId: 'usr_aarav', title: 'Apply to 3 remote-first product teams', kind: 'Research', due: daysAgo(3), done: true, appId: null, priority: 'medium' },
    { id: nid('tsk'), userId: 'usr_priya', title: 'Refresh case study deck for Zerodha', kind: 'Prep', due: daysFromNow(1), done: false, appId: applications[20].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_priya', title: 'Reply to Groww offer email', kind: 'Follow up', due: daysFromNow(2), done: false, appId: applications[26].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_rohan', title: 'Revise Postgres indexing notes', kind: 'Prep', due: daysFromNow(1), done: false, appId: applications[28].id, priority: 'high' },
    { id: nid('tsk'), userId: 'usr_rohan', title: 'Ask referral for Razorpay status', kind: 'Follow up', due: daysAgo(1), done: false, appId: applications[29].id, priority: 'medium' },
  ]

  const notifications = [
    { id: nid('ntf'), userId: 'usr_aarav', kind: 'interview', title: 'Razorpay — System design round', body: 'Thursday 3:30 PM with the staff panel. Prep the dashboard outline.', at: at(-1, 9, 30), read: false, link: '/app/calendar' },
    { id: nid('ntf'), userId: 'usr_aarav', kind: 'task', title: '2 tasks due today', body: 'Zerodha portfolio + Groww follow up are waiting for you.', at: at(-0, 8, 15), read: false, link: '/app/tasks' },
    { id: nid('ntf'), userId: 'usr_aarav', kind: 'system', title: 'Weekly digest is on', body: 'You will get a Sunday summary of your pipeline.', at: at(-4, 18, 0), read: true, link: '/app/settings' },
    { id: nid('ntf'), userId: 'usr_priya', kind: 'system', title: 'New templates available', body: 'Follow-up templates for design roles were added.', at: at(-2, 12, 0), read: false, link: '/app/notifications' },
    { id: nid('ntf'), userId: 'usr_rohan', kind: 'interview', title: 'PhonePe — System design', body: 'Monday 11:00 AM, on-site. Bring printed resume.', at: at(-1, 17, 20), read: false, link: '/app/calendar' },
  ]

  const activity = [
    { id: nid('act'), at: at(-0, 9, 12), userId: 'usr_aarav', type: 'login', text: 'Aarav signed in' },
    { id: nid('act'), at: at(-0, 8, 15), userId: 'usr_aarav', type: 'task', text: 'Aarav completed “Update resume with take-home project”' },
    { id: nid('act'), at: at(-1, 16, 40), userId: 'usr_priya', type: 'app', text: 'Priya moved Zerodha to Interviewing' },
    { id: nid('act'), at: at(-1, 11, 5), userId: 'usr_rohan', type: 'app', text: 'Rohan added Atlassian — Backend Developer' },
    { id: nid('act'), at: at(-2, 15, 10), userId: 'usr_aarav', type: 'app', text: 'Aarav received an offer from Postman' },
    { id: nid('act'), at: at(-2, 10, 0), userId: 'usr_priya', type: 'app', text: 'Priya added Figma to wishlist' },
    { id: nid('act'), at: at(-3, 19, 30), userId: 'usr_rohan', type: 'task', text: 'Rohan ticked “Polish backend take-home”' },
    { id: nid('act'), at: at(-4, 18, 0), userId: 'usr_aarav', type: 'system', text: 'Weekly digest sent to 3 users' },
  ]

  const broadcasts = [
    { id: nid('bc'), title: 'Weekly digest templates', body: 'Follow-up and thank-you templates now support variables like {{company}}.', audience: 'all', at: at(-5, 12, 0), sentBy: 'adm_1', recipients: 4 },
    { id: nid('bc'), title: 'Scheduled maintenance', body: 'Reports will be read-only on Sunday 2–3 AM IST.', audience: 'pro', at: at(-12, 9, 0), sentBy: 'adm_1', recipients: 2 },
  ]

  const settings = {
    siteName: 'Hiretrail',
    tagline: 'Every application, one clear trail.',
    allowSignups: true,
    digestDay: 'sunday',
    maintenance: false,
    defaultGoal: 5,
    supportEmail: 'support@hiretrail.app',
  }

  return { users, admins, applications, tasks, notifications, activity, broadcasts, settings }
}

export const seedMeta = { nowISO, at }
