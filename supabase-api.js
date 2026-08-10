/* =====================================================
   SUPABASE API HELPER
   All database operations go through here.
   ===================================================== */

class SupabaseDB {
  constructor(url, key) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async _req(path, method = 'GET', body = null, extra = '') {
    const opts = { method, headers: { ...this.headers } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${this.url}/rest/v1/${path}${extra}`, opts);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${r.status}`);
    }
    const text = await r.text();
    return text ? JSON.parse(text) : [];
  }

  // ── Draws ──────────────────────────────────────────
  async getPublishedDraw() {
    const rows = await this._req(
      'draws',
      'GET', null,
      '?status=eq.published&order=draw_date.desc,id.desc&limit=1'
    );
    return rows[0] || null;
  }

  async getDrawWithPrizes(drawId) {
    const [draw] = await this._req('draws', 'GET', null, `?id=eq.${drawId}`);
    const prizes = await this._req('prizes', 'GET', null,
      `?draw_id=eq.${drawId}&order=rank_order.asc`);
    return { draw, prizes };
  }

  async getUpcomingDraw() {
    const rows = await this._req(
      'draws', 'GET', null,
      '?status=eq.upcoming&order=draw_date.asc,draw_time.asc&limit=1'
    );
    return rows[0] || null;
  }

  async getHistory({ page = 1, limit = 10, search = '', type = '' } = {}) {
    const offset = (page - 1) * limit;
    let filter = '?status=eq.published';
    if (type)   filter += `&lottery_code=eq.${type}`;
    if (search) filter += `&or=(draw_name.ilike.*${search}*,draw_number.ilike.*${search}*)`;
    filter += `&order=draw_date.desc&limit=${limit}&offset=${offset}`;
    // Get count too
    const countHeaders = { ...this.headers, 'Prefer': 'count=exact' };
    const cr = await fetch(`${this.url}/rest/v1/draws?status=eq.published${type?`&lottery_code=eq.${type}`:''}${search?`&or=(draw_name.ilike.*${search}*,draw_number.ilike.*${search}*)`:''}`, { headers: countHeaders });
    const total = parseInt(cr.headers.get('content-range')?.split('/')[1] || '0');
    const rows  = await this._req('draws', 'GET', null, filter);
    return { rows, total };
  }

  async getAllDraws({ search = '', status = '', page = 1 } = {}) {
    let filter = '?order=draw_date.desc&limit=15';
    const offset = (page - 1) * 15;
    if (status) filter += `&status=eq.${status}`;
    if (search) filter += `&or=(draw_name.ilike.*${search}*,draw_number.ilike.*${search}*)`;
    filter += `&offset=${offset}`;
    const countHeaders = { ...this.headers, 'Prefer': 'count=exact' };
    const cr = await fetch(`${this.url}/rest/v1/draws?order=draw_date.desc${status?`&status=eq.${status}`:''}`, { headers: countHeaders });
    const total = parseInt(cr.headers.get('content-range')?.split('/')[1] || '0');
    const rows  = await this._req('draws', 'GET', null, filter);
    return { rows, total };
  }

  async createDraw(draw) {
    const [row] = await this._req('draws', 'POST', draw);
    return row;
  }

  async updateDraw(id, draw) {
    await this._req('draws', 'PATCH', draw, `?id=eq.${id}`);
  }

  async deleteDraw(id) {
    await this._req('prizes', 'DELETE', null, `?draw_id=eq.${id}`);
    await this._req('draws',  'DELETE', null, `?id=eq.${id}`);
  }

  async setDrawStatus(id, status) {
    await this._req('draws', 'PATCH', { status, updated_at: new Date().toISOString() }, `?id=eq.${id}`);
  }

  // ── Prizes ─────────────────────────────────────────
  async getPrizes(drawId) {
    return this._req('prizes', 'GET', null, `?draw_id=eq.${drawId}&order=rank_order.asc`);
  }

  async replacePrizes(drawId, prizes) {
    await this._req('prizes', 'DELETE', null, `?draw_id=eq.${drawId}`);
    if (!prizes.length) return;
    const rows = prizes.map(p => ({ ...p, draw_id: drawId }));
    await this._req('prizes', 'POST', rows);
  }

  // ── Winners ────────────────────────────────────────
  async getWinners(limit = 20) {
    return this._req('winners', 'GET', null, `?order=id.desc&limit=${limit}`);
  }

  async getAllWinners(search = '') {
    let filter = '?order=id.desc';
    if (search) filter += `&or=(name.ilike.*${search}*,ticket.ilike.*${search}*,district.ilike.*${search}*)`;
    return this._req('winners', 'GET', null, filter);
  }

  async createWinner(w) {
    const [row] = await this._req('winners', 'POST', w);
    return row;
  }

  async updateWinner(id, w) {
    await this._req('winners', 'PATCH', w, `?id=eq.${id}`);
  }

  async deleteWinner(id) {
    await this._req('winners', 'DELETE', null, `?id=eq.${id}`);
  }

  // ── Check ticket ───────────────────────────────────
  async checkTicket(ticket, date = '') {
    let filter = `?ticket=eq.${encodeURIComponent(ticket)}`;
    // Join via draw
    const prizes = await this._req('prizes', 'GET', null, filter);
    if (!prizes.length) return { won: false };
    for (const prize of prizes) {
      const [draw] = await this._req('draws', 'GET', null,
        `?id=eq.${prize.draw_id}&status=eq.published${date ? `&draw_date=eq.${date}` : ''}`);
      if (draw) return { won: true, prize, draw };
    }
    return { won: false };
  }

  // ── Ticket Booking Helper Methods ────────────────────
  // ── Ticket Booking Helper Methods ────────────────────
  async getBookingSettings() {
    try {
      const rows = await this._req('booking_settings', 'GET', null, '?id=eq.1');
      if (rows && rows.length) {
        const r = rows[0];
        // Ensure default values for toggles if null
        if (r.whatsapp_enabled === undefined || r.whatsapp_enabled === null) r.whatsapp_enabled = true;
        if (r.call_enabled === undefined || r.call_enabled === null) r.call_enabled = true;
        if (r.live_chat_enabled === undefined || r.live_chat_enabled === null) r.live_chat_enabled = true;
        return r;
      }
    } catch (e) { console.warn("Failed to load booking settings", e); }
    return { 
      id: 1, 
      upi_id: 'example@upi', 
      upi_name: 'Kerala Lottery Support', 
      whatsapp_number: '919876543210',
      whatsapp_enabled: true,
      call_enabled: true,
      live_chat_enabled: true,
      tawk_embed_code: ''
    };
  }

  async saveBookingSettings(settings) {
    const payload = {
      upi_id: settings.upi_id,
      upi_name: settings.upi_name,
      qr_code_url: settings.qr_code_url,
      whatsapp_number: settings.whatsapp_number,
      whatsapp_enabled: settings.whatsapp_enabled !== false,
      call_enabled: settings.call_enabled !== false,
      live_chat_enabled: settings.live_chat_enabled !== false,
      tawk_embed_code: settings.tawk_embed_code || '',
      updated_at: new Date().toISOString()
    };
    try {
      const rows = await this._req('booking_settings', 'GET', null, '?id=eq.1');
      if (rows && rows.length) {
        await this._req('booking_settings', 'PATCH', payload, '?id=eq.1');
      } else {
        await this._req('booking_settings', 'POST', { id: 1, ...payload });
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // ── Multiple WhatsApp Support Numbers ──
  async getWhatsappSupportNumbers() {
    return this._req('support_whatsapp_numbers', 'GET', null, '?order=id.asc');
  }

  async getActiveWhatsappNumbers() {
    return this._req('support_whatsapp_numbers', 'GET', null, '?is_active=eq.true&order=id.asc');
  }

  async saveWhatsappSupportNumber(num) {
    const payload = {
      label: num.label,
      phone_number: num.phone_number,
      is_active: num.is_active !== false
    };
    if (num.id) {
      return this._req('support_whatsapp_numbers', 'PATCH', payload, `?id=eq.${num.id}`);
    } else {
      return this._req('support_whatsapp_numbers', 'POST', payload);
    }
  }

  async deleteWhatsappSupportNumber(id) {
    return this._req('support_whatsapp_numbers', 'DELETE', null, `?id=eq.${id}`);
  }

  // ── Multiple Call Support Numbers ──
  async getCallSupportNumbers() {
    return this._req('support_call_numbers', 'GET', null, '?order=id.asc');
  }

  async getActiveCallNumbers() {
    return this._req('support_call_numbers', 'GET', null, '?is_active=eq.true&order=id.asc');
  }

  async saveCallSupportNumber(num) {
    const payload = {
      label: num.label,
      phone_number: num.phone_number,
      is_active: num.is_active !== false
    };
    if (num.id) {
      return this._req('support_call_numbers', 'PATCH', payload, `?id=eq.${num.id}`);
    } else {
      return this._req('support_call_numbers', 'POST', payload);
    }
  }

  async deleteCallSupportNumber(id) {
    return this._req('support_call_numbers', 'DELETE', null, `?id=eq.${id}`);
  }

  // ── Round-Robin Assignment Helpers ──
  async getLastBooking() {
    try {
      const rows = await this._req('ticket_bookings', 'GET', null, '?order=created_at.desc,id.desc&limit=1');
      if (rows && rows.length) return rows[0];
    } catch (e) {
      console.warn("Failed to get last booking for assignment", e);
    }
    return null;
  }

  async getBookingDraws() {
    // Return published/upcoming draws to book tickets for
    return this._req('draws', 'GET', null, '?status=in.(upcoming,live,published)&order=draw_date.desc');
  }

  async getDrawTickets(drawId) {
    return this._req('ticket_inventory', 'GET', null, `?draw_id=eq.${drawId}&order=set_number.asc,ticket_number.asc`);
  }

  async insertDrawTickets(tickets) {
    return this._req('ticket_inventory', 'POST', tickets);
  }

  async updateTicketStatus(id, status, held_until = null, held_by = null) {
    const payload = { status, updated_at: new Date().toISOString() };
    if (status === 'HELD') {
      payload.held_until = held_until;
      payload.held_by = held_by;
    } else {
      payload.held_until = null;
      payload.held_by = null;
    }
    return this._req('ticket_inventory', 'PATCH', payload, `?id=eq.${id}`);
  }

  async createBooking(booking, ticketIds, sessionToken) {
    // 1. Insert booking
    const [row] = await this._req('ticket_bookings', 'POST', booking);
    if (!row) throw new Error("Failed to create booking record.");
    
    // 2. Insert booking tickets
    const mappings = ticketIds.map(tid => ({ booking_id: row.id, ticket_id: tid }));
    await this._req('booking_tickets', 'POST', mappings);
    
    // Tickets are kept HELD as set in step 2 until confirmed or rejected.
    return row;
  }

  async submitBookingPayment(bookingId, paymentDetails) {
    const payload = {
      customer_name: paymentDetails.customer_name,
      mobile_number: paymentDetails.mobile_number,
      utr_number: paymentDetails.utr_number,
      screenshot_url: paymentDetails.screenshot_url,
      status: 'PAYMENT SUBMITTED',
      updated_at: new Date().toISOString()
    };
    await this._req('ticket_bookings', 'PATCH', payload, `?booking_id=eq.${bookingId}`);
  }

  async getBookings({ search = '', status = '', page = 1 } = {}) {
    let filter = '?order=created_at.desc&limit=15';
    const offset = (page - 1) * 15;
    if (status) filter += `&status=eq.${status}`;
    if (search) filter += `&or=(customer_name.ilike.*${search}*,mobile_number.ilike.*${search}*,booking_id.ilike.*${search}*,utr_number.ilike.*${search}*)`;
    filter += `&offset=${offset}`;

    const countHeaders = { ...this.headers, 'Prefer': 'count=exact' };
    const queryStr = `${this.url}/rest/v1/ticket_bookings?order=created_at.desc${status ? `&status=eq.${status}` : ''}${search ? `&or=(customer_name.ilike.*${search}*,mobile_number.ilike.*${search}*,booking_id.ilike.*${search}*,utr_number.ilike.*${search}*)` : ''}`;
    const cr = await fetch(queryStr, { headers: countHeaders });
    const total = parseInt(cr.headers.get('content-range')?.split('/')[1] || '0');
    const rows = await this._req('ticket_bookings', 'GET', null, filter);
    return { rows, total };
  }

  async getBookingDetails(bookingDbId) {
    const [booking] = await this._req('ticket_bookings', 'GET', null, `?id=eq.${bookingDbId}`);
    if (!booking) return null;
    
    // Get draw info
    const [draw] = await this._req('draws', 'GET', null, `?id=eq.${booking.draw_id}`);
    
    // Get mapped tickets
    const mappings = await this._req('booking_tickets', 'GET', null, `?booking_id=eq.${bookingDbId}`);
    let tickets = [];
    if (mappings.length) {
      const ticketIds = mappings.map(m => m.ticket_id);
      tickets = await this._req('ticket_inventory', 'GET', null, `?id=in.(${ticketIds.join(',')})`);
    }
    return { booking, draw, tickets };
  }

  async updateBookingStatusAndRelease(bookingDbId, newStatus) {
    // 1. Get current booking details
    const details = await this.getBookingDetails(bookingDbId);
    if (!details) throw new Error("Booking not found");

    // 2. Set booking status & timestamps
    const payload = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'CONFIRMED' || newStatus === 'VERIFIED') {
      payload.confirmed_at = new Date().toISOString();
    } else if (newStatus === 'REJECTED' || newStatus === 'EXPIRED') {
      payload.rejected_at = new Date().toISOString();
    }
    await this._req('ticket_bookings', 'PATCH', payload, `?id=eq.${bookingDbId}`);

    // 3. If REJECTED or EXPIRED, mark tickets as AVAILABLE.
    // If VERIFIED or CONFIRMED, mark tickets as SOLD.
    const ticketStatus = (newStatus === 'REJECTED' || newStatus === 'EXPIRED') ? 'AVAILABLE' : 'SOLD';
    
    if (details.tickets.length) {
      for (const t of details.tickets) {
        await this.updateTicketStatus(t.id, ticketStatus);
      }
    }
  }

  // ── Stats ──────────────────────────────────────────
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const allDraws   = await this._req('draws',   'GET', null, '?select=id,status,draw_date,draw_name,draw_number,updated_at&order=updated_at.desc&limit=6');
    const allPrizes  = await this._req('prizes',  'GET', null, '?select=id');
    const todayPub   = allDraws.filter(d => d.draw_date === today && d.status === 'published').length;
    const jackpotRow = await this._req('prizes',  'GET', null, '?rank_order=eq.1&order=id.desc&limit=1');
    return {
      todayPublished: todayPub,
      totalDraws:     allDraws.length,
      totalTickets:   allPrizes.length,
      jackpot:        jackpotRow[0]?.amount || '—',
      recent:         allDraws.slice(0, 6)
    };
  }
}

// ── Singleton ──────────────────────────────────────────
let _db = null;
function getDB() {
  if (!_db) _db = new SupabaseDB(SUPABASE_URL, SUPABASE_ANON);
  return _db;
}
