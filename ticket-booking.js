/* ===== TICKET BOOKING PAGE — JS ===== */

// Session identifier for managing holds
let sessionToken = localStorage.getItem('kl_booking_session');
if (!sessionToken) {
  sessionToken = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
  localStorage.setItem('kl_booking_session', sessionToken);
}

// State
let bookingDraws = [];
let selectedDrawId = null;
let bookingTickets = [];
let selectedTicketIds = new Set();
let bookingSettings = { upi_id: 'example@upi', upi_name: 'Kerala Lottery Support', whatsapp_number: '919876543210', qr_code_url: '' };
let currentBooking = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  initParticles();
  initHeaderScroll();
  initMobileMenu();
  
  // Load settings and draws
  await loadSettings();
  await loadDraws();
});

/* ── Particles background ── */
function initParticles() {
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

/* ── Scroll effect & menu ── */
function initHeaderScroll() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  });
}

function initMobileMenu() {
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
}

/* ── Load settings ── */
async function loadSettings() {
  try {
    const db = getDB();
    bookingSettings = await db.getBookingSettings();
    
    // Update UPI text display
    document.getElementById('payUpiId').textContent = bookingSettings.upi_id;
    document.getElementById('payUpiName').textContent = `Payee: ${bookingSettings.upi_name}`;
    
    // Update floating support links
    const phone = bookingSettings.whatsapp_number.replace(/\D/g, '');
    const floatWap = document.getElementById('floatWhatsapp');
    if (floatWap) floatWap.href = `https://wa.me/${phone}`;
    
    // Show QR code if present
    const qrImage = document.getElementById('qrImage');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    if (bookingSettings.qr_code_url) {
      qrImage.src = bookingSettings.qr_code_url;
      qrImage.style.display = '';
      qrPlaceholder.style.display = 'none';
    } else {
      qrImage.style.display = 'none';
      qrPlaceholder.style.display = 'flex';
    }
  } catch (e) {
    console.warn("Using offline fallback settings", e);
  }
}

/* ── Load draws ── */
async function loadDraws() {
  const selector = document.getElementById('drawSelector');
  try {
    const db = getDB();
    bookingDraws = await db.getBookingDraws();
    if (!bookingDraws.length) {
      selector.innerHTML = `<option value="">No draws available</option>`;
      showBookingLoading(false);
      return;
    }
    
    selector.innerHTML = bookingDraws.map(d => `
      <option value="${d.id}">${d.draw_name} (${d.draw_number}) — ${formatDate(d.draw_date)}</option>
    `).join('');
    
    // Select first draw
    selectedDrawId = bookingDraws[0].id;
    await loadDrawTickets(selectedDrawId);
  } catch (e) {
    console.error(e);
    selector.innerHTML = `<option value="">Error loading draws</option>`;
    showBookingLoading(false);
  }
}

/* ── Load draw tickets ── */
async function loadDrawTickets(drawId) {
  if (!drawId) return;
  selectedDrawId = parseInt(drawId);
  selectedTicketIds.clear();
  updateSummaryBar();
  showBookingLoading(true);
  
  // Find draw record to update title
  const activeDraw = bookingDraws.find(d => d.id == selectedDrawId);
  if (activeDraw) {
    document.getElementById('bookingDrawLabel').textContent = `${activeDraw.draw_name} ${activeDraw.draw_number} — ${formatDate(activeDraw.draw_date)}`;
  }
  
  try {
    const db = getDB();
    bookingTickets = await db.getDrawTickets(selectedDrawId);
    
    // Auto-generate if empty
    if (!bookingTickets.length) {
      showToast("Generating tickets for this draw...", "info");
      const generated = generate200Tickets(selectedDrawId);
      await db.insertDrawTickets(generated);
      bookingTickets = await db.getDrawTickets(selectedDrawId);
    }
    
    renderTicketGrid();
  } catch (e) {
    console.error(e);
    showToast("Failed to load draw tickets.", "error");
  } finally {
    showBookingLoading(false);
  }
}

function showBookingLoading(show) {
  document.getElementById('bookingLoading').style.display = show ? '' : 'none';
  document.getElementById('bookingInventory').style.display = show ? 'none' : '';
}

/* ── Generate 200 tickets ── */
function generate200Tickets(drawId) {
  const list = [];
  const numbers = new Set();
  
  for (let setNum = 1; setNum <= 20; setNum++) {
    for (let i = 0; i < 10; i++) {
      let randNum;
      do {
        randNum = Math.floor(100000 + Math.random() * 900000).toString();
      } while (numbers.has(randNum));
      numbers.add(randNum);
      
      list.push({
        draw_id: drawId,
        ticket_number: `KL ${randNum}`,
        set_number: setNum,
        status: 'AVAILABLE',
        price: 40
      });
    }
  }
  return list;
}

