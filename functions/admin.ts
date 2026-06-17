export async function onRequest(context: EventContext<Env, any, any>): Promise<Response> {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin - Jollof meets TimTam</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:#f8f9fa;color:#202124;padding:2rem}
h1{font-size:1.5rem;font-weight:700;margin-bottom:2rem}
.login{max-width:320px;margin:4rem auto;text-align:center}
.login input{width:100%;padding:.75rem;border:1px solid #dadce0;border-radius:8px;font-size:.9rem;outline:0;margin-bottom:1rem}
.login input:focus{border-color:#1a73e8}
.login button{width:100%;padding:.75rem;background:#1a1a1a;color:#fff;border:0;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer}
.login button:hover{background:#000}
.login .error{color:#d93025;font-size:.8rem;margin-top:.5rem}
.dashboard{display:none;max-width:960px;margin:0 auto}
.tabs{display:flex;gap:0;margin-bottom:2rem;border-bottom:2px solid #e8eaed}
.tab{padding:.75rem 1.5rem;cursor:pointer;font-size:.9rem;font-weight:500;color:#5f6368;border-bottom:2px solid transparent;margin-bottom:-2px;background:0;border-top:0;border-left:0;border-right:0}
.tab.active{color:#ffbf00;border-bottom-color:#ffbf00}
.tab:hover{color:#202124}
.tab-content{display:none}
.tab-content.active{display:block}
.section{margin-bottom:2rem}
.section h2{font-size:1.1rem;font-weight:600;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid #e8eaed}
.field{margin-bottom:1rem}
.field label{display:block;font-size:.8rem;font-weight:500;color:#5f6368;margin-bottom:.3rem}
.field input,.field textarea{width:100%;padding:.6rem;border:1px solid #dadce0;border-radius:6px;font-size:.85rem;font-family:Inter,sans-serif;outline:0}
.field textarea{resize:vertical;min-height:60px}
.field input:focus,.field textarea:focus{border-color:#ffbf00}
.actions{display:flex;gap:1rem;align-items:center;margin-top:2rem}
.actions button,.btn{padding:.75rem 2rem;background:#1a1a1a;color:#fff;border:0;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer}
.actions button:hover,.btn:hover{background:#000}
.actions button:disabled{opacity:.5;cursor:default}
.actions .status{font-size:.85rem;color:#1a1a1a}
.actions .error{color:#d93025}
.logout{background:0;border:0;color:#5f6368;font-size:.85rem;cursor:pointer;margin-left:auto;text-decoration:underline}
.submissions-toolbar{display:flex;gap:1rem;align-items:center;margin-bottom:1rem}
.submissions-toolbar .count{font-size:.85rem;color:#5f6368}
.submissions-table{width:100%;border-collapse:collapse;font-size:.82rem}
.submissions-table th{text-align:left;padding:.6rem .5rem;border-bottom:2px solid #e8eaed;color:#5f6368;font-weight:600;white-space:nowrap}
.submissions-table td{padding:.6rem .5rem;border-bottom:1px solid #e8eaed;white-space:nowrap}
.submissions-table tr:hover td{background:#f1f3f4}
.submissions-table .date{color:#5f6368;font-size:.78rem}
.loading{text-align:center;color:#5f6368;padding:3rem 0}
</style>
</head>
<body>
<div class="login" id="loginView">
  <h1>Admin Login</h1>
  <input type="password" id="password" placeholder="Enter password" autofocus>
  <button onclick="login()">Sign in</button>
  <p class="error" id="loginError"></p>
</div>
<div class="dashboard" id="dashboardView">
  <div style="display:flex;align-items:center;margin-bottom:1.5rem">
    <h1 style="margin-bottom:0">Admin</h1>
    <button class="logout" onclick="logout()">Logout</button>
  </div>
  <div class="tabs">
    <button class="tab active" data-tab="content" onclick="switchTab('content')">Page Content</button>
    <button class="tab" data-tab="submissions" onclick="switchTab('submissions')">Submissions</button>
  </div>
  <div class="tab-content active" id="tabContent">
    <form id="contentForm"></form>
    <div class="actions">
      <button id="saveBtn" onclick="save()">Save</button>
      <span id="saveStatus"></span>
    </div>
  </div>
  <div class="tab-content" id="tabSubmissions">
    <div class="submissions-toolbar">
      <button class="btn" onclick="downloadSubmissions()">Download as Excel</button>
      <span class="count" id="submissionCount"></span>
    </div>
    <table class="submissions-table">
      <thead><tr>
        <th>First Name</th><th>Last Name</th><th>Phone</th><th>State</th><th>Organisation</th><th>Job Title</th><th>Date</th>
      </tr></thead>
      <tbody id="submissionsBody">
        <tr><td colspan="7" class="loading">Loading...</td></tr>
      </tbody>
    </table>
  </div>
</div>
<script>
let token = localStorage.getItem('admin_token')

async function login() {
  const pwd = document.getElementById('password').value
  const err = document.getElementById('loginError')
  try {
    const r = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})})
    const d = await r.json()
    if (!r.ok) { err.textContent = d.error || 'Invalid password'; return }
    token = d.token
    localStorage.setItem('admin_token', token)
    showDashboard()
  } catch { err.textContent = 'Network error' }
}

async function showDashboard() {
  document.getElementById('loginView').style.display='none'
  document.getElementById('dashboardView').style.display='block'
  try {
    const r = await fetch('/api/content')
    const content = await r.json()
    buildForm(content)
  } catch { alert('Failed to load content') }
}

function buildForm(content) {
  const form = document.getElementById('contentForm')
  form.innerHTML = ''
  const sections = [
    {key:'hero',label:'Hero Section',fields:{heading1:'Line 1',heading2:'Line 2 (Amber)',heading3:'Line 3',subtitle:'Subtitle',cta1:'Button Text'}},
    {key:'about',label:'About Section',fields:{heading:'Heading','card1.title':'Card 1 Title','card1.text':'Card 1 Text','card2.title':'Card 2 Title','card2.text':'Card 2 Text','card3.title':'Card 3 Title','card3.text':'Card 3 Text'}},
    {key:'events',label:'Events Section',fields:{label:'Section Label',heading:'Heading Line 1',subtitle:'Heading Line 2 (Amber)',description:'Description',feature1:'Tag 1',feature2:'Tag 2',cta:'Button Text'}},
    {key:'join',label:'Join Section',fields:{heading:'Heading',subtitle:'Subtitle',button:'Button Text'}}
  ]
  const inputs = {}
  sections.forEach(s => {
    const div = document.createElement('div')
    div.className = 'section'
    div.innerHTML = '<h2>' + s.label + '</h2>'
    Object.entries(s.fields).forEach(([key, label]) => {
      const val = key.split('.').reduce((o,k)=>o?.[k], content[s.key])
      const isTextarea = val && val.length > 80
      const el = document.createElement('div')
      el.className = 'field'
      el.innerHTML = '<label>' + label + '</label>' + (isTextarea ? '<textarea id="i-' + s.key + '-' + key.replace('.','-') + '">' + (val||'') + '</textarea>' : '<input id="i-' + s.key + '-' + key.replace('.','-') + '" value="' + (val||'') + '">')
      div.appendChild(el)
      inputs[s.key + '.' + key] = 'i-' + s.key + '-' + key.replace('.','-')
    })
    form.appendChild(div)
  })
  window._inputs = inputs
}

async function save() {
  const btn = document.getElementById('saveBtn')
  const status = document.getElementById('saveStatus')
  btn.disabled = true
  status.textContent = 'Saving...'
  status.className = 'status'
  try {
    const r = await fetch('/api/content')
    const content = await r.json()
    Object.entries(window._inputs).forEach(([path, id]) => {
      const el = document.getElementById(id)
      if (!el) return
      const keys = path.split('.')
      let obj = content
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = el.value
    })
    const res = await fetch('/api/admin/content',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer ' + token},body:JSON.stringify(content)})
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
    status.textContent = 'Saved! Changes reflect on reload.'
    status.className = 'status'
  } catch(e) {
    status.textContent = e.message || 'Error saving'
    status.className = 'error'
  }
  btn.disabled = false
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name))
  document.getElementById('tabContent').classList.toggle('active', name === 'content')
  document.getElementById('tabSubmissions').classList.toggle('active', name === 'submissions')
  if (name === 'submissions') loadSubmissions()
}

async function loadSubmissions() {
  const tbody = document.getElementById('submissionsBody')
  try {
    const r = await fetch('/api/admin/submissions',{headers:{'Authorization':'Bearer '+token}})
    if (!r.ok) throw new Error('Failed to load')
    const data = await r.json()
    document.getElementById('submissionCount').textContent = data.length + ' submission' + (data.length !== 1 ? 's' : '')
    tbody.innerHTML = data.length ? data.map(s =>
      '<tr><td>' + esc(s.firstName) + '</td><td>' + esc(s.lastName) + '</td><td>' + esc(s.phone||'-') + '</td><td>' + esc(s.state) + '</td><td>' + esc(s.organisation||'-') + '</td><td>' + esc(s.jobTitle||'-') + '</td><td class="date">' + esc(new Date(s.timestamp).toLocaleDateString('en-AU')) + '</td></tr>'
    ).join('') : '<tr><td colspan="7" class="loading">No submissions yet</td></tr>'
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="loading" style="color:#d93025">Failed to load submissions</td></tr>'
  }
}

async function downloadSubmissions() {
  try {
    const r = await fetch('/api/admin/submissions/download',{headers:{'Authorization':'Bearer '+token}})
    if (!r.ok) throw new Error('Failed')
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jollof-meets-timtam-submissions.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch { alert('Failed to download') }
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function logout() {
  localStorage.removeItem('admin_token')
  token = null
  document.getElementById('dashboardView').style.display='none'
  document.getElementById('loginView').style.display='block'
  document.getElementById('password').value = ''
}

if (token) showDashboard()
</script>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
