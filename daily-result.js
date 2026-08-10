/* ===== DAILY RESULT PAGE — JS ===== */

/* ── Demo Data ── */
const DAILY_RESULTS_DEMO = [
  { id: 1,  lotteryName: 'KARUNYA',       drawNumber: 'KR-764', drawDate: '2026-08-10', pdfFilename: 'Karunya-KR-764-10-08-2026.pdf' },
  { id: 2,  lotteryName: 'NIRMAL',        drawNumber: 'NR-401', drawDate: '2026-08-09', pdfFilename: 'Nirmal-NR-401-09-08-2026.pdf' },
  { id: 3,  lotteryName: 'WIN-WIN',       drawNumber: 'W-792',  drawDate: '2026-08-08', pdfFilename: 'Win-Win-W-792-08-08-2026.pdf' },
  { id: 4,  lotteryName: 'AKSHAYA',       drawNumber: 'AK-663', drawDate: '2026-08-07', pdfFilename: 'Akshaya-AK-663-07-08-2026.pdf' },
  { id: 5,  lotteryName: 'KARUNYA PLUS',  drawNumber: 'KN-582', drawDate: '2026-08-06', pdfFilename: 'Karunya-Plus-KN-582-06-08-2026.pdf' },
  { id: 6,  lotteryName: 'STHREE SAKTHI', drawNumber: 'SS-432', drawDate: '2026-08-05', pdfFilename: 'Sthree-Sakthi-SS-432-05-08-2026.pdf' },
  { id: 7,  lotteryName: 'FIFTY-FIFTY',   drawNumber: 'FF-108', drawDate: '2026-08-04', pdfFilename: 'Fifty-Fifty-FF-108-04-08-2026.pdf' },
  { id: 8,  lotteryName: 'KARUNYA',       drawNumber: 'KR-763', drawDate: '2026-08-03', pdfFilename: 'Karunya-KR-763-03-08-2026.pdf' },
  { id: 9,  lotteryName: 'NIRMAL',        drawNumber: 'NR-400', drawDate: '2026-08-02', pdfFilename: 'Nirmal-NR-400-02-08-2026.pdf' },
  { id: 10, lotteryName: 'WIN-WIN',       drawNumber: 'W-791',  drawDate: '2026-08-01', pdfFilename: 'Win-Win-W-791-01-08-2026.pdf' },
  { id: 11, lotteryName: 'AKSHAYA',       drawNumber: 'AK-662', drawDate: '2026-07-31', pdfFilename: 'Akshaya-AK-662-31-07-2026.pdf' },
  { id: 12, lotteryName: 'KARUNYA PLUS',  drawNumber: 'KN-581', drawDate: '2026-07-30', pdfFilename: 'Karunya-Plus-KN-581-30-07-2026.pdf' },
  { id: 13, lotteryName: 'STHREE SAKTHI', drawNumber: 'SS-431', drawDate: '2026-07-29', pdfFilename: 'Sthree-Sakthi-SS-431-29-07-2026.pdf' },
  { id: 14, lotteryName: 'FIFTY-FIFTY',   drawNumber: 'FF-107', drawDate: '2026-07-28', pdfFilename: 'Fifty-Fifty-FF-107-28-07-2026.pdf' },
  { id: 15, lotteryName: 'KARUNYA',       drawNumber: 'KR-762', drawDate: '2026-07-27', pdfFilename: 'Karunya-KR-762-27-07-2026.pdf' },
  { id: 16, lotteryName: 'NIRMAL',        drawNumber: 'NR-399', drawDate: '2026-07-26', pdfFilename: 'Nirmal-NR-399-26-07-2026.pdf' },
  { id: 17, lotteryName: 'WIN-WIN',       drawNumber: 'W-790',  drawDate: '2026-07-25', pdfFilename: 'Win-Win-W-790-25-07-2026.pdf' },
  { id: 18, lotteryName: 'AKSHAYA',       drawNumber: 'AK-661', drawDate: '2026-07-24', pdfFilename: 'Akshaya-AK-661-24-07-2026.pdf' },
  { id: 19, lotteryName: 'KARUNYA PLUS',  drawNumber: 'KN-580', drawDate: '2026-07-23', pdfFilename: 'Karunya-Plus-KN-580-23-07-2026.pdf' },
  { id: 20, lotteryName: 'STHREE SAKTHI', drawNumber: 'SS-430', drawDate: '2026-07-22', pdfFilename: 'Sthree-Sakthi-SS-430-22-07-2026.pdf' },
  { id: 21, lotteryName: 'FIFTY-FIFTY',   drawNumber: 'FF-106', drawDate: '2026-07-21', pdfFilename: 'Fifty-Fifty-FF-106-21-07-2026.pdf' },
  { id: 22, lotteryName: 'KARUNYA',       drawNumber: 'KR-761', drawDate: '2026-07-20', pdfFilename: 'Karunya-KR-761-20-07-2026.pdf' },
  { id: 23, lotteryName: 'NIRMAL',        drawNumber: 'NR-398', drawDate: '2026-07-19', pdfFilename: 'Nirmal-NR-398-19-07-2026.pdf' },
  { id: 24, lotteryName: 'WIN-WIN',       drawNumber: 'W-789',  drawDate: '2026-07-18', pdfFilename: 'Win-Win-W-789-18-07-2026.pdf' },
  { id: 25, lotteryName: 'AKSHAYA',       drawNumber: 'AK-660', drawDate: '2026-07-17', pdfFilename: 'Akshaya-AK-660-17-07-2026.pdf' },
];