/* ── Render ticket grid ── */
function renderTicketGrid() {
  const wrap = document.getElementById('bookingSetsWrap');
  wrap.innerHTML = '';
  
  // Group by set
  const sets = {};
  for (let s = 1; s <= 20; s++) sets[s] = [];
  
  const now = new Date();
  
  bookingTickets.forEach(t => {
    // Check if hold is expired
    let status = t.status;
    if (status === 'HELD' && t.held_until && new Date(t.held_until) < now) {
      status = 'AVAILABLE';
    }
    
    if (sets[t.set_number]) {
      sets[t.set_number].push({ ...t, currentStatus: status });
    }
  });
  
  for (let s = 1; s <= 20; s++) {
    const setTickets = sets[s];
    if (!setTickets || !setTickets.length) continue;
    
    const setHtml = `
      <div class="tb-set-container">
        <h3 class="tb-set-title">Set ${String(s).padStart(2, '0')}</h3>
        <div class="tb-grid">
          ${setTickets.map(t => {
            const isSelected = selectedTicketIds.has(t.id);
            let stateClass = '';
            let btnText = 'BOOK NOW';
            let isDisabled = false;
            
            if (t.currentStatus === 'SOLD') {
              stateClass = 'sold';
              btnText = 'SOLD';
              isDisabled = true;
            } else if (t.currentStatus === 'HELD') {
              if (t.held_by === sessionToken) {
                // User's own hold (if they refreshed or went back)
                stateClass = isSelected ? 'selected' : '';
                btnText = isSelected ? '✓ SELECTED' : 'BOOK NOW';
              } else {
                stateClass = 'held';
                btnText = 'HELD';
                isDisabled = true;
              }
            } else if (isSelected) {
              stateClass = 'selected';
              btnText = '✓ SELECTED';
            }
            
            return `
              <div class="tb-ticket-card ${stateClass} ${isDisabled ? 'disabled' : ''}" 
                   onclick="${isDisabled ? '' : `toggleTicketSelection(${t.id})`}" 
                   id="ticket-card-${t.id}">
                <div class="tb-card-icon">🎟</div>
                <div class="tb-card-number">${t.ticket_number}</div>
                <div class="tb-card-price">₹${t.price}</div>
                <div class="tb-card-btn">${btnText}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    wrap.innerHTML += setHtml;
  }
}

/* ── Toggle Ticket Selection ── */
function toggleTicketSelection(ticketId) {
  const card = document.getElementById(`ticket-card-${ticketId}`);
  const ticket = bookingTickets.find(t => t.id === ticketId);
  if (!card || !ticket) return;
  
  const btn = card.querySelector('.tb-card-btn');
  
  if (selectedTicketIds.has(ticketId)) {
    selectedTicketIds.delete(ticketId);
    card.classList.remove('selected');
    if (btn) btn.textContent = 'BOOK NOW';
  } else {
    selectedTicketIds.add(ticketId);
    card.classList.add('selected');
    if (btn) btn.textContent = '✓ SELECTED';
  }
  
  updateSummaryBar();
}

/* ── Update Summary Bar ── */
function updateSummaryBar() {
  const count = selectedTicketIds.size;
  const bar = document.getElementById('summaryBar');
  const countEl = document.getElementById('barSelectedCount');
  const ticketsEl = document.getElementById('barSelectedTickets');
  const priceEl = document.getElementById('barTotalPrice');
  const btn = document.getElementById('confirmTicketsBtn');
  
  if (count === 0) {
    countEl.textContent = '0 Tickets Selected';
    ticketsEl.textContent = 'None';
    priceEl.textContent = '₹0';
    btn.classList.add('disabled');
    btn.disabled = true;
    return;
  }
  
  const selectedTickets = bookingTickets.filter(t => selectedTicketIds.has(t.id));
  const tNumbers = selectedTickets.map(t => t.ticket_number).join(', ');
  
  countEl.textContent = `${count} Ticket${count > 1 ? 's' : ''} Selected`;
  ticketsEl.textContent = tNumbers;
  priceEl.textContent = `₹${count * 40}`;
  
  if (count >= 3) {
    btn.classList.remove('disabled');
    btn.disabled = false;
  } else {
    btn.classList.add('disabled');
    btn.disabled = true;
  }
}

