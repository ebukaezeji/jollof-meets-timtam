import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'

type Env = {
  FORM_DATA: KVNamespace
  CONTACT_EMAIL: string
  SITE_NAME: string
  ACCOUNT_ID: string
  SEND_EMAIL_TOKEN: string
  ADMIN_PASSWORD: string
}

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'PUT', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.options('*', (c) => c.text('', 204))

async function sendEmail(c: any, subject: string, html: string) {
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.ACCOUNT_ID}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.env.SEND_EMAIL_TOKEN}`,
        },
        body: JSON.stringify({
          from: { address: c.env.CONTACT_EMAIL, name: c.env.SITE_NAME },
          to: [{ address: c.env.CONTACT_EMAIL }],
          subject,
          html,
        }),
      }
    )
  } catch {
    // best-effort
  }
}

const DEFAULT_CONTENT = {
  hero: {
    heading1: 'Cultivating Global',
    heading2: 'Community',
    heading3: 'and Professional Growth in Australia.',
    subtitle: 'Bridging the boardroom and the lounge. We empower African-Australian professionals through high-impact networking, mentorship, and industry-leading opportunities.',
    cta1: 'Join the Network',
  },
  about: {
    heading: 'Our Strategic Pillars',
    card1: { title: 'Network Amplification', text: 'Access a powerhouse network of African heritage leaders across Australia. We facilitate meaningful connections that go beyond business cards.' },
    card2: { title: 'Mentorship', text: 'Structured peer-to-peer and executive mentorship programs designed to navigate the unique complexities of the Australian corporate landscape.' },
    card3: { title: 'Career Advancement', text: 'Curated job boards and professional development workshops focused on elevating your trajectory into executive leadership roles.' },
  },
  events: {
    label: 'Featured Series',
    heading: 'Quarterly Virtual',
    subtitle: 'Mixer Series',
    description: 'An exclusive, intimate gathering featuring global and domestic industry titans. Share insights, debate trends, and forge partnerships in a virtual lounge environment designed for high-level discourse.',
    feature1: 'Global Industry Titans',
    feature2: 'Domestic Executive Leaders',
    cta: 'View Upcoming Speakers',
  },
  join: {
    heading: 'Elevate Your Career — Join Us Today',
    subtitle: 'Apply for membership and unlock exclusive access to the network.',
    button: 'Submit Application',
  },
}

app.get('/content', async (c) => {
  const raw = await c.env.FORM_DATA.get('page_content')
  if (!raw) return c.json(DEFAULT_CONTENT)
  return c.json(JSON.parse(raw))
})

app.post('/admin/login', async (c) => {
  const { password } = await c.req.json()
  if (password === c.env.ADMIN_PASSWORD) {
    const token = btoa(`${c.env.ADMIN_PASSWORD}:${Date.now()}`)
    return c.json({ token })
  }
  return c.json({ error: 'Invalid password' }, 401)
})

app.put('/admin/content', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const decoded = atob(auth.slice(7))
  if (!decoded.startsWith(c.env.ADMIN_PASSWORD + ':')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const body = await c.req.json()
  await c.env.FORM_DATA.put('page_content', JSON.stringify(body))
  return c.json({ success: true })
})

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}

app.get('/admin/submissions', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const decoded = atob(auth.slice(7))
  if (!decoded.startsWith(c.env.ADMIN_PASSWORD + ':')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const list = await c.env.FORM_DATA.list({ prefix: 'join:' })
  const submissions: any[] = []
  for (const key of list.keys) {
    const raw = await c.env.FORM_DATA.get(key.name)
    if (raw) submissions.push(JSON.parse(raw))
  }
  submissions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  return c.json(submissions)
})

app.get('/admin/submissions/download', async (c) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const decoded = atob(auth.slice(7))
  if (!decoded.startsWith(c.env.ADMIN_PASSWORD + ':')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const list = await c.env.FORM_DATA.list({ prefix: 'join:' })
  const submissions: any[] = []
  for (const key of list.keys) {
    const raw = await c.env.FORM_DATA.get(key.name)
    if (raw) submissions.push(JSON.parse(raw))
  }
  submissions.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  const csv = [
    ['First Name','Last Name','Phone','State','Organisation','Job Title','Date'].join(','),
    ...submissions.map(s => [escapeCsv(s.firstName),escapeCsv(s.lastName),escapeCsv(s.phone||''),escapeCsv(s.state),escapeCsv(s.organisation||''),escapeCsv(s.jobTitle||''),escapeCsv(new Date(s.timestamp).toLocaleDateString('en-AU'))].join(',')),
  ].join('\n')
  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="jollof-meets-timtam-submissions.csv"',
    },
  })
})

app.post('/join', async (c) => {
  try {
    const body = await c.req.json()
    const { firstName, lastName, name, surname, phone, state, organisation, jobTitle } = body
    const first = firstName || name || ''
    const last = lastName || surname || ''
    if (!first || !last || !state) {
      return c.json({ message: 'First name, last name, and state are required.' }, 400)
    }
    const timestamp = Date.now()
    const key = `join:${timestamp}:${last}`
    await c.env.FORM_DATA.put(key, JSON.stringify({ firstName: first, lastName: last, phone, state, organisation, jobTitle, timestamp }))
    await sendEmail(c, `New registration: ${first} ${last}`, `<h2>New Event Registration</h2><table style="border-collapse:collapse;width:100%"><tr><td style="padding:8px;font-weight:600">Name</td><td style="padding:8px">${first} ${last}</td></tr><tr><td style="padding:8px;font-weight:600">Phone</td><td style="padding:8px">${phone || '-'}</td></tr><tr><td style="padding:8px;font-weight:600">State</td><td style="padding:8px">${state}</td></tr><tr><td style="padding:8px;font-weight:600">Organisation</td><td style="padding:8px">${organisation || '-'}</td></tr><tr><td style="padding:8px;font-weight:600">Job Title</td><td style="padding:8px">${jobTitle || '-'}</td></tr></table>`)
    return c.json({ success: true }, 201)
  } catch {
    return c.json({ message: 'Invalid request.' }, 400)
  }
})

export const onRequest = handle(app)
