/* ===== KERALA LOTTERY PREMIUM APP.JS ===== */

// Supabase config loaded from supabase-config.js
// getDB() comes from supabase-api.js

let backendOnline = false;

async function checkBackend() {
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') {
    backendOnline = false; return;
  }
  try {
    const db = getDB();
    await db.getPublishedDraw();
    backendOnline = true;
  } catch { backendOnline = false; }
}

document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  await checkBackend();
  initParticles();
  initHeroGoldParticles();
  initCountdown();
  if (backendOnline) {
    await loadTodayResults();
    await loadWinners();
    await loadHistory();
  } else {
    renderWinners();
    renderHistory();
  }
  initScrollAnimations();
  initAmbientEffects();
  initHeader();
  initHamburger();
  initMobileNav();
  setDefaultDate();
});

/* ===== PARTICLES (background fixed canvas) ===== */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: -Math.random() * 0.6 - 0.2,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.6 ? '#f5c842' : '#00ff88',
    };
  }

  for (let i = 0; i < 80; i++) particles.push(createParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.y < -10) particles[i] = { ...createParticle(), y: H + 10 };
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ===== HERO GOLD PARTICLES (hero canvas) ===== */
function initHeroGoldParticles() {
  const canvas = document.getElementById('heroGoldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    const hero = canvas.parentElement;
    W = canvas.width = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Gold coin / star shapes
  function createGoldParticle() {
    const types = ['circle', 'star', 'diamond'];
    return {
      x: Math.random() * W,
      y: Math.random() * H + H,
      size: Math.random() * 6 + 2,
      speedY: -(Math.random() * 1.2 + 0.4),
      speedX: (Math.random() - 0.5) * 0.6,
      alpha: Math.random() * 0.7 + 0.2,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      type: types[Math.floor(Math.random() * types.length)],
      color: Math.random() > 0.3
        ? `hsl(${42 + Math.random() * 16}, 95%, ${55 + Math.random() * 20}%)`
        : `hsl(${140 + Math.random() * 20}, 90%, 55%)`,
    };
  }

  for (let i = 0; i < 55; i++) {
    const p = createGoldParticle();
    p.y = Math.random() * H; // spread on init
    particles.push(p);
  }

  function drawStar(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const b = (i * 4 * Math.PI) / 5 + (2 * Math.PI) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(b) * (r * 0.42), Math.sin(b) * (r * 0.42));
    }
    ctx.closePath(); ctx.restore();
  }

  function drawDiamond(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, 0);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.6, 0);
    ctx.closePath(); ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      p.alpha += p.alphaDir * 0.008;
      if (p.alpha > 0.85) p.alphaDir = -1;
      if (p.alpha < 0.1) p.alphaDir = 1;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2.5;

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        drawStar(ctx, p.x, p.y, p.size, p.rotation);
        ctx.fill();
      } else {
        drawDiamond(ctx, p.x, p.y, p.size, p.rotation);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      if (p.y < -20) particles[i] = { ...createGoldParticle() };
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
}

/* ===== BACKEND DATA LOADERS (Supabase) ===== */

