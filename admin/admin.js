/* Kerala Lottery — Supabase Admin Panel */

const CODES = ['KR','NR','WW','AK','KN','SS','FF','BM'];
const CATS  = [
  {c:'1st Prize',r:1},{c:'2nd Prize',r:2},{c:'3rd Prize',r:3},
  {c:'Consolation',r:4},{c:'4th Prize',r:5},{c:'5th Prize',r:6}
];
let editDrawId=null, editWinnerId=null, prizeRows=[];
let dSearch='', dStatus='', dPage=1, wSearch='';

// ── Auth guard ───────────────────────────────────────────
if (!sessionStorage.getItem('kl_admin')) {
  window.location.href = 'login.html';
}

function logout() {
  sessionStorage.removeItem('kl_admin');
  window.location.href = 'login.html';
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check Supabase config
  if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
    document.getElementById('mainContent').innerHTML = `
      <div class="page">
        <div style="background:rgba(245,200,66,.08);border:1.5px solid rgba(245,200,66,.4);
          border-radius:14px;padding:32px;max-width:600px;margin:40px auto;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:16px">⚙️</div>
          <h2 style="color:var(--gold);margin-bottom:12px">Supabase Not Configured</h2>
          <p style="color:var(--text2);line-height:1.7;margin-bottom:20px">
            Open <strong style="color:#e8f5e9">supabase-config.js</strong> and add your
            Supabase Project URL and anon key.<br/><br/>
            Then run the SQL from that file in your Supabase dashboard to create the tables.
          </p>
          <a href="https://supabase.com" target="_blank"
            style="background:linear-gradient(135deg,var(--gold),var(--gold-d));color:#030f0a;
            font-weight:800;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:.9rem">
            Open Supabase →
          </a>
        </div>
      </div>`;
    return;
  }

  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.page); });
  });
  go('dashboard');
});

