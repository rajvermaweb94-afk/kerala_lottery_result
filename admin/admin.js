/* Kerala Lottery — Supabase Admin Panel */

const CODES = ['KL','KR','NR','WW','AK','KN','SS','FF','BM'];
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
  const titles = { dashboard:'Dashboard', draws:'Manage Results', winners:'Winners', bookings:'Ticket Bookings', inventory:'Ticket Inventory', settings:'Settings' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '<div class="page"><div class="empty"><div class="empty-i">⏳</div>Loading…</div></div>';
  if (page === 'dashboard') pageDashboard();
  else if (page === 'draws')   pageDraws();
  else if (page === 'winners') pageWinners();
  else if (page === 'bookings') pageBookings();
  else if (page === 'inventory') pageInventory();
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
    const isNew = !editDrawId;
    if (editDrawId) {
      await db.updateDraw(editDrawId, drawData);
    } else {
      const row = await db.createDraw(drawData);
      drawId = row.id;
    }
    await db.replacePrizes(drawId, prizes);
    
    // Auto-generate 200 unique tickets for new draw
    if (isNew) {
      const tickets = [];
      const numbers = new Set();
      for (let setNum = 1; setNum <= 20; setNum++) {
        for (let i = 0; i < 10; i++) {
          let randNum;
          do {
            randNum = Math.floor(100000 + Math.random() * 900000).toString();
          } while (numbers.has(randNum));
          numbers.add(randNum);
          
          tickets.push({
            draw_id: drawId,
            ticket_number: `KL ${randNum}`,
            set_number: setNum,
            status: 'AVAILABLE',
            price: 40
          });
        }
      }
      await db.insertDrawTickets(tickets);
    }
    
    toast(editDrawId ? 'Draw updated ✅' : 'Draw added and 200 tickets generated ✅', 's');
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

// ── Variables for booking pagination & filters ─────────
let bSearch = '', bStatus = '', bPage = 1;
let iSelectedDrawId = null;
let iSetFilter = '';
let iStatusFilter = '';
let iSearchQuery = '';

// ════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════
async function pageSettings() {
  const mc = document.getElementById('mainContent');
  mc.innerHTML = '<div class="page"><div class="empty"><div class="empty-i">⏳</div>Loading Settings…</div></div>';
  try {
    const db = getDB();
    const settings = await db.getBookingSettings();
    mc.innerHTML = `
    <div class="page">
      <div class="ph"><h2>Settings</h2></div>
      
      <!-- Booking settings -->
      <div class="gc" style="max-width:550px; margin-bottom: 24px;">
        <div class="gc-head"><span class="gc-title">Ticket Booking Settings</span></div>
        <div class="gc-body">
          <form id="bookingSettingsForm" onsubmit="saveBookingSettingsForm(event)">
            <div class="fg" style="margin-bottom:12px;">
              <label class="fl">UPI ID</label>
              <input class="fi" id="s_upi_id" value="${settings.upi_id || ''}" placeholder="e.g. example@upi" required />
            </div>
            <div class="fg" style="margin-bottom:12px;">
              <label class="fl">Payee / Display Name</label>
              <input class="fi" id="s_upi_name" value="${settings.upi_name || ''}" placeholder="e.g. Kerala Lottery" required />
            </div>
            <div class="fg" style="margin-bottom:12px;">
              <label class="fl">WhatsApp Support Number (e.g. 919876543210)</label>
              <input class="fi" id="s_whatsapp" value="${settings.whatsapp_number || ''}" placeholder="e.g. 919876543210" required />
            </div>
            <div class="fg" style="margin-bottom:16px;">
              <label class="fl">Upload UPI QR Code Image</label>
              <input type="file" class="fi" id="s_qr_file" accept="image/*" style="padding: 8px;" />
              ${settings.qr_code_url ? `<div style="margin-top:10px;"><img src="${settings.qr_code_url}" style="max-height:120px; border:1px solid rgba(245,200,66,0.2); border-radius:6px; background:#fff; padding:4px;" /></div>` : ''}
            </div>
            <button type="submit" class="bp" id="s_save_btn">💾 Save Booking Settings</button>
          </form>
        </div>
      </div>

      <div class="gc" style="max-width:550px; margin-bottom: 24px;">
        <div class="gc-head"><span class="gc-title">Change Admin Password</span></div>
        <div class="gc-body">
          <p style="font-size:.85rem;color:var(--text2);margin-bottom:18px;line-height:1.6">
            The admin password is stored in <strong style="color:#e8f5e9">supabase-config.js</strong>.
            Edit that file and change the <code style="color:var(--gold)">ADMIN_PASSWORD</code> value,
            then re-deploy.
          </p>
          <div style="background:rgba(245,200,66,.06);border:1px solid rgba(245,200,66,.2);
            border-radius:10px;padding:16px;font-size:.85rem;color:var(--text2)">
            <code style="color:var(--gold)">const ADMIN_PASSWORD = 'your-new-password';</code>
          </div>
        </div>
      </div>
      <div class="gc" style="max-width:550px">
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
  } catch (e) {
    showError(e);
  }
}

async function saveBookingSettingsForm(e) {
  e.preventDefault();
  const btn = document.getElementById('s_save_btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  
  const upiId = document.getElementById('s_upi_id').value.trim();
  const upiName = document.getElementById('s_upi_name').value.trim();
  const whatsapp = document.getElementById('s_whatsapp').value.trim();
  const qrFile = document.getElementById('s_qr_file').files[0];
  
  let qrBase64 = null;
  if (qrFile) {
    try {
      qrBase64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(qrFile);
      });
    } catch (err) {
      toast("Error parsing QR image", "e");
      btn.disabled = false;
      btn.textContent = 'Save Booking Settings';
      return;
    }
  }

  try {
    const db = getDB();
    const current = await db.getBookingSettings();
    const payload = {
      upi_id: upiId,
      upi_name: upiName,
      whatsapp_number: whatsapp,
      qr_code_url: qrBase64 || current.qr_code_url
    };
    await db.saveBookingSettings(payload);
    toast("Booking settings saved successfully! ✅", "s");
    pageSettings();
  } catch (err) {
    toast(err.message, "e");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Booking Settings';
  }
}

// ════════════════════════════════════════════════════════
//  TICKET BOOKINGS MANAGEMENT
// ════════════════════════════════════════════════════════
async function pageBookings() {
  try {
    const db = getDB();
    const data = await db.getBookings({ search: bSearch, status: bStatus, page: bPage });
    document.getElementById('mainContent').innerHTML = `
    <div class="page">
      <div class="ph"><h2>Manage Ticket Bookings</h2></div>
      <div class="cb">
        <input class="si" placeholder="Search by customer name, mobile, ID, UTR…" value="${bSearch}"
          oninput="bSearch=this.value;bPage=1;pageBookings()"/>
        <select class="sf" onchange="bStatus=this.value;bPage=1;pageBookings()">
          <option value="" ${!bStatus?'selected':''}>All Statuses</option>
          <option value="PENDING PAYMENT" ${bStatus==='PENDING PAYMENT'?'selected':''}>PENDING PAYMENT</option>
          <option value="PAYMENT SUBMITTED" ${bStatus==='PAYMENT SUBMITTED'?'selected':''}>PAYMENT SUBMITTED</option>
          <option value="VERIFIED" ${bStatus==='VERIFIED'?'selected':''}>VERIFIED</option>
          <option value="CONFIRMED" ${bStatus==='CONFIRMED'?'selected':''}>CONFIRMED</option>
          <option value="REJECTED" ${bStatus==='REJECTED'?'selected':''}>REJECTED</option>
          <option value="EXPIRED" ${bStatus==='EXPIRED'?'selected':''}>EXPIRED</option>
        </select>
      </div>
      <div class="gc"><div class="tw"><table>
        <thead><tr><th>Booking ID</th><th>Customer Name</th><th>Mobile (WhatsApp)</th><th>Count</th><th>Total</th><th>UTR</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${data.rows.length ? data.rows.map(r => `
          <tr>
            <td><strong style="color:#e8f5e9">${r.booking_id}</strong></td>
            <td>${r.customer_name}</td>
            <td>${r.mobile_number}</td>
            <td>${r.ticket_count}</td>
            <td><strong style="color:var(--gold)">₹${r.total_amount}</strong></td>
            <td class="tg">${r.utr_number}</td>
            <td><span class="st st-${getStatusClass(r.status)}">${r.status}</span></td>
            <td><div class="flex">
              <button class="bo bsm" onclick="viewBookingDetails(${r.id})">👁 View</button>
              ${r.status === 'PAYMENT SUBMITTED' || r.status === 'PENDING PAYMENT' ? `
                <button class="bg bsm" onclick="setBookingStatus(${r.id},'CONFIRMED')">✓ Confirm</button>
                <button class="bd bsm" onclick="setBookingStatus(${r.id},'REJECTED')">✕ Reject</button>
              ` : ''}
              ${r.status === 'CONFIRMED' ? `
                <button class="bo bsm" onclick="setBookingStatus(${r.id},'REJECTED')" style="border-color:rgba(255,68,68,0.3);color:#ff8080;">✕ Reject</button>
              ` : ''}
              ${r.status === 'REJECTED' ? `
                <button class="bo bsm" onclick="setBookingStatus(${r.id},'CONFIRMED')" style="border-color:rgba(0,255,136,0.3);color:#00ff88;">✓ Confirm</button>
              ` : ''}
            </div></td>
          </tr>`).join('') : '<tr><td colspan="8"><div class="empty"><div class="empty-i">📭</div>No bookings found</div></td></tr>'}
        </tbody>
      </table></div>
      ${data.total > 15 ? `<div style="display:flex;gap:8px;justify-content:center;padding:16px">
        ${Array.from({length:Math.ceil(data.total/15)},(_,i)=>`
          <button class="bo bsm ${bPage===i+1?'bp':''}" onclick="bPage=${i+1};pageBookings()">${i+1}</button>`).join('')}
      </div>` : ''}
      </div>
    </div>`;
  } catch(e) { showError(e); }
}

function getStatusClass(st) {
  if (st === 'CONFIRMED' || st === 'VERIFIED') return 'published';
  if (st === 'PAYMENT SUBMITTED') return 'live';
  if (st === 'REJECTED' || st === 'EXPIRED') return 'upcoming'; // Red/dark style
  return 'upcoming';
}

async function setBookingStatus(id, newStatus) {
  const word = newStatus === 'CONFIRMED' ? 'Confirm booking?' : 'Reject booking and release tickets?';
  if (!confirm(word)) return;
  try {
    await getDB().updateBookingStatusAndRelease(id, newStatus);
    toast(`Booking status updated to ${newStatus} ✅`, 's');
    pageBookings();
  } catch (e) {
    toast(e.message, 'e');
  }
}

async function viewBookingDetails(id) {
  try {
    const details = await getDB().getBookingDetails(id);
    if (!details) return;

    // Show details in draws modal temporarily for simplicity
    document.getElementById('modalTitle').textContent = `Booking ID: ${details.booking.booking_id}`;
    
    const tNumbers = details.tickets.map(t => t.ticket_number).join(', ');
    
    document.getElementById('modalBody').innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px; font-size:.9rem; line-height:1.6; color:var(--text2)">
        <div><strong>Customer Name:</strong> <span style="color:#fff">${details.booking.customer_name}</span></div>
        <div><strong>Mobile (WhatsApp):</strong> <span style="color:#fff">${details.booking.mobile_number}</span></div>
        <div><strong>UTR Number / Reference ID:</strong> <span style="color:var(--gold); font-weight:700">${details.booking.utr_number}</span></div>
        <div><strong>Draw Date:</strong> <span style="color:#fff">${details.draw ? details.draw.draw_name + ' (' + details.draw.draw_number + ') — ' + details.draw.draw_date : '-'}</span></div>
        <div><strong>Tickets:</strong> <span style="color:var(--gold); font-weight:700; word-break:break-all">${tNumbers}</span></div>
        <div><strong>Ticket Count:</strong> <span style="color:#fff">${details.booking.ticket_count}</span></div>
        <div><strong>Total Price:</strong> <span style="color:var(--gold)">₹${details.booking.total_amount}</span></div>
        <div><strong>Status:</strong> <span class="st st-${getStatusClass(details.booking.status)}">${details.booking.status}</span></div>
        
        <div><strong>Payment Screenshot Receipt:</strong></div>
        ${details.booking.screenshot_url ? `
          <div class="screenshot-preview-container">
            <img src="${details.booking.screenshot_url}" class="screenshot-preview-img" alt="Receipt Screenshot" />
          </div>
        ` : `
          <div style="background:rgba(255,255,255,0.03); border:1px dashed var(--glass-border); padding: 24px; text-align:center; border-radius:8px">
            No screenshot uploaded.
          </div>
        `}
        
        <div class="mf" style="margin-top:16px">
          <button class="bo" onclick="closeModal('drawModal')">Close</button>
          ${details.booking.status === 'PAYMENT SUBMITTED' || details.booking.status === 'PENDING PAYMENT' ? `
            <button class="bg" onclick="closeModal('drawModal'); setBookingStatus(${details.booking.id},'CONFIRMED')">✓ Confirm Payment</button>
            <button class="bd" onclick="closeModal('drawModal'); setBookingStatus(${details.booking.id},'REJECTED')">✕ Reject</button>
          ` : ''}
        </div>
      </div>
    `;
    
    document.getElementById('drawModal').classList.remove('hidden');
  } catch (err) {
    toast(err.message, 'e');
  }
}

// ════════════════════════════════════════════════════════
//  TICKET INVENTORY MANAGEMENT
// ════════════════════════════════════════════════════════
async function pageInventory() {
  try {
    const db = getDB();
    const draws = await db.getBookingDraws();
    
    if (!draws.length) {
      document.getElementById('mainContent').innerHTML = `
        <div class="page">
          <div class="ph"><h2>Ticket Inventory</h2></div>
          <div class="empty"><div class="empty-i">📭</div>No draw dates found. Please add a Draw first.</div>
        </div>`;
      return;
    }

    if (!iSelectedDrawId) {
      iSelectedDrawId = draws[0].id;
    }

    // Fetch tickets for this draw
    const tickets = await db.getDrawTickets(iSelectedDrawId);
    
    // Stats calculation
    const totalCount = tickets.length;
    const availCount = tickets.filter(t => t.status === 'AVAILABLE').length;
    const heldCount  = tickets.filter(t => t.status === 'HELD').length;
    const soldCount  = tickets.filter(t => t.status === 'SOLD').length;

    // Filter tickets array locally for list
    let filteredTickets = tickets.filter(t => {
      // Set filter
      if (iSetFilter && t.set_number != iSetFilter) return false;
      // Status filter
      if (iStatusFilter && t.status !== iStatusFilter) return false;
      // Ticket number search query
      if (iSearchQuery && !t.ticket_number.toLowerCase().includes(iSearchQuery.toLowerCase())) return false;
      return true;
    });

    document.getElementById('mainContent').innerHTML = `
    <div class="page">
      <div class="ph"><h2>Ticket Inventory</h2></div>
      
      <!-- Selector bar -->
      <div class="cb" style="justify-content: flex-start; gap: 16px;">
        <div class="fg" style="margin: 0; min-width: 250px;">
          <select class="fs" id="inventoryDrawSelector" onchange="iSelectedDrawId=this.value;pageInventory()">
            ${draws.map(d => `<option value="${d.id}" ${iSelectedDrawId == d.id ? 'selected':''}>${d.draw_name} (${d.draw_number}) — ${d.draw_date}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" style="margin-bottom: 24px;">
        <div class="stat-card" style="padding:16px 20px;"><div class="stat-lbl" style="font-size:0.75rem;">Total Inventory</div><div class="stat-val" style="font-size:1.6rem;">${totalCount}</div></div>
        <div class="stat-card" style="padding:16px 20px;"><div class="stat-lbl" style="font-size:0.75rem;color:#00ff88;">Available</div><div class="stat-val" style="font-size:1.6rem;color:#00ff88;">${availCount}</div></div>
        <div class="stat-card" style="padding:16px 20px;"><div class="stat-lbl" style="font-size:0.75rem;color:var(--gold);">Held (Locked)</div><div class="stat-val" style="font-size:1.6rem;color:var(--gold);">${heldCount}</div></div>
        <div class="stat-card" style="padding:16px 20px;"><div class="stat-lbl" style="font-size:0.75rem;color:#ff8080;">Sold</div><div class="stat-val" style="font-size:1.6rem;color:#ff8080;">${soldCount}</div></div>
      </div>

      <!-- Filters -->
      <div class="cb">
        <input class="si" style="max-width: 240px;" placeholder="Search ticket like 'KL 123456'…" value="${iSearchQuery}"
          oninput="iSearchQuery=this.value;pageInventory()"/>
        
        <select class="sf" onchange="iSetFilter=this.value;pageInventory()">
          <option value="" ${!iSetFilter ? 'selected':''}>All Sets</option>
          ${Array.from({length:20},(_,idx)=>`<option value="${idx+1}" ${iSetFilter == idx+1 ? 'selected':''}>Set ${String(idx+1).padStart(2,'0')}</option>`).join('')}
        </select>

        <select class="sf" onchange="iStatusFilter=this.value;pageInventory()">
          <option value="" ${!iStatusFilter ? 'selected':''}>All Statuses</option>
          <option value="AVAILABLE" ${iStatusFilter==='AVAILABLE'?'selected':''}>AVAILABLE</option>
          <option value="HELD" ${iStatusFilter==='HELD'?'selected':''}>HELD</option>
          <option value="SOLD" ${iStatusFilter==='SOLD'?'selected':''}>SOLD</option>
        </select>
      </div>

      <div class="gc"><div class="tw"><table>
        <thead><tr><th>Ticket Number</th><th>Set</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${filteredTickets.length ? filteredTickets.map(t => `
          <tr>
            <td><strong style="color:#e8f5e9; font-size:1rem; letter-spacing:0.5px;">${t.ticket_number}</strong></td>
            <td>Set ${String(t.set_number).padStart(2, '0')}</td>
            <td>₹${t.price}</td>
            <td><span class="st st-${t.status === 'AVAILABLE' ? 'published' : t.status === 'HELD' ? 'live' : 'upcoming'}">${t.status}</span></td>
            <td>
              ${t.status !== 'AVAILABLE' ? `
                <button class="bo bsm" onclick="adminReleaseTicket(${t.id})">🔓 Mark Available</button>
              ` : `<button class="bd bsm" onclick="adminMarkTicketSold(${t.id})">🎟 Mark Sold</button>`}
            </td>
          </tr>`).join('') : '<tr><td colspan="5"><div class="empty"><div class="empty-i">📭</div>No matching tickets</div></td></tr>'}
        </tbody>
      </table></div></div>
    </div>`;

  } catch(e) { showError(e); }
}

async function adminReleaseTicket(ticketId) {
  if (!confirm('Mark this ticket as AVAILABLE?')) return;
  try {
    await getDB().updateTicketStatus(ticketId, 'AVAILABLE');
    toast('Ticket marked as AVAILABLE ✅', 's');
    pageInventory();
  } catch (e) {
    toast(e.message, 'e');
  }
}

async function adminMarkTicketSold(ticketId) {
  if (!confirm('Mark this ticket as SOLD?')) return;
  try {
    await getDB().updateTicketStatus(ticketId, 'SOLD');
    toast('Ticket marked as SOLD ✅', 's');
    pageInventory();
  } catch (e) {
    toast(e.message, 'e');
  }
}

// ── Error helper ─────────────────────────────────────────
function showError(e) {
  document.getElementById('mainContent').innerHTML = `
    <div class="page"><div class="empty"><div class="empty-i">❌</div>
    Error: ${e.message}</div></div>`;
}