async function loadTodayResults() {
  try {
    const db   = getDB();
    const draw = await db.getPublishedDraw();
    if (!draw) return;

    const prizes = await db.getPrizes(draw.id);

    // Update section subtitle
    const sub = document.querySelector('#results .section-sub');
    if (sub) sub.textContent = `${draw.draw_name} ${draw.draw_number} | ${draw.draw_date} | ${draw.draw_time}`;

    // Update 1st prize hero card
    const first = prizes.find(p => p.rank_order === 1);
    if (first) {
      const amt = document.getElementById('jackpotAmount');
      const tkt = document.getElementById('jackpotTicket');
      if (amt) amt.textContent = first.amount;
      if (tkt) tkt.textContent = first.ticket;
      const words = document.querySelector('.prize-hero-words');
      if (words && first.label) words.textContent = first.label;
    }

    // Update 2nd/3rd/consolation cards
    const cards = document.querySelectorAll('.prize-card');
    [2, 3, 4].forEach((rank, i) => {
      const prize = prizes.find(p => p.rank_order === rank);
      if (!prize || !cards[i]) return;
      const c = cards[i];
      const a = c.querySelector('.prize-amount');
      const t = c.querySelector('.prize-ticket');
      const l = c.querySelector('.prize-label');
      const m = c.querySelector('.prize-meta');
      if (a) a.textContent = prize.amount;
      if (t) t.textContent = prize.ticket;
      if (l && prize.label) l.textContent = prize.label;
      if (m) m.textContent = `${draw.draw_name} ${draw.draw_number} | ${draw.draw_date}`;
    });

    // Update countdown
    const upcoming = await db.getUpcomingDraw();
    if (upcoming) {
      const sub2 = document.querySelector('.countdown-sub');
      if (sub2) sub2.textContent = `${upcoming.draw_name} ${upcoming.draw_number} | ${upcoming.draw_date} | ${upcoming.draw_time}`;
    }
  } catch(e) { console.warn('Supabase load failed, using static data', e); }
}

async function loadWinners() {
  try {
    const db      = getDB();
    const winners = await db.getWinners(20);
    if (!winners.length) { renderWinners(); return; }
    const track = document.getElementById('winnersTrack');
    if (!track) return;
    const emojis = ['🎉','🏆','🎊','🌟','🏅','🎯'];
    const all = [...winners, ...winners];
    track.innerHTML = all.map((w, i) => `
      <div class="winner-card">
        <div class="winner-emoji">${emojis[i % emojis.length]}</div>
        <div class="winner-name">${w.name}</div>
        <div class="winner-district">📍 ${w.district}</div>
        <div class="winner-amount">${w.amount}</div>
        <div class="winner-ticket">Ticket: ${w.ticket}</div>
      </div>`).join('');
  } catch { renderWinners(); }
}

async function loadHistory() {
  try {
    const db   = getDB();
    const data = await db.getHistory({ limit: 15 });
    if (!data.rows?.length) { renderHistory(); return; }

    // For each draw, get its 1st prize
    const enriched = await Promise.all(data.rows.map(async d => {
      const prizes = await db.getPrizes(d.id);
      const first  = prizes.find(p => p.rank_order === 1);
      return {
        draw:   `${d.draw_name} ${d.draw_number}`,
        date:   d.draw_date,
        number: first?.ticket || 'TBA',
        amount: first?.amount || '—',
        type:   d.draw_name,
      };
    }));

    window.LIVE_HISTORY = enriched;
    filteredHistory = [...enriched];
    renderHistoryPage();
  } catch { renderHistory(); }
}

function initCountdown() {
  // Always counts down to the NEXT 3:00 PM IST (UTC+5:30)
  // If it's already past 3 PM IST today, targets tomorrow's 3 PM IST

  function getNext3PMIST() {
    const now = new Date();

    // IST offset = UTC + 5h 30m = 330 minutes
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    // Current time in IST
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS);

    // Build today's 3 PM IST as a UTC date
    const target = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate(),
      9, 30, 0, 0   // 15:00 IST = 09:30 UTC
    ));

    // If 3 PM IST has already passed today, move to tomorrow
    if (now >= target) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    return target;
  }

  let target = getNext3PMIST();

  function update() {
    const now  = new Date();
    let   diff = target - now;

    // When timer hits zero, reset to next day's 3 PM IST
    if (diff <= 0) {
      target = getNext3PMIST();
      diff   = target - new Date();
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    animateTimerValue('timerHours',   String(h).padStart(2, '0'));
    animateTimerValue('timerMinutes', String(m).padStart(2, '0'));
    animateTimerValue('timerSeconds', String(s).padStart(2, '0'));
  }

  update();
  setInterval(update, 1000);
}

