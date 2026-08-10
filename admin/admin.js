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
    const waps = await db.getWhatsappSupportNumbers();
    const calls = await db.getCallSupportNumbers();
    
    mc.innerHTML = `
    <div class="page">
      <div class="ph"><h2>Settings</h2></div>
      
      <!-- 1. TICKET BOOKING SETTINGS -->
      <div class="gc" style="max-width:600px; margin-bottom: 24px;">
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
            <div class="fg" style="margin-bottom:12px; display: none;">
              <label class="fl">Default WhatsApp Number</label>
              <input class="fi" id="s_whatsapp" value="${settings.whatsapp_number || ''}" placeholder="e.g. 919876543210" />
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

      <!-- 2. WHATSAPP SUPPORT -->
      <div class="gc" style="max-width:600px; margin-bottom: 24px;">
        <div class="gc-head" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="gc-title">WhatsApp Support Management</span>
          <label style="display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:700; cursor:pointer;">
            Enable Support: 
            <input type="checkbox" id="w_enabled_chk" ${settings.whatsapp_enabled ? 'checked':''} onchange="toggleChannelState('whatsapp', this.checked)" />
          </label>
        </div>
        <div class="gc-body">
          <h3 class="gold" style="font-size:0.88rem; margin-bottom:12px;">Active WhatsApp Numbers:</h3>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;" id="wapNumbersList">
            ${waps.length ? waps.map(w => `
              <div style="display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.03); border:1.5px solid var(--glass-border); padding:10px 14px; border-radius:8px;">
                <div style="flex:2;">
                  <div style="font-size:0.7rem; color:var(--text2)">Label:</div>
                  <strong style="color:#fff">${w.label}</strong>
                </div>
                <div style="flex:3;">
                  <div style="font-size:0.7rem; color:var(--text2)">Phone:</div>
                  <strong style="color:var(--gold)">${w.phone_number}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:0.75rem;">${w.is_active ? 'ON' : 'OFF'}</span>
                  <input type="checkbox" ${w.is_active ? 'checked':''} onchange="toggleNumberActive('whatsapp', ${w.id}, this.checked)" />
                </div>
                <button class="bd bsm" style="padding:4px 8px; margin-left:10px;" onclick="deleteSupportNumber('whatsapp', ${w.id})">🗑</button>
              </div>
            `).join('') : '<div style="color:var(--text2); font-size:0.85rem;">No WhatsApp support numbers added.</div>'}
          </div>

          <div style="background:rgba(245,200,66,0.04); border:1.5px dashed rgba(245,200,66,0.25); border-radius:8px; padding:12px;">
            <h4 style="font-size:0.82rem; margin-bottom:10px; font-weight:700; color:var(--gold);">+ Add WhatsApp Number</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input class="fi" style="flex:1; min-width:120px; font-size:0.82rem; padding:8px 12px;" id="new_wap_lbl" placeholder="Label (e.g. Agent A)" />
              <input class="fi" style="flex:1.5; min-width:160px; font-size:0.82rem; padding:8px 12px;" id="new_wap_num" placeholder="+91XXXXXXXXXX" />
              <button class="bp" style="padding:8px 16px; font-size:0.82rem;" onclick="addSupportNumber('whatsapp')">+ Add</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. CALL SUPPORT -->
      <div class="gc" style="max-width:600px; margin-bottom: 24px;">
        <div class="gc-head" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="gc-title">Call Support Management</span>
          <label style="display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:700; cursor:pointer;">
            Enable Support: 
            <input type="checkbox" id="c_enabled_chk" ${settings.call_enabled ? 'checked':''} onchange="toggleChannelState('call', this.checked)" />
          </label>
        </div>
        <div class="gc-body">
          <h3 class="gold" style="font-size:0.88rem; margin-bottom:12px;">Active Call Numbers:</h3>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;" id="callNumbersList">
            ${calls.length ? calls.map(c => `
              <div style="display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.03); border:1.5px solid var(--glass-border); padding:10px 14px; border-radius:8px;">
                <div style="flex:2;">
                  <div style="font-size:0.7rem; color:var(--text2)">Label:</div>
                  <strong style="color:#fff">${c.label}</strong>
                </div>
                <div style="flex:3;">
                  <div style="font-size:0.7rem; color:var(--text2)">Phone:</div>
                  <strong style="color:var(--gold)">${c.phone_number}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:0.75rem;">${c.is_active ? 'ON' : 'OFF'}</span>
                  <input type="checkbox" ${c.is_active ? 'checked':''} onchange="toggleNumberActive('call', ${c.id}, this.checked)" />
                </div>
                <button class="bd bsm" style="padding:4px 8px; margin-left:10px;" onclick="deleteSupportNumber('call', ${c.id})">🗑</button>
              </div>
            `).join('') : '<div style="color:var(--text2); font-size:0.85rem;">No Call support numbers added.</div>'}
          </div>

          <div style="background:rgba(245,200,66,0.04); border:1.5px dashed rgba(245,200,66,0.25); border-radius:8px; padding:12px;">
            <h4 style="font-size:0.82rem; margin-bottom:10px; font-weight:700; color:var(--gold);">+ Add Call Number</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input class="fi" style="flex:1; min-width:120px; font-size:0.82rem; padding:8px 12px;" id="new_call_lbl" placeholder="Label (e.g. Support desk)" />
              <input class="fi" style="flex:1.5; min-width:160px; font-size:0.82rem; padding:8px 12px;" id="new_call_num" placeholder="+91XXXXXXXXXX" />
              <button class="bp" style="padding:8px 16px; font-size:0.82rem;" onclick="addSupportNumber('call')">+ Add</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. LIVE CHAT -->
      <div class="gc" style="max-width:600px; margin-bottom: 24px;">
        <div class="gc-head" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="gc-title">Live Chat / Tawk.to</span>
          <label style="display:flex; align-items:center; gap:6px; font-size:.85rem; font-weight:700; cursor:pointer;">
            Enable Support: 
            <input type="checkbox" id="chat_enabled_chk" ${settings.live_chat_enabled ? 'checked':''} onchange="toggleChannelState('chat', this.checked)" />
          </label>
        </div>
        <div class="gc-body">
          <form id="chatSettingsForm" onsubmit="saveChatSettingsForm(event)">
            <div class="fg" style="margin-bottom:16px;">
              <label class="fl">Tawk.to Embed Code</label>
              <textarea class="fi" id="s_chat_embed" rows="5" placeholder="Paste embed code script from Tawk.to here..." style="font-family:monospace; font-size:0.8rem; line-height:1.4; resize:vertical; padding:10px;">${settings.tawk_embed_code || ''}</textarea>
            </div>
            <button type="submit" class="bp" id="s_chat_save_btn">💾 Save Live Chat Settings</button>
          </form>
        </div>
      </div>

      <div class="gc" style="max-width:600px; margin-bottom: 24px;">
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
      whatsapp_number: current.whatsapp_number, // Maintain default whatsapp
      whatsapp_enabled: current.whatsapp_enabled !== false,
      call_enabled: current.call_enabled !== false,
      live_chat_enabled: current.live_chat_enabled !== false,
      tawk_embed_code: current.tawk_embed_code || '',
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
        <thead><tr><th>Booking ID</th><th>Customer Name</th><th>Mobile</th><th>Count</th><th>Total</th><th>UTR</th><th>Status</th><th>WhatsApp</th><th>Call</th><th>Actions</th></tr></thead>
        <tbody>${data.rows.length ? data.rows.map(r => `
          <tr>
            <td><strong style="color:#e8f5e9">${r.booking_id}</strong></td>
            <td>${r.customer_name}</td>
            <td>${r.mobile_number}</td>
            <td>${r.ticket_count}</td>
            <td><strong style="color:var(--gold)">₹${r.total_amount}</strong></td>
            <td class="tg">${r.utr_number}</td>
            <td><span class="st st-${getStatusClass(r.status)}">${r.status}</span></td>
            <td><span style="font-size:0.75rem; color:var(--text-muted);">${r.assigned_whatsapp_number || '—'}</span></td>
            <td><span style="font-size:0.75rem; color:var(--text-muted);">${r.assigned_call_number || '—'}</span></td>
            <td><div class="flex">
              <button class="bo bsm" onclick="viewBookingDetails(${r.id})">👁 View</button>
              ${r.status === 'PAYMENT SUBMITTED' || r.status === 'PENDING PAYMENT' ? `
                <button class="bg bsm" onclick="setBookingStatus(${r.id},'CONFIRMED')">✓ Confirm</button>
                <button class="bd bsm" onclick="setBookingStatus(${r.id},'REJECTED')">✕ Reject</button>
              ` : ''}
              ${r.status === 'CONFIRMED' ? `
                <button class="bo bsm" onclick="downloadReceipt(${r.id})" style="border-color:var(--gold); color:var(--gold);">📄 Receipt</button>
                <button class="bo bsm" onclick="shareReceiptWhatsapp(${r.id})" style="border-color:#25d366; color:#25d366;">💬 WhatsApp</button>
                <button class="bd bsm" onclick="setBookingStatus(${r.id},'REJECTED')">✕ Reject</button>
              ` : ''}
              ${r.status === 'REJECTED' ? `
                <button class="bo bsm" onclick="setBookingStatus(${r.id},'CONFIRMED')" style="border-color:rgba(0,255,136,0.3);color:#00ff88;">✓ Confirm</button>
              ` : ''}
            </div></td>
          </tr>`).join('') : '<tr><td colspan="10"><div class="empty"><div class="empty-i">📭</div>No bookings found</div></td></tr>'}
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
        <div><strong>Mobile:</strong> <span style="color:#fff">${details.booking.mobile_number}</span></div>
        <div><strong>UTR Number / Reference ID:</strong> <span style="color:var(--gold); font-weight:700">${details.booking.utr_number}</span></div>
        <div><strong>Draw Date:</strong> <span style="color:#fff">${details.draw ? details.draw.draw_name + ' (' + details.draw.draw_number + ') — ' + details.draw.draw_date : '-'}</span></div>
        <div><strong>Tickets:</strong> <span style="color:var(--gold); font-weight:700; word-break:break-all">${tNumbers}</span></div>
        <div><strong>Ticket Count:</strong> <span style="color:#fff">${details.booking.ticket_count}</span></div>
        <div><strong>Total Price:</strong> <span style="color:var(--gold)">₹${details.booking.total_amount}</span></div>
        <div><strong>Assigned WhatsApp Support:</strong> <span style="color:#fff">${details.booking.assigned_whatsapp_number || '—'}</span></div>
        <div><strong>Assigned Call Support:</strong> <span style="color:#fff">${details.booking.assigned_call_number || '—'}</span></div>
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
          ${details.booking.status === 'CONFIRMED' ? `
            <button class="bo" onclick="closeModal('drawModal'); downloadReceipt(${details.booking.id})" style="border-color:var(--gold); color:var(--gold);">📄 Download Receipt</button>
            <button class="bo" onclick="closeModal('drawModal'); shareReceiptWhatsapp(${details.booking.id})" style="border-color:#25d366; color:#25d366;">💬 Share on WhatsApp</button>
            <button class="bd" onclick="closeModal('drawModal'); setBookingStatus(${details.booking.id},'REJECTED')">✕ Reject</button>
          ` : ''}
          ${details.booking.status === 'REJECTED' ? `
            <button class="bg" onclick="closeModal('drawModal'); setBookingStatus(${details.booking.id},'CONFIRMED')">✓ Confirm Payment</button>
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

