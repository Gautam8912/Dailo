export const STATUSES = [
  { id: 'wishlist', label: 'Wishlist', tone: 'slate', color: '#3f5068', bg: '#dde4ee', order: 0 },
  { id: 'applied', label: 'Applied', tone: 'mustard', color: '#8d6a13', bg: '#f6ead0', order: 1 },
  { id: 'screening', label: 'Screening', tone: 'plum', color: '#5a3b5c', bg: '#ece0ec', order: 2 },
  { id: 'interview', label: 'Interviewing', tone: 'clay', color: '#8e3f1d', bg: '#f3e0d5', order: 3 },
  { id: 'offer', label: 'Offer', tone: 'moss', color: '#35523e', bg: '#dfe8dd', order: 4 },
  { id: 'rejected', label: 'Rejected', tone: 'cherry', color: '#8a2d2d', bg: '#f4dcdc', order: 5 },
]

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

export const ACTIVE_STATUSES = ['applied', 'screening', 'interview', 'offer']

export const SOURCES = [
  'LinkedIn',
  'Naukri',
  'Wellfound',
  'Company site',
  'Referral',
  'Instahyre',
  'Cold email',
  'Campus',
]

export const WORK_MODES = ['Remote', 'Hybrid', 'On-site']

export const PRIORITIES = [
  { id: 'high', label: 'High', tone: 'clay' },
  { id: 'medium', label: 'Medium', tone: 'mustard' },
  { id: 'low', label: 'Low', tone: 'slate' },
]

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]))

export const INTERVIEW_TYPES = ['Phone screen', 'Technical', 'System design', 'Take-home', 'Manager round', 'HR round', 'Culture fit']

export const LOGO_COLORS = [
  { bg: '#191714', fg: '#f6efe2' },
  { bg: '#b4552d', fg: '#fff3ec' },
  { bg: '#40624a', fg: '#eaf3e7' },
  { bg: '#c99a2e', fg: '#2b210a' },
  { bg: '#3f5068', fg: '#eaf0f8' },
  { bg: '#6c4b6e', fg: '#f6e9f6' },
  { bg: '#a33a3a', fg: '#fdeeee' },
  { bg: '#dfe4d0', fg: '#2f3626' },
]

export const TASK_KINDS = ['Follow up', 'Prep', 'Send docs', 'Thank you note', 'Research', 'Other']