function animateTimerValue(id, val) {
  const el = document.getElementById(id);
  if (el && el.textContent !== val) {
    el.style.transform = 'scale(1.15)';
    el.style.color = '#ffe680';
    el.textContent = val;
    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.color = '';
    }, 200);
  }
}

/* ===== SET DEFAULT DATE ===== */
function setDefaultDate() {
  const d = document.getElementById('drawDate');
  if (d) d.value = new Date().toISOString().split('T')[0];
}

/* ===== SCROLL TO CHECKER ===== */
function scrollToChecker() {
  document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
}

/* ===== RESULT CHECKER ===== */
// Demo winning numbers for simulation
const WINNING_NUMBERS = ['KR 456789', 'AB 123456', 'NR 234567', 'AK 345678', 'KN 567890'];

// Auto-detect lottery name from ticket prefix
const LOTTERY_PREFIX_MAP = {
  KL: 'Kerala Lottery',
  KR: 'Karunya', NR: 'Nirmal', WW: 'Win-Win', AK: 'Akshaya',
  KN: 'Karunya Plus', SS: 'Sthree Sakthi', FF: 'Fifty-Fifty', BM: 'Bhagyamithra',
};
function detectLottery(ticket) {
  const prefix = ticket.replace(/\s+/g, '').replace(/[0-9]/g, '').toUpperCase().slice(0, 2);
  return LOTTERY_PREFIX_MAP[prefix] || 'Kerala Lottery';
}

function checkResult() {
  const ticket = document.getElementById('ticketNumber').value.trim().toUpperCase();
  const date = document.getElementById('drawDate').value;
  const display = document.getElementById('resultDisplay');
  const lottery = detectLottery(ticket);

  if (!ticket) { showToast('Please enter your ticket number', 'error'); return; }

  display.classList.remove('hidden');
  display.innerHTML = `
    <div style="text-align:center;padding:32px;">
      <div class="skeleton" style="height:120px;border-radius:14px;"></div>
    </div>`;

  if (backendOnline) {
    // Live Supabase check
    getDB().checkTicket(ticket, date).then(data => {
      if (data.won) {
        display.innerHTML = `
          <div class="result-winner">
            <div class="result-trophy">🏆</div>
            <div class="result-title" style="color:var(--gold)">Congratulations! You Won!</div>
            <div class="result-amount">${data.prize.amount}</div>
            <div class="result-badge">${data.prize.category}</div>
            <div class="result-meta">
              Ticket: <strong style="color:var(--text-primary)">${ticket}</strong> &nbsp;|&nbsp;
              ${data.draw.draw_name} ${data.draw.draw_number} &nbsp;|&nbsp; ${data.draw.draw_date}
            </div>
            <p style="margin-top:16px;font-size:.85rem;color:var(--text-secondary)">
              Please claim your prize at the nearest Kerala Lottery office with original ticket.
            </p>
          </div>`;
        launchConfetti();
      } else {
        display.innerHTML = `
          <div class="result-loser">
            <div style="font-size:3rem;margin-bottom:12px">😔</div>
            <div class="result-title" style="color:#ff8080">Not a Winning Ticket</div>
            <div style="color:var(--text-secondary);margin:10px 0 16px;font-size:.97rem;font-weight:500">
              Ticket <strong style="color:var(--text-primary)">${ticket}</strong> did not win in this draw.
            </div>
            <p style="margin-top:18px;font-size:.9rem;color:var(--text-secondary)">
              Better luck next time! Try again with tomorrow's draw. 🍀
            </p>
          </div>`;
      }
      lucide.createIcons();
    }).catch(() => demoCheckResult(ticket, date, lottery, display));
  } else {
    setTimeout(() => demoCheckResult(ticket, date, lottery, display), 1200);
  }
}

