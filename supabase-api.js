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