// ── Support Management Helper Actions ──────────────────
async function toggleChannelState(channel, isEnabled) {
  try {
    const db = getDB();
    const current = await db.getBookingSettings();
    
    if (channel === 'whatsapp') current.whatsapp_enabled = isEnabled;
    else if (channel === 'call') current.call_enabled = isEnabled;
    else if (channel === 'chat') current.live_chat_enabled = isEnabled;
    
    await db.saveBookingSettings(current);
    toast(`${channel.toUpperCase()} support toggle updated!`, 's');
  } catch (err) {
    toast(err.message, 'e');
  }
}

async function addSupportNumber(type) {
  const lblInput = document.getElementById(`new_${type}_lbl`);
  const numInput = document.getElementById(`new_${type}_num`);
  const label = lblInput.value.trim();
  const phone = numInput.value.trim();
  
  if (!label || !phone) {
    toast("Label and phone number are required.", "e");
    return;
  }
  
  try {
    const db = getDB();
    if (type === 'whatsapp') {
      await db.saveWhatsappSupportNumber({ label, phone_number: phone, is_active: true });
    } else {
      await db.saveCallSupportNumber({ label, phone_number: phone, is_active: true });
    }
    toast("Support number added! ✅", 's');
    pageSettings();
  } catch (err) {
    toast(err.message, 'e');
  }
}