function demoCheckResult(ticket, date, lottery, display) {
  const isWinner = WINNING_NUMBERS.includes(ticket) || ticket.endsWith('456789') || ticket.endsWith('234567');
  if (isWinner) {
    const prizes = ['₹1,00,00,000', '₹10,00,000', '₹5,00,000'];
    const ranks = ['1st Prize', '2nd Prize', '3rd Prize'];
    const idx = Math.floor(Math.random() * 3);
    display.innerHTML = `
      <div class="result-winner">
        <div class="result-trophy">🏆</div>
        <div class="result-title" style="color:var(--gold)">Congratulations! You Won!</div>
        <div class="result-amount">${prizes[idx]}</div>
        <div class="result-badge">${ranks[idx]}</div>
        <div class="result-meta">
          Ticket: <strong style="color:var(--text-primary)">${ticket}</strong> &nbsp;|&nbsp;
          ${lottery} &nbsp;|&nbsp; ${date || '21 May 2026'}
        </div>
        <p style="margin-top:16px;font-size:.85rem;color:var(--text-secondary)">
          Please claim your prize at the nearest Kerala Lottery office with original ticket.
        </p>
      </div>`;
    launchConfetti();
  } else {
    display.innerHTML = `
      <div class="result-loser">
        <div style="font-size:3rem;margin-bottom:12px">😔</div>
        <div class="result-title" style="color:#ff8080">Not a Winning Ticket</div>
        <div style="color:var(--text-secondary);margin:10px 0 16px;font-size:.97rem;font-weight:500">
          Ticket <strong style="color:var(--text-primary)">${ticket}</strong> did not win in this draw.
        </div>
        <div style="color:var(--text-muted);font-size:.85rem;font-weight:600">
          ${lottery} &nbsp;|&nbsp; ${date || '21 May 2026'}
        </div>
        <p style="margin-top:18px;font-size:.9rem;color:var(--text-secondary)">
          Better luck next time! Try again with tomorrow's draw. 🍀
        </p>
      </div>`;
  }
  lucide.createIcons();
}

/* ===== CONFETTI ===== */
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#f5c842', '#ffe680', '#00ff88', '#ffffff', '#ff6b6b', '#6bcfff'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    r: Math.random() * 8 + 4,
    d: Math.random() * 160 + 80,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.05,
    speed: Math.random() * 3 + 2,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.speed;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      ctx.beginPath();
      ctx.lineWidth = p.r / 2;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
      ctx.stroke();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  draw();
}

/* ===== MORE PRIZES TOGGLE ===== */
function toggleMorePrizes() {
  const body = document.getElementById('morePrizesBody');
  const chevron = document.getElementById('morePrizesChevron');
  body.classList.toggle('hidden');
  chevron.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)';
}



/* ===== WINNERS ===== */
const WINNERS_DATA = [
  { name: 'Akhil R.', district: 'Kochi', amount: '₹1,00,00,000', ticket: 'KR 456789', emoji: '🎉' },
  { name: 'Priya M.', district: 'Thiruvananthapuram', amount: '₹10,00,000', ticket: 'NR 234567', emoji: '🏆' },
  { name: 'Suresh K.', district: 'Kozhikode', amount: '₹5,00,000', ticket: 'AK 345678', emoji: '🎊' },
  { name: 'Meera V.', district: 'Thrissur', amount: '₹2,00,000', ticket: 'KN 567890', emoji: '🌟' },
  { name: 'Rajan P.', district: 'Kannur', amount: '₹1,00,000', ticket: 'SS 678901', emoji: '🎉' },
  { name: 'Anitha S.', district: 'Palakkad', amount: '₹50,000', ticket: 'WW 789012', emoji: '🏅' },
  { name: 'Vijay N.', district: 'Malappuram', amount: '₹25,000', ticket: 'FF 890123', emoji: '🎊' },
  { name: 'Lakshmi D.', district: 'Alappuzha', amount: '₹10,000', ticket: 'BM 901234', emoji: '🌟' },
  { name: 'Biju T.', district: 'Pathanamthitta', amount: '₹8,000', ticket: 'KR 012345', emoji: '🎉' },
  { name: 'Sindhu A.', district: 'Idukki', amount: '₹5,000', ticket: 'NR 123456', emoji: '🏆' },
];