/* ── State ── */
let drAllResults = [];
let drFiltered  = [];
let drPage      = 1;
const DR_PER_PAGE = 10;
let drCurrentFilter = 'all';
let drSearchQuery   = '';

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  initDrParticles();
  initDrHeader();
  initDrHamburger();
  showDrLoading(true);

  // Try Supabase first
  let loaded = false;
  if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    try {
      const db = getDB();
      // Check if daily_results table exists by attempting a read
      const resp = await fetch(`${db.url}/rest/v1/daily_results?status=eq.published&order=draw_date.desc&limit=50`, {
        headers: { 'apikey': db.key, 'Authorization': `Bearer ${db.key}` }
      });
      if (resp.ok) {
        const rows = await resp.json();
        if (rows.length) {
          drAllResults = rows.map((r, i) => ({
            id: r.id,
            lotteryName: r.lottery_name,
            drawNumber: r.draw_number,
            drawDate: r.draw_date,
            pdfFilename: r.pdf_filename || '',
            pdfUrl: r.pdf_url || '',
          }));
          loaded = true;
        }
      }
    } catch (e) { /* fall through to demo */ }
  }

  if (!loaded) {
    drAllResults = [...DAILY_RESULTS_DEMO];
  }

  // Sort newest first
  drAllResults.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));

  // Slight delay to show loading skeleton
  setTimeout(() => {
    showDrLoading(false);
    applyDrFilters();
  }, 600);
});

/* ── Particle canvas (reuse from main site) ── */
function initDrParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  function createParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4, dy: -Math.random() * 0.6 - 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.6 ? '#f5c842' : '#00ff88',
    };
  }
  for (let i = 0; i < 80; i++) particles.push(createParticle());
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.y < -10) particles[i] = { ...createParticle(), y: H + 10 };
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Header scroll ── */
function initDrHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });
}