// ── Router ───────────────────────────────────────────────
function go(page) {
  document.querySelectorAll('.nav-item').forEach(a =>
    a.classList.toggle('active', a.dataset.page === page));
  const titles = { dashboard:'Dashboard', draws:'Manage Results', winners:'Winners', settings:'Settings' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '<div class="page"><div class="empty"><div class="empty-i">⏳</div>Loading…</div></div>';
  if (page === 'dashboard') pageDashboard();
  else if (page === 'draws')   pageDraws();
  else if (page === 'winners') pageWinners();
  else if (page === 'settings') pageSettings();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── Toast ────────────────────────────────────────────────
function toast(msg, type='i') {
  const b = document.getElementById('toastBox');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  b.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════
async function pageDashboard() {
  try {
    const db = getDB();
    const d  = await db.getStats();
    document.getElementById('mainContent').innerHTML = `
    <div class="page">
      <div class="ph"><h2>Dashboard</h2><span class="tm" style="font-size:.82rem">Supabase connected ✅</span></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-top"><span class="stat-icon">📋</span><span class="badge badge-g">Today</span></div><div class="stat-val">${d.todayPublished}</div><div class="stat-lbl">Results Published</div></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-icon">🎫</span><span class="badge badge-b">Total</span></div><div class="stat-val">${d.totalTickets}</div><div class="stat-lbl">Winning Tickets</div></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-icon">🗓️</span><span class="badge badge-gold">All Time</span></div><div class="stat-val">${d.totalDraws}</div><div class="stat-lbl">Total Draws</div></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-icon">🏆</span><span class="badge badge-gold">Jackpot</span></div><div class="stat-val" style="font-size:1.1rem">${d.jackpot}</div><div class="stat-lbl">Latest 1st Prize</div></div>
      </div>
      <div class="gc">
        <div class="gc-head"><span class="gc-title">Recent Activity</span><button class="bo bsm" onclick="go('draws')">View All</button></div>
        <div class="gc-body">
          ${d.recent.length ? d.recent.map(r => `
            <div class="act-item">
              <div class="act-dot" style="background:${r.status==='published'?'var(--neon)':r.status==='live'?'var(--red)':'var(--gold)'}"></div>
              <div class="act-text"><strong>${r.draw_name} ${r.draw_number}</strong> — ${r.draw_date}</div>
              <span class="st st-${r.status}">${r.status}</span>
            </div>`).join('') : '<div class="empty"><div class="empty-i">📭</div>No activity yet</div>'}
        </div>
      </div>
    </div>`;
  } catch(e) {
    document.getElementById('mainContent').innerHTML = `
      <div class="page"><div class="empty"><div class="empty-i">❌</div>
      Supabase error: ${e.message}<br/><br/>
      Check your URL and anon key in supabase-config.js</div></div>`;
  }
}

// ════════════════════════════════════════════════════════
//  DRAWS
// ════════════════════════════════════════════════════════
async function pageDraws() {
  try {
    const db   = getDB();
    const data = await db.getAllDraws({ search: dSearch, status: dStatus, page: dPage });
    document.getElementById('mainContent').innerHTML = `
    <div class="page">
      <div class="ph"><h2>Manage Results</h2><button class="bp" onclick="openDrawModal()">+ Add Draw</button></div>
      <div class="cb">
        <input class="si" placeholder="Search draw name or number…" value="${dSearch}"
          oninput="dSearch=this.value;dPage=1;pageDraws()"/>
        <select class="sf" onchange="dStatus=this.value;dPage=1;pageDraws()">
          <option value="" ${!dStatus?'selected':''}>All Status</option>
          <option value="upcoming" ${dStatus==='upcoming'?'selected':''}>Upcoming</option>
          <option value="live" ${dStatus==='live'?'selected':''}>Live</option>
          <option value="published" ${dStatus==='published'?'selected':''}>Published</option>
        </select>
      </div>
      <div class="gc"><div class="tw"><table>
        <thead><tr><th>Draw</th><th>Number</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${data.rows.length ? data.rows.map(r => `
          <tr>
            <td><strong style="color:#e8f5e9">${r.draw_name}</strong></td>
            <td class="tg">${r.draw_number}</td>
            <td>${r.draw_date}</td>
            <td>${r.draw_time}</td>
            <td><span class="st st-${r.status}">${r.status}</span></td>
            <td><div class="flex">
              <button class="bo bsm" onclick="openDrawModal(${r.id})">✏️ Edit</button>
              <button class="bg bsm" onclick="setStatus(${r.id},'published')">✓ Publish</button>
              <button class="bd bsm" onclick="delDraw(${r.id})">🗑</button>
            </div></td>
          </tr>`).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-i">📭</div>No draws yet</div></td></tr>'}
        </tbody>
      </table></div>
      ${data.total > 15 ? `<div style="display:flex;gap:8px;justify-content:center;padding:16px">
        ${Array.from({length:Math.ceil(data.total/15)},(_,i)=>`
          <button class="bo bsm ${dPage===i+1?'bp':''}" onclick="dPage=${i+1};pageDraws()">${i+1}</button>`).join('')}
      </div>` : ''}
      </div>
    </div>`;
  } catch(e) { showError(e); }
}

async function setStatus(id, status) {
  try {
    await getDB().setDrawStatus(id, status);
    toast(`Marked as ${status}`, 's');
    pageDraws();
  } catch(e) { toast(e.message, 'e'); }
}

async function delDraw(id) {
  if (!confirm('Delete this draw and all its prizes?')) return;
  try {
    await getDB().deleteDraw(id);
    toast('Draw deleted', 's');
    pageDraws();
  } catch(e) { toast(e.message, 'e'); }
}

// ── Draw Modal ───────────────────────────────────────────
async function openDrawModal(id = null) {
  editDrawId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit Draw' : 'Add Draw';
  let draw = { draw_name:'', draw_number:'', draw_date:'', draw_time:'15:00', lottery_code:'KR', status:'upcoming' };
  prizeRows = id ? [] : [
    {category:'1st Prize',rank_order:1,ticket:'',amount:'',label:''},
    {category:'2nd Prize',rank_order:2,ticket:'',amount:'',label:''},
    {category:'3rd Prize',rank_order:3,ticket:'',amount:'',label:''},
    {category:'Consolation',rank_order:4,ticket:'',amount:'',label:''},
  ];
  if (id) {
    try {
      const db   = getDB();
      draw       = (await db.getAllDraws()).rows.find(d => d.id == id) || draw;
      prizeRows  = await db.getPrizes(id);
    } catch(e) { toast(e.message,'e'); return; }
  }
  renderDrawModal(draw);
  document.getElementById('drawModal').classList.remove('hidden');
}

function renderDrawModal(draw) {
  document.getElementById('modalBody').innerHTML = `
    <div class="fg2" style="margin-bottom:16px">
      <div class="fg"><label class="fl">Draw Name</label><input class="fi" id="f_name" value="${draw.draw_name||''}" placeholder="e.g. Karunya"/></div>
      <div class="fg"><label class="fl">Draw Number</label><input class="fi" id="f_num" value="${draw.draw_number||''}" placeholder="e.g. KR-702"/></div>
      <div class="fg"><label class="fl">Draw Date</label><input type="date" class="fi" id="f_date" value="${draw.draw_date||''}"/></div>
      <div class="fg"><label class="fl">Draw Time</label><input type="time" class="fi" id="f_time" value="${draw.draw_time||'15:00'}"/></div>
      <div class="fg"><label class="fl">Lottery Code</label>
        <select class="fs" id="f_code">${CODES.map(c=>`<option value="${c}" ${draw.lottery_code===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="fg"><label class="fl">Status</label>
        <select class="fs" id="f_status">
          <option value="upcoming" ${draw.status==='upcoming'?'selected':''}>Upcoming</option>
          <option value="live" ${draw.status==='live'?'selected':''}>Live</option>
          <option value="published" ${draw.status==='published'?'selected':''}>Published</option>
        </select>
      </div>
    </div>
    <div class="div"></div>
    <div class="sl">Prize Categories</div>
    <div id="prRows">${prizeRows.map((p,i) => prRow(p,i)).join('')}</div>
    <button class="bo bsm" style="margin-top:8px" onclick="addPrRow()">+ Add Prize Row</button>
    <div class="mf">
      <button class="bo" onclick="closeModal('drawModal')">Cancel</button>
      <button class="bp" onclick="saveDraw()">💾 Save Draw</button>
    </div>`;
}

function prRow(p, i) {
  return `<div class="pr-row" id="pr${i}">
    <select class="fs" id="pc${i}">${CATS.map(c=>`<option value="${c.c}" data-r="${c.r}" ${p.category===c.c?'selected':''}>${c.c}</option>`).join('')}</select>
    <input class="fi" id="pt${i}" value="${p.ticket||''}" placeholder="Ticket No."/>
    <input class="fi" id="pa${i}" value="${p.amount||''}" placeholder="₹ Amount"/>
    <input class="fi" id="pl${i}" value="${p.label||''}" placeholder="Label (opt)"/>
    <button class="bd bsm" onclick="document.getElementById('pr${i}').remove()">✕</button>
  </div>`;
}

function addPrRow() {
  const i = document.querySelectorAll('[id^="pc"]').length;
  const div = document.createElement('div');
  div.innerHTML = prRow({category:'4th Prize',rank_order:5,ticket:'',amount:'',label:''}, i);
  document.getElementById('prRows').appendChild(div.firstElementChild);
}

function collectPrizes() {
  return Array.from(document.querySelectorAll('[id^="pc"]')).map(sel => {
    const i   = sel.id.slice(2);
    const opt = sel.options[sel.selectedIndex];
    return {
      category:   sel.value,
      rank_order: parseInt(opt.dataset.r || 99),
      ticket:     document.getElementById('pt'+i)?.value || '',
      amount:     document.getElementById('pa'+i)?.value || '',
      label:      document.getElementById('pl'+i)?.value || '',
    };
  }).filter(p => p.ticket || p.amount);
}

async function saveDraw() {
  const drawData = {
    draw_name:    document.getElementById('f_name').value.trim(),
    draw_number:  document.getElementById('f_num').value.trim(),
    draw_date:    document.getElementById('f_date').value,
    draw_time:    document.getElementById('f_time').value,
    lottery_code: document.getElementById('f_code').value,
    status:       document.getElementById('f_status').value,
    updated_at:   new Date().toISOString(),
  };
  if (!drawData.draw_name || !drawData.draw_date) { toast('Name and date required','e'); return; }
  const prizes = collectPrizes();
  try {
    const db = getDB();
    let drawId = editDrawId;
    if (editDrawId) {
      await db.updateDraw(editDrawId, drawData);
    } else {
      const row = await db.createDraw(drawData);
      drawId = row.id;
    }
    await db.replacePrizes(drawId, prizes);
    toast(editDrawId ? 'Draw updated ✅' : 'Draw added ✅', 's');
    closeModal('drawModal');
    pageDraws();
  } catch(e) { toast(e.message, 'e'); }
}

// ════════════════════════════════════════════════════════
//  WINNERS
// ════════════════════════════════════════════════════════
async function pageWinners() {
  try {
    const rows = await getDB().getAllWinners(wSearch);
    document.getElementById('mainContent').innerHTML = `
    <div class="page">
      <div class="ph"><h2>Winners</h2><button class="bp" onclick="openWinnerModal()">+ Add Winner</button></div>
      <div class="cb">
        <input class="si" placeholder="Search name, ticket, district…" value="${wSearch}"
          oninput="wSearch=this.value;pageWinners()"/>
      </div>
      <div class="gc"><div class="tw"><table>
        <thead><tr><th>Name</th><th>District</th><th>Ticket</th><th>Prize</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${rows.length ? rows.map(w => `
          <tr>
            <td><strong style="color:#e8f5e9">${w.name}</strong></td>
            <td>${w.district}</td>
            <td class="tg">${w.ticket}</td>
            <td><strong style="color:var(--neon)">${w.amount}</strong></td>
            <td class="tm">${w.created_at?.split('T')[0]||''}</td>
            <td><div class="flex">
              <button class="bo bsm" onclick="openWinnerModal(${w.id},'${esc(w.name)}','${esc(w.district)}','${esc(w.amount)}','${esc(w.ticket)}')">✏️</button>
              <button class="bd bsm" onclick="delWinner(${w.id})">🗑</button>
            </div></td>
          </tr>`).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-i">🏆</div>No winners yet</div></td></tr>'}
        </tbody>
      </table></div></div>
    </div>`;
  } catch(e) { showError(e); }
}

function esc(s) { return String(s||'').replace(/'/g,"\\'"); }

function openWinnerModal(id=null, name='', district='', amount='', ticket='') {
  editWinnerId = id;
  document.getElementById('winnerModalTitle').textContent = id ? 'Edit Winner' : 'Add Winner';
  document.getElementById('winnerModalBody').innerHTML = `
    <div class="fg2">
      <div class="fg"><label class="fl">Winner Name</label><input class="fi" id="w_n" value="${name}" placeholder="e.g. Akhil R."/></div>
      <div class="fg"><label class="fl">District</label><input class="fi" id="w_d" value="${district}" placeholder="e.g. Kochi"/></div>
      <div class="fg"><label class="fl">Ticket Number</label><input class="fi" id="w_t" value="${ticket}" placeholder="e.g. KR 456789"/></div>
      <div class="fg"><label class="fl">Prize Amount</label><input class="fi" id="w_a" value="${amount}" placeholder="e.g. ₹1,00,00,000"/></div>
    </div>
    <div class="mf">
      <button class="bo" onclick="closeModal('winnerModal')">Cancel</button>
      <button class="bp" onclick="saveWinner()">💾 Save</button>
    </div>`;
  document.getElementById('winnerModal').classList.remove('hidden');
}

async function saveWinner() {
  const body = {
    name:     document.getElementById('w_n').value.trim(),
    district: document.getElementById('w_d').value.trim(),
    ticket:   document.getElementById('w_t').value.trim().toUpperCase(),
    amount:   document.getElementById('w_a').value.trim(),
  };
  if (!body.name || !body.ticket) { toast('Name and ticket required','e'); return; }
  try {
    const db = getDB();
    if (editWinnerId) await db.updateWinner(editWinnerId, body);
    else await db.createWinner(body);
    toast(editWinnerId ? 'Winner updated ✅' : 'Winner added ✅', 's');
    closeModal('winnerModal');
    pageWinners();
  } catch(e) { toast(e.message,'e'); }
}

async function delWinner(id) {
  if (!confirm('Delete this winner?')) return;
  try {
    await getDB().deleteWinner(id);
    toast('Deleted','s');
    pageWinners();
  } catch(e) { toast(e.message,'e'); }
}

// ════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════
function pageSettings() {
  document.getElementById('mainContent').innerHTML = `
  <div class="page">
    <div class="ph"><h2>Settings</h2></div>
    <div class="gc" style="max-width:500px">
      <div class="gc-head"><span class="gc-title">Change Admin Password</span></div>
      <div class="gc-body">
        <p style="font-size:.85rem;color:var(--text2);margin-bottom:18px;line-height:1.6">
          The admin password is stored in <strong style="color:#e8f5e9">supabase-config.js</strong>.
          Edit that file and change the <code style="color:var(--gold)">ADMIN_PASSWORD</code> value,
          then re-deploy to GitHub.
        </p>
        <div style="background:rgba(245,200,66,.06);border:1px solid rgba(245,200,66,.2);
          border-radius:10px;padding:16px;font-size:.85rem;color:var(--text2)">
          <code style="color:var(--gold)">const ADMIN_PASSWORD = 'your-new-password';</code>
        </div>
      </div>
    </div>
    <div class="gc" style="max-width:500px;margin-top:20px">
      <div class="gc-head"><span class="gc-title">Supabase Info</span></div>
      <div class="gc-body" style="display:flex;flex-direction:column;gap:12px;font-size:.85rem;color:var(--text2)">
        <div>🌐 Project URL: <strong style="color:#e8f5e9;word-break:break-all">${SUPABASE_URL}</strong></div>
        <div>🗄️ Database: <strong style="color:#e8f5e9">PostgreSQL (Supabase)</strong></div>
        <div>🚀 Hosting: <strong style="color:#e8f5e9">GitHub + Netlify (static)</strong></div>
        <div>📦 Version: <strong style="color:#e8f5e9">2.0.0 Supabase Edition</strong></div>
        <div style="margin-top:8px">
          <a href="https://supabase.com/dashboard" target="_blank" class="bo bsm">Open Supabase Dashboard →</a>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Error helper ─────────────────────────────────────────
function showError(e) {
  document.getElementById('mainContent').innerHTML = `
    <div class="page"><div class="empty"><div class="empty-i">❌</div>
    Error: ${e.message}</div></div>`;
}