async function toggleNumberActive(type, id, isActive) {
  try {
    const db = getDB();
    if (type === 'whatsapp') {
      const rows = await db.getWhatsappSupportNumbers();
      const current = rows.find(w => w.id === id);
      if (current) {
        current.is_active = isActive;
        await db.saveWhatsappSupportNumber(current);
      }
    } else {
      const rows = await db.getCallSupportNumbers();
      const current = rows.find(c => c.id === id);
      if (current) {
        current.is_active = isActive;
        await db.saveCallSupportNumber(current);
      }
    }
    toast("Support number status updated!", 's');
    pageSettings();
  } catch (err) {
    toast(err.message, 'e');
  }
}

async function deleteSupportNumber(type, id) {
  if (!confirm("Are you sure you want to delete this support number?")) return;
  try {
    const db = getDB();
    if (type === 'whatsapp') {
      await db.deleteWhatsappSupportNumber(id);
    } else {
      await db.deleteCallSupportNumber(id);
    }
    toast("Support number deleted successfully.", 's');
    pageSettings();
  } catch (err) {
    toast(err.message, 'e');
  }
}

async function saveChatSettingsForm(e) {
  e.preventDefault();
  const btn = document.getElementById('s_chat_save_btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  
  const code = document.getElementById('s_chat_embed').value.trim();
  const isEnabled = document.getElementById('chat_enabled_chk').checked;
  
  try {
    const db = getDB();
    const current = await db.getBookingSettings();
    current.tawk_embed_code = code;
    current.live_chat_enabled = isEnabled;
    
    await db.saveBookingSettings(current);
    toast("Live chat settings saved successfully! ✅", "s");
    pageSettings();
  } catch (err) {
    toast(err.message, "e");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Live Chat Settings';
  }
}

// ── Download Receipt (HTML Printable Invoice) ──────────
async function downloadReceipt(id) {
  try {
    const db = getDB();
    const details = await db.getBookingDetails(id);
    if (!details) {
      toast("Booking details not found", "e");
      return;
    }
    
    const b = details.booking;
    const d = details.draw;
    const tickets = details.tickets;
    const drawNameStr = d ? `${d.draw_name} (${d.draw_number})` : 'Kerala Lottery';
    const drawDateStr = d ? d.draw_date : '';
    
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast("Pop-up blocker is preventing receipt download. Please allow popups.", "e");
      return;
    }
    
    const confirmDate = b.confirmed_at ? new Date(b.confirmed_at).toLocaleString() : new Date(b.updated_at).toLocaleString();
    const whatsappSupport = b.assigned_whatsapp_number || '—';
    const callSupport = b.assigned_call_number || '—';

    const ticketListHtml = tickets.map(t => `<div style="font-size: 1.15rem; font-weight: 800; color: #f5c842; letter-spacing: 0.5px; padding: 4px 0;">${t.ticket_number}</div>`).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt-${b.booking_id}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #030f0a;
            color: #e8f5e9;
            padding: 40px;
            display: flex;
            justify-content: center;
          }
          .receipt-card {
            background: #061a0e;
            border: 2px solid #f5c842;
            border-radius: 16px;
            padding: 40px;
            max-width: 550px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed rgba(245,200,66,0.25);
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .logo-text {
            font-size: 1.7rem;
            font-weight: 900;
            letter-spacing: 1px;
            color: #fff;
          }
          .logo-text span {
            color: #f5c842;
          }
          .subtitle {
            font-size: 0.85rem;
            color: #00ff88;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .receipt-title {
            font-size: 1.1rem;
            font-weight: 800;
            margin-top: 16px;
            color: #fff;
          }
          .section {
            margin-bottom: 20px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.95rem;
          }
          .label {
            color: rgba(232, 245, 233, 0.6);
            font-weight: 500;
          }
          .value {
            color: #fff;
            font-weight: 700;
            text-align: right;
          }
          .tickets-box {
            background: rgba(10,46,24,0.6);
            border: 1px solid rgba(245,200,66,0.15);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            margin: 16px 0;
          }
          .total-row {
            border-top: 2px dashed rgba(245,200,66,0.25);
            border-bottom: 2px dashed rgba(245,200,66,0.25);
            padding: 14px 0;
            margin: 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label {
            font-size: 1.1rem;
            font-weight: 800;
            color: #fff;
          }
          .total-value {
            font-size: 1.6rem;
            font-weight: 900;
            color: #f5c842;
          }
          .status-badge {
            display: inline-block;
            background: rgba(0,255,136,0.1);
            border: 1.5px solid #00ff88;
            color: #00ff88;
            font-size: 0.78rem;
            font-weight: 800;
            padding: 6px 16px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer-note {
            text-align: center;
            font-size: 0.78rem;
            color: rgba(232, 245, 233, 0.4);
            margin-top: 30px;
            line-height: 1.5;
            border-top: 1px solid rgba(255,255,255,0.05);
            padding-top: 20px;
          }
          @media print {
            body { background: white; color: black; padding: 0; }
            .receipt-card { border: 1px solid #ccc; box-shadow: none; max-width: 100%; }
            .logo-text, .receipt-title { color: black; }
            .total-value { color: black; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div class="logo-text">Kerala<span>Lottery</span></div>
            <div class="subtitle">Payment Confirmation</div>
            <div class="receipt-title">TICKET BOOKING RECEIPT</div>
          </div>
          
          <div class="section">
            <div class="row">
              <span class="label">Booking ID:</span>
              <span class="value" style="color:#f5c842; font-family: monospace;">${b.booking_id}</span>
            </div>
            <div class="row">
              <span class="label">Draw / Date:</span>
              <span class="value">${drawNameStr} (${formatDate(drawDateStr)})</span>
            </div>
            <div class="row">
              <span class="label">Confirmation Date:</span>
              <span class="value">${confirmDate}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="row">
              <span class="label">Customer Name:</span>
              <span class="value">${b.customer_name}</span>
            </div>
            <div class="row">
              <span class="label">Mobile Number:</span>
              <span class="value">${b.mobile_number}</span>
            </div>
          </div>

          <div style="font-size: 0.8rem; font-weight: 700; color: rgba(232,245,233,0.5); text-transform: uppercase; letter-spacing: 0.5px;">Selected Tickets</div>
          <div class="tickets-box">
            ${ticketListHtml}
          </div>

          <div class="section">
            <div class="row">
              <span class="label">Number of Tickets:</span>
              <span class="value">${b.ticket_count}</span>
            </div>
            <div class="row">
              <span class="label">Price Per Ticket:</span>
              <span class="value">₹40</span>
            </div>
          </div>

          <div class="total-row">
            <span class="total-label">Total Amount:</span>
            <span class="total-value">₹${b.total_amount}</span>
          </div>

          <div class="section" style="text-align: center; margin-bottom: 24px;">
            <div style="margin-bottom:8px; font-size:0.8rem; color:rgba(232,245,233,0.5);">UTR / TRANSACTION ID</div>
            <div style="font-family: monospace; font-size: 1rem; font-weight: 700; color: #fff;">${b.utr_number}</div>
          </div>

          <div style="text-align: center;">
            <span class="status-badge">PAID / VERIFIED</span>
          </div>

          <div class="footer-note">
            <div>Assigned WhatsApp Support: ${whatsappSupport}</div>
            <div>Assigned Call Support: ${callSupport}</div>
            <div style="margin-top: 10px;">Thank you for booking with Kerala Lottery. Please keep this receipt for future reference.</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (err) {
    toast(err.message, 'e');
  }
}

// ── Share Receipt on WhatsApp (Prefilled Text) ────────
async function shareReceiptWhatsapp(id) {
  try {
    const db = getDB();
    const details = await db.getBookingDetails(id);
    if (!details) {
      toast("Booking details not found", "e");
      return;
    }
    
    const b = details.booking;
    const settings = await db.getBookingSettings();
    const tickets = details.tickets;
    
    const assignedPhone = b.assigned_whatsapp_number || settings.whatsapp_number;
    const phone = assignedPhone.replace(/\D/g, '');
    
    const tLines = tickets.map(t => t.ticket_number).join('\n');
    
    const text = `Hello ${b.customer_name},

Your ticket booking has been confirmed.

Booking ID: ${b.booking_id}

Tickets:
${tLines}

Total Amount: ₹${b.total_amount}

Payment Status: PAID / VERIFIED

Your payment has been successfully verified.

Please find your booking confirmation receipt attached/downloaded.

Thank you.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  } catch (err) {
    toast(err.message, 'e');
  }
}

// Simple date formatter helper
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