/* ── Hamburger ── */
function initDrHamburger() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    const spans = btn.querySelectorAll('span');
    if (menu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
  menu.querySelectorAll('.mob-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

/* ── Loading ── */
function showDrLoading(show) {
  const el = document.getElementById('drLoading');
  const tbl = document.getElementById('drTableWrap');
  const cards = document.getElementById('drCardsWrap');
  const empty = document.getElementById('drEmpty');
  const pag = document.getElementById('drPagination');
  if (show) {
    el.style.display = '';
    tbl.style.display = 'none';
    cards.style.display = 'none';
    empty.style.display = 'none';
    pag.style.display = 'none';
  } else {
    el.style.display = 'none';
  }
}

/* ── Search ── */
function handleDrSearch() {
  drSearchQuery = (document.getElementById('drSearch').value || '').trim().toLowerCase();
  drPage = 1;
  applyDrFilters();
}

/* ── Filter tabs ── */
function setDrFilter(filter, btn) {
  drCurrentFilter = filter;
  drPage = 1;
  document.querySelectorAll('.dr-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyDrFilters();
}

/* ── Apply filters + search ── */
function applyDrFilters() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Start of this week (Monday)
  const dayOfWeek = now.getDay() || 7; // Sun=7
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);

  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  drFiltered = drAllResults.filter(r => {
    // Search
    if (drSearchQuery) {
      const q = drSearchQuery;
      const nameMatch = r.lotteryName.toLowerCase().includes(q);
      const numMatch  = r.drawNumber.toLowerCase().includes(q);
      const dateMatch = formatDate(r.drawDate).toLowerCase().includes(q);
      if (!nameMatch && !numMatch && !dateMatch) return false;
    }

    // Date filter
    const rd = new Date(r.drawDate + 'T00:00:00');
    if (drCurrentFilter === 'today') {
      return r.drawDate === todayStr;
    } else if (drCurrentFilter === 'week') {
      return rd >= weekStart && rd <= now;
    } else if (drCurrentFilter === 'month') {
      return rd >= monthStart && rd <= now;
    }
    return true; // 'all'
  });

  renderDrResults();
}

/* ── Format date ── */
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── Render ── */
function renderDrResults() {
  const isMobile = window.innerWidth <= 768;
  const tblWrap  = document.getElementById('drTableWrap');
  const cardsWrap = document.getElementById('drCardsWrap');
  const emptyEl  = document.getElementById('drEmpty');
  const pagEl    = document.getElementById('drPagination');

  if (drFiltered.length === 0) {
    tblWrap.style.display = 'none';
    cardsWrap.style.display = 'none';
    emptyEl.style.display = '';
    pagEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';

  // Pagination calc
  const totalPages = Math.ceil(drFiltered.length / DR_PER_PAGE);
  if (drPage > totalPages) drPage = totalPages;
  const start = (drPage - 1) * DR_PER_PAGE;
  const pageItems = drFiltered.slice(start, start + DR_PER_PAGE);

  // Determine first item overall is "latest"
  const latestId = drAllResults.length > 0 ? drAllResults[0].id : null;

  if (isMobile) {
    tblWrap.style.display = 'none';
    cardsWrap.style.display = '';
    renderDrCards(pageItems, latestId, start);
  } else {
    cardsWrap.style.display = 'none';
    tblWrap.style.display = '';
    renderDrTable(pageItems, latestId, start);
  }

  renderDrPagination(totalPages);
  pagEl.style.display = totalPages > 1 ? '' : 'none';
}

/* ── Desktop table ── */
function renderDrTable(items, latestId, startIndex) {
  const tbody = document.getElementById('drTableBody');
  tbody.innerHTML = items.map((r, i) => {
    const isLatest = r.id === latestId;
    const slNo = startIndex + i + 1;
    return `
      <tr>
        <td class="dr-td-sl">${slNo}</td>
        <td class="dr-td-name">
          <span class="dr-lottery-name">${r.lotteryName}</span>
          <span class="dr-draw-num">(${r.drawNumber})</span>
          ${isLatest ? '<span class="dr-latest-badge">LATEST</span>' : ''}
        </td>
        <td class="dr-td-date">${formatDate(r.drawDate)}</td>
        <td class="dr-td-action">
          <button class="dr-download-btn" onclick="downloadDrPdf(this, ${r.id}, '${r.pdfFilename}', '${r.pdfUrl || ''}')" id="dr-dl-${r.id}">
            <i data-lucide="download" class="dr-dl-icon"></i>
            <span class="dr-dl-text">Download PDF</span>
            <span class="dr-dl-spinner" style="display:none"></span>
          </button>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();

  // Stagger animation
  tbody.querySelectorAll('tr').forEach((row, i) => {
    row.style.opacity = '0';
    row.style.transform = 'translateY(8px)';
    row.style.transition = `opacity 0.3s ease ${i * 40}ms, transform 0.3s ease ${i * 40}ms`;
    setTimeout(() => {
      row.style.opacity = '1';
      row.style.transform = 'none';
    }, 50);
  });
}

/* ── Mobile cards ── */
function renderDrCards(items, latestId, startIndex) {
  const wrap = document.getElementById('drCardsWrap');
  wrap.innerHTML = items.map((r, i) => {
    const isLatest = r.id === latestId;
    return `
      <div class="dr-card glass-card">
        <div class="dr-card-top">
          <div class="dr-card-info">
            <div class="dr-card-name">${r.lotteryName} ${isLatest ? '<span class="dr-latest-badge">LATEST</span>' : ''}</div>
            <div class="dr-card-draw">${r.drawNumber}</div>
            <div class="dr-card-date">${formatDate(r.drawDate)}</div>
          </div>
        </div>
        <button class="dr-download-btn dr-download-btn-full" onclick="downloadDrPdf(this, ${r.id}, '${r.pdfFilename}', '${r.pdfUrl || ''}')" id="dr-dl-m-${r.id}">
          <i data-lucide="download" class="dr-dl-icon"></i>
          <span class="dr-dl-text">Download PDF</span>
          <span class="dr-dl-spinner" style="display:none"></span>
        </button>
      </div>`;
  }).join('');
  lucide.createIcons();

  // Stagger animation
  wrap.querySelectorAll('.dr-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    card.style.transition = `opacity 0.35s ease ${i * 50}ms, transform 0.35s ease ${i * 50}ms`;
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, 50);
  });
}

/* ── Pagination ── */
function renderDrPagination(totalPages) {
  const pagEl = document.getElementById('drPagination');
  if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

  let html = '';

  // Previous
  html += `<button class="dr-page-btn ${drPage <= 1 ? 'disabled' : ''}" ${drPage <= 1 ? 'disabled' : ''} onclick="goToDrPage(${drPage - 1})">
    <i data-lucide="chevron-left" style="width:14px;height:14px"></i> Prev
  </button>`;

  // Page numbers with ellipsis
  const maxVisible = 5;
  let startPage = Math.max(1, drPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += `<button class="dr-page-btn" onclick="goToDrPage(1)">1</button>`;
    if (startPage > 2) html += `<span class="dr-page-ellipsis">…</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="dr-page-btn ${i === drPage ? 'active' : ''}" onclick="goToDrPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="dr-page-ellipsis">…</span>`;
    html += `<button class="dr-page-btn" onclick="goToDrPage(${totalPages})">${totalPages}</button>`;
  }

  // Next
  html += `<button class="dr-page-btn ${drPage >= totalPages ? 'disabled' : ''}" ${drPage >= totalPages ? 'disabled' : ''} onclick="goToDrPage(${drPage + 1})">
    Next <i data-lucide="chevron-right" style="width:14px;height:14px"></i>
  </button>`;

  pagEl.innerHTML = html;
  lucide.createIcons();
}

function goToDrPage(p) {
  const totalPages = Math.ceil(drFiltered.length / DR_PER_PAGE);
  if (p < 1 || p > totalPages) return;
  drPage = p;
  renderDrResults();
  // Scroll to top of results
  document.querySelector('.dr-results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Download PDF ── */
function downloadDrPdf(btn, id, filename, pdfUrl) {
  const textEl = btn.querySelector('.dr-dl-text');
  const iconEl = btn.querySelector('.dr-dl-icon');
  const spinnerEl = btn.querySelector('.dr-dl-spinner');

  // Show loading state
  btn.classList.add('downloading');
  if (textEl) textEl.textContent = 'Downloading…';
  if (iconEl) iconEl.style.display = 'none';
  if (spinnerEl) spinnerEl.style.display = '';

  setTimeout(() => {
    // If we have a real PDF URL, trigger download
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = filename || 'result.pdf';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Demo: show toast that PDF will be available when admin uploads
      showDrToast('PDF will be available once uploaded by admin.', 'info');
    }

    // Restore button
    btn.classList.remove('downloading');
    if (textEl) textEl.textContent = 'Download PDF';
    if (iconEl) iconEl.style.display = '';
    if (spinnerEl) spinnerEl.style.display = 'none';
  }, 1200);
}

/* ── Toast ── */
function showDrToast(msg, type = 'info') {
  const existing = document.querySelector('.dr-toast');
  if (existing) existing.remove();

  const colors = {
    error:   { bg: 'rgba(255,68,68,0.15)',  border: 'rgba(255,68,68,0.4)',  text: '#ff8080' },
    success: { bg: 'rgba(0,255,136,0.12)',  border: 'rgba(0,255,136,0.4)', text: '#00ff88' },
    info:    { bg: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.35)', text: '#f5c842' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.className = 'dr-toast';
  toast.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
    padding:12px 24px; border-radius:50px; font-size:0.88rem; font-weight:600;
    backdrop-filter:blur(20px); z-index:9999;
    animation:drFadeInUp 0.3s ease both;
    box-shadow:0 8px 30px rgba(0,0,0,0.3);
    white-space:nowrap; max-width:90vw; overflow:hidden; text-overflow:ellipsis;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ── Responsive resize listener ── */
let drLastMobile = window.innerWidth <= 768;
window.addEventListener('resize', () => {
  const isMobile = window.innerWidth <= 768;
  if (isMobile !== drLastMobile) {
    drLastMobile = isMobile;
    if (drFiltered.length > 0) renderDrResults();
  }
});