function renderWinners() {
  const track = document.getElementById('winnersTrack');
  if (!track) return;
  // Duplicate for seamless loop
  const all = [...WINNERS_DATA, ...WINNERS_DATA];
  track.innerHTML = all.map(w => `
    <div class="winner-card">
      <div class="winner-emoji">${w.emoji}</div>
      <div class="winner-name">${w.name}</div>
      <div class="winner-district">📍 ${w.district}</div>
      <div class="winner-amount">${w.amount}</div>
      <div class="winner-ticket">Ticket: ${w.ticket}</div>
    </div>`).join('');
}

/* ===== RESULT HISTORY ===== */
const HISTORY_DATA = [
  { draw: 'Karunya KR-702', date: '21 May 2026', number: 'KR 456789', amount: '₹1 Crore', type: 'Karunya' },
  { draw: 'Nirmal NR-389', date: '20 May 2026', number: 'NR 234567', amount: '₹70 Lakh', type: 'Nirmal' },
  { draw: 'Win-Win W-780', date: '19 May 2026', number: 'WW 345678', amount: '₹75 Lakh', type: 'Win-Win' },
  { draw: 'Akshaya AK-651', date: '18 May 2026', number: 'AK 456789', amount: '₹70 Lakh', type: 'Akshaya' },
  { draw: 'Karunya Plus KN-570', date: '17 May 2026', number: 'KN 567890', amount: '₹80 Lakh', type: 'Karunya Plus' },
  { draw: 'Sthree Sakthi SS-420', date: '16 May 2026', number: 'SS 678901', amount: '₹75 Lakh', type: 'Sthree Sakthi' },
  { draw: 'Karunya KR-701', date: '14 May 2026', number: 'KR 789012', amount: '₹1 Crore', type: 'Karunya' },
  { draw: 'Nirmal NR-388', date: '13 May 2026', number: 'NR 890123', amount: '₹70 Lakh', type: 'Nirmal' },
  { draw: 'Win-Win W-779', date: '12 May 2026', number: 'WW 901234', amount: '₹75 Lakh', type: 'Win-Win' },
  { draw: 'Akshaya AK-650', date: '11 May 2026', number: 'AK 012345', amount: '₹70 Lakh', type: 'Akshaya' },
  { draw: 'Karunya Plus KN-569', date: '10 May 2026', number: 'KN 123456', amount: '₹80 Lakh', type: 'Karunya Plus' },
  { draw: 'Sthree Sakthi SS-419', date: '09 May 2026', number: 'SS 234567', amount: '₹75 Lakh', type: 'Sthree Sakthi' },
  { draw: 'Karunya KR-700', date: '07 May 2026', number: 'KR 345678', amount: '₹1 Crore', type: 'Karunya' },
  { draw: 'Nirmal NR-387', date: '06 May 2026', number: 'NR 456789', amount: '₹70 Lakh', type: 'Nirmal' },
  { draw: 'Win-Win W-778', date: '05 May 2026', number: 'WW 567890', amount: '₹75 Lakh', type: 'Win-Win' },
];

let historyPage = 1;
const HISTORY_PER_PAGE = 8;
let filteredHistory = [...HISTORY_DATA];

function renderHistory() {
  filterHistory();
}

function filterHistory() {
  const search = (document.getElementById('historySearch')?.value || '').toLowerCase();
  const filter = document.getElementById('historyFilter')?.value || '';
  const source = window.LIVE_HISTORY || HISTORY_DATA;
  filteredHistory = source.filter(h => {
    const matchSearch = !search || h.draw.toLowerCase().includes(search) || h.number.toLowerCase().includes(search);
    const matchFilter = !filter || h.type.includes(filter);
    return matchSearch && matchFilter;
  });
  historyPage = 1;
  renderHistoryPage();
}