/* ── Flow Transition: Selection to Confirmation Modal ── */
function proceedToConfirmation() {
  const count = selectedTicketIds.size;
  if (count < 3) {
    showToast("Please select at least 3 tickets to continue.", "error");
    return;
  }
  
  const activeDraw = bookingDraws.find(d => d.id == selectedDrawId);
  const selectedTickets = bookingTickets.filter(t => selectedTicketIds.has(t.id));
  const tNumbers = selectedTickets.map(t => t.ticket_number).join(', ');
  
  document.getElementById('modalDrawDate').textContent = activeDraw ? formatDate(activeDraw.draw_date) : '-';
  document.getElementById('modalTickets').textContent = tNumbers;
  document.getElementById('modalCount').textContent = count;
  document.getElementById('modalTotal').textContent = `₹${count * 40}`;
  
  document.getElementById('confirmModal').classList.add('open');
}

function closeConfirmModal(force) {
  if (force === true || force?.target?.id === 'confirmModal') {
    document.getElementById('confirmModal').classList.remove('open');
  }
}

/* ── Reserve tickets in database & proceed to payment screen ── */
async function reserveAndProceedToPayment() {
  const btn = document.getElementById('proceedPaymentBtn');
  btn.disabled = true;
  btn.textContent = 'Checking availability…';
  
  const selectedIds = Array.from(selectedTicketIds);
  const db = getDB();
  
  try {
    // 1. Fetch latest availability state of these tickets from DB
    const freshTickets = await db.getDrawTickets(selectedDrawId);
    const now = new Date();
    
    // Check if any selected is no longer AVAILABLE or HELD by someone else
    const unavailable = [];
    selectedIds.forEach(id => {
      const ft = freshTickets.find(t => t.id === id);
      if (ft) {
        let isAvail = ft.status === 'AVAILABLE';
        if (ft.status === 'HELD' && ft.held_until && new Date(ft.held_until) < now) {
          isAvail = true; // Hold expired
        }
        if (ft.status === 'HELD' && ft.held_by === sessionToken) {
          isAvail = true; // User's own hold is fine
        }
        if (!isAvail) {
          unavailable.push(ft.ticket_number);
        }
      }
    });
    
    if (unavailable.length > 0) {
      showToast(`${unavailable.join(', ')} is no longer available. Please choose another ticket.`, "error");
      btn.disabled = false;
      btn.textContent = 'Proceed to Payment';
      closeConfirmModal(true);
      await loadDrawTickets(selectedDrawId); // Reload
      return;
    }
    
    // 2. Set HELD status in database (10 minute lock)
    const heldUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    for (const id of selectedIds) {
      await db.updateTicketStatus(id, 'HELD', heldUntil, sessionToken);
    }
    
    // 3. Create initial booking record in database
    const bookingId = 'KB-' + Math.floor(100000 + Math.random() * 900000);
    const bookingData = {
      booking_id: bookingId,
      draw_id: selectedDrawId,
      customer_name: 'Pending Submission',
      mobile_number: 'Pending Submission',
      utr_number: 'Pending Submission',
      ticket_count: selectedIds.length,
      total_amount: selectedIds.length * 40,
      status: 'PENDING PAYMENT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // This helper saves the mapping row and leaves them held/marked
    currentBooking = await db.createBooking(bookingData, selectedIds, sessionToken);
    
    // 4. Update payment screen fields
    const activeDraw = bookingDraws.find(d => d.id == selectedDrawId);
    const selectedTickets = bookingTickets.filter(t => selectedTicketIds.has(t.id));
    const tNumbers = selectedTickets.map(t => t.ticket_number).join(', ');
    
    document.getElementById('confirmDrawDate').textContent = activeDraw ? formatDate(activeDraw.draw_date) : '-';
    document.getElementById('confirmTicketsList').textContent = tNumbers;
    document.getElementById('confirmCount').textContent = selectedIds.length;
    document.getElementById('confirmTotal').textContent = `₹${selectedIds.length * 40}`;
    document.getElementById('instructionTotal').textContent = `₹${selectedIds.length * 40}`;
    
    // Transitions to Step 2
    document.getElementById('stepSelection').style.display = 'none';
    document.getElementById('summaryBar').style.display = 'none';
    document.getElementById('confirmModal').classList.remove('open');
    document.getElementById('stepPayment').style.display = '';
    
    // Update step indicator
    document.getElementById('stepIndicator1').classList.remove('active');
    document.getElementById('stepIndicator2').classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (e) {
    console.error(e);
    showToast("An error occurred during booking. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Proceed to Payment';
  }
}

function goBackToSelection() {
  document.getElementById('stepPayment').style.display = 'none';
  document.getElementById('stepSelection').style.display = '';
  document.getElementById('summaryBar').style.display = '';
  
  document.getElementById('stepIndicator2').classList.remove('active');
  document.getElementById('stepIndicator1').classList.add('active');
  
  // Reload tickets to update availability
  loadDrawTickets(selectedDrawId);
}

/* ── Copy UPI ID ── */
function copyUpiId() {
  const upiId = document.getElementById('payUpiId').textContent;
  navigator.clipboard.writeText(upiId).then(() => {
    showToast("UPI ID copied to clipboard!", "success");
  }).catch(() => {
    showToast("Failed to copy UPI ID.", "error");
  });
}

/* ── Handle Payment Proof Form Submission ── */
async function handlePaymentSubmit(e) {
  e.preventDefault();
  if (!currentBooking) return;
  
  const submitBtn = document.getElementById('paymentSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  const name = document.getElementById('custName').value.trim();
  const mobile = document.getElementById('custMobile').value.trim();
  const utr = document.getElementById('custUtr').value.trim();
  const fileInput = document.getElementById('custScreenshot');
  
  let screenshotBase64 = null;
  
  if (fileInput.files.length > 0) {
    try {
      screenshotBase64 = await readFileAsBase64(fileInput.files[0]);
    } catch (err) {
      showToast("Error processing image file.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Payment';
      return;
    }
  }
  
  try {
    const db = getDB();
    await db.submitBookingPayment(currentBooking.booking_id, {
      customer_name: name,
      mobile_number: mobile,
      utr_number: utr,
      screenshot_url: screenshotBase64
    });
    
    // Save to local object
    currentBooking.customer_name = name;
    currentBooking.mobile_number = mobile;
    currentBooking.utr_number = utr;
    
    // Update Step 3 Submitted Fields
    document.getElementById('finalBookingId').textContent = currentBooking.booking_id;
    document.getElementById('finalDrawDate').textContent = document.getElementById('confirmDrawDate').textContent;
    document.getElementById('finalTicketsList').textContent = document.getElementById('confirmTicketsList').textContent;
    document.getElementById('finalTotal').textContent = document.getElementById('confirmTotal').textContent;
    
    // Transitions to Step 3
    document.getElementById('stepPayment').style.display = 'none';
    document.getElementById('stepSubmitted').style.display = '';
    
    // Update step indicator
    document.getElementById('stepIndicator2').classList.remove('active');
    document.getElementById('stepIndicator3').classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  } catch (err) {
    console.error(err);
    showToast("Failed to submit booking payment receipt.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Payment';
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/* ── Send WhatsApp Message with Details ── */
function sendWhatsAppMessage() {
  if (!currentBooking) return;
  
  const phone = bookingSettings.whatsapp_number.replace(/\D/g, '');
  const activeDraw = bookingDraws.find(d => d.id == selectedDrawId);
  const drawDateStr = activeDraw ? formatDate(activeDraw.draw_date) : '';
  const selectedTickets = bookingTickets.filter(t => selectedTicketIds.has(t.id));
  const tNumbers = selectedTickets.map(t => t.ticket_number).join(', ');
  
  const text = `*Ticket Booking Request*

*Booking ID:* ${currentBooking.booking_id}
*Booking Date:* ${drawDateStr}
*Selected Tickets:* ${tNumbers}
*Total Tickets:* ${currentBooking.ticket_count}
*Price Per Ticket:* ₹40
*Total Amount:* ₹${currentBooking.total_amount}

*Customer Name:* ${currentBooking.customer_name}
*Mobile:* ${currentBooking.mobile_number}
*UTR:* ${currentBooking.utr_number}

*Payment Status:* Payment Details Submitted`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/* ── Format date string ── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── Toast notifications ── */
function showToast(msg, type = 'info') {
  const existing = document.querySelector('.tb-toast');
  if (existing) existing.remove();

  const colors = {
    error:   { bg: 'rgba(255,68,68,0.15)',  border: 'rgba(255,68,68,0.4)',  text: '#ff8080' },
    success: { bg: 'rgba(0,255,136,0.12)',  border: 'rgba(0,255,136,0.4)', text: '#00ff88' },
    info:    { bg: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.35)', text: '#f5c842' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.className = 'tb-toast';
  toast.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
    padding:12px 24px; border-radius:50px; font-size:0.88rem; font-weight:600;
    backdrop-filter:blur(20px); z-index:99999;
    animation:fadeInUp 0.3s ease both;
    box-shadow:0 8px 30px rgba(0,0,0,0.3);
    white-space:nowrap; max-width:90vw; overflow:hidden; text-overflow:ellipsis;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