function renderHistoryPage() {
  const tbody = document.getElementById('historyBody');
  const pagination = document.getElementById('pagination');
  if (!tbody) return;

  const start = (historyPage - 1) * HISTORY_PER_PAGE;
  const page = filteredHistory.slice(start, start + HISTORY_PER_PAGE);

  tbody.innerHTML = page.length ? page.map(h => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${h.draw}</td>
      <td style="color:var(--text-secondary);font-weight:500">${h.date}</td>
      <td style="font-weight:700;letter-spacing:1px;color:var(--gold)">${h.number}</td>
      <td style="color:var(--gold);font-weight:700">${h.amount}</td>
      <td><button class="view-btn">View</button></td>
    </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);font-size:0.9rem;font-weight:500;padding:36px">No results found</td></tr>`;

  const totalPages = Math.ceil(filteredHistory.length / HISTORY_PER_PAGE);
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === historyPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => { historyPage = i; renderHistoryPage(); };
    pagination.appendChild(btn);
  }
}

/* ===== SCROLL REVEAL ENGINE ===== */
function initScrollAnimations() {
  // Selectors that get observed
  const TARGETS = [
    '.reveal',
    '.section-header',
    '.prize-card',
    '.prize-hero-wrap',
    '.winner-card',
    '.countdown-wrap',
    '.checker-card',
    '.more-prizes',
    '.glass-card',
  ].join(',');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(TARGETS).forEach(el => observer.observe(el));

  // Prize cards — stagger delay
  document.querySelectorAll('.prize-card').forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${i * 90}ms`);
  });

  // Feature cards already have --reveal-delay set in HTML

  // Winner cards — stagger when track is visible
  const winnersObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.winner-card').forEach((card, i) => {
          setTimeout(() => card.classList.add('visible'), i * 60);
        });
        winnersObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  const track = document.getElementById('winnersTrack');
  if (track) winnersObserver.observe(track);

  // History rows — same treatment when table enters view
  const histObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('tbody tr').forEach((row, i) => {
          row.style.opacity = '0';
          row.style.transform = 'translateX(-12px)';
          row.style.transition = `opacity 0.35s ease ${i * 40}ms, transform 0.35s ease ${i * 40}ms`;
          setTimeout(() => {
            row.style.opacity = '1';
            row.style.transform = 'none';
          }, 50 + i * 40);
        });
        histObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  const hist = document.querySelector('.history-table');
  if (hist) histObserver.observe(hist);

  // Section number counter animation
  initCounterAnimations();
}

/* ===== COUNTER ANIMATIONS (hero stats) ===== */
function initCounterAnimations() {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.hero-stat-value').forEach(el => {
        const text = el.textContent;
        // Only animate pure numbers
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (isNaN(num) || num === 0) return;
        const suffix = text.replace(/[0-9.]/g, '');
        let start = 0;
        const duration = 1400;
        const step = 16;
        const increment = num / (duration / step);
        const timer = setInterval(() => {
          start += increment;
          if (start >= num) { start = num; clearInterval(timer); }
          el.textContent = (Number.isInteger(num) ? Math.floor(start) : start.toFixed(1)) + suffix;
        }, step);
      });
      statsObserver.unobserve(e.target);
    });
  }, { threshold: 0.5 });

  const stats = document.querySelector('.hero-stats');
  if (stats) statsObserver.observe(stats);
}

/* ===== LIVE PLATFORM AMBIENT EFFECTS ===== */
function initAmbientEffects() {
  // Subtle random glow pulse on prize hero card
  const heroCard = document.querySelector('.prize-hero-crown-glow');
  if (heroCard) {
    setInterval(() => {
      const scale = 1 + Math.random() * 0.2;
      const opacity = 0.6 + Math.random() * 0.4;
      heroCard.style.transform = `translateX(-50%) scale(${scale})`;
      heroCard.style.opacity = opacity;
    }, 2500);
  }

  // Jackpot amount random digit flicker (slot machine feel)
  const jackpot = document.getElementById('jackpotAmount');
  if (jackpot) {
    const finalAmount = '₹1,00,00,000';
    let flickerCount = 0;
    const amounts = ['₹98,76,543', '₹1,23,45,678', '₹87,65,432', '₹1,00,00,000'];
    const flicker = setInterval(() => {
      jackpot.textContent = amounts[flickerCount % amounts.length];
      flickerCount++;
      if (flickerCount >= 6) {
        jackpot.textContent = finalAmount;
        clearInterval(flicker);
      }
    }, 120);
  }
}


/* ===== HEADER SCROLL ===== */
function initHeader() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });
}

/* ===== HAMBURGER ===== */
function initHamburger() {
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

/* ===== MOBILE NAV ACTIVE STATE ===== */
function initMobileNav() {
  const navItems = document.querySelectorAll('.mob-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Highlight nav on scroll
  const sections = ['home', 'results', 'winners', 'tickets', 'history'];
  const navLinks = document.querySelectorAll('.nav-link');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  });
}

/* ===== TICKET SCANNER ===== */
let scannerStream = null;
let scannerDemoTimeout = null;

function openScanner() {
  const overlay = document.getElementById('scannerOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
  startCamera();
}

function closeScanner(force) {
  if (force === true || force?.target?.id === 'scannerOverlay') {
    const overlay = document.getElementById('scannerOverlay');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    stopCamera();
    clearTimeout(scannerDemoTimeout);
    document.getElementById('scannerManualInput').value = '';
  }
}

function startCamera() {
  const video = document.getElementById('scannerVideo');
  if (!navigator.mediaDevices?.getUserMedia) return; // no camera API
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scannerStream = stream;
      video.srcObject = stream;
    })
    .catch(() => {
      // Camera not available — show placeholder gradient
      video.style.background = 'linear-gradient(135deg, #061a0e, #0a2e18)';
    });
}

function stopCamera() {
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  const video = document.getElementById('scannerVideo');
  video.srcObject = null;
}

function confirmScanManual() {
  const val = document.getElementById('scannerManualInput').value.trim().toUpperCase();
  if (!val) { showToast('Please enter a ticket number', 'error'); return; }
  applyScannedTicket(val);
}

function demoScan() {
  const demoTickets = ['KR 456789', 'NR 234567', 'AK 345678', 'KN 567890', 'SS 678901'];
  const ticket = demoTickets[Math.floor(Math.random() * demoTickets.length)];

  // Animate laser faster during "scan"
  const laser = document.querySelector('.scanner-laser');
  if (laser) { laser.style.animationDuration = '0.4s'; }

  showToast('📷 Scanning ticket…', 'info');

  scannerDemoTimeout = setTimeout(() => {
    if (laser) laser.style.animationDuration = '2.2s';
    applyScannedTicket(ticket);
  }, 1800);
}

function applyScannedTicket(ticket) {
  document.getElementById('ticketNumber').value = ticket;
  closeScanner(true);
  showToast(`✅ Ticket ${ticket} scanned successfully!`, 'success');
  setTimeout(() => {
    scrollToChecker();
    setTimeout(checkResult, 700);
  }, 400);
}

/* ===== TOAST NOTIFICATION ===== */
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const colors = {
    error:   { bg: 'rgba(255,68,68,0.15)',   border: 'rgba(255,68,68,0.4)',   text: '#ff8080' },
    success: { bg: 'rgba(0,255,136,0.12)',   border: 'rgba(0,255,136,0.4)',   text: '#00ff88' },
    info:    { bg: 'rgba(245,200,66,0.12)',  border: 'rgba(245,200,66,0.35)', text: 'var(--gold)' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
    padding:12px 24px; border-radius:50px; font-size:0.88rem; font-weight:600;
    backdrop-filter:blur(20px); z-index:9999;
    animation:fadeInUp 0.3s ease both;
    box-shadow:0 8px 30px rgba(0,0,0,0.3);
    white-space:nowrap;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS ===== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
