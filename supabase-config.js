/* =====================================================
   SUPABASE CONFIGURATION
   ===================================================== */

const SUPABASE_URL  = 'https://zrpufbkcfplsdnvktcez.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycHVmYmtjZnBsc2Rudmt0Y2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU3ODQsImV4cCI6MjA5NTA0MTc4NH0.Fskva4ZYH1RqR5_lwf7CS0uhcHrJZj8V5HtOnk-UdNg';

/* =====================================================
   ADMIN PASSWORD
   Change this before deploying!
   ===================================================== */
const ADMIN_PASSWORD = 'KeralaLottery@2026';

/* =====================================================
   HOW TO SET UP SUPABASE TABLES
   Run this SQL in Supabase → SQL Editor → New Query:
   =====================================================

CREATE TABLE draws (
  id           BIGSERIAL PRIMARY KEY,
  draw_name    TEXT NOT NULL,
  draw_number  TEXT NOT NULL,
  draw_date    DATE NOT NULL,
  draw_time    TEXT DEFAULT '15:00',
  lottery_code TEXT NOT NULL,
  status       TEXT DEFAULT 'upcoming',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prizes (
  id            BIGSERIAL PRIMARY KEY,
  draw_id       BIGINT REFERENCES draws(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  rank_order    INT DEFAULT 99,
  ticket        TEXT NOT NULL,
  amount        TEXT NOT NULL,
  label         TEXT DEFAULT ''
);

CREATE TABLE winners (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  district   TEXT NOT NULL,
  amount     TEXT NOT NULL,
  ticket     TEXT NOT NULL,
  draw_id    BIGINT REFERENCES draws(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable public read access (frontend can read without login)
ALTER TABLE draws   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read draws"   ON draws   FOR SELECT USING (true);
CREATE POLICY "Public read prizes"  ON prizes  FOR SELECT USING (true);
CREATE POLICY "Public read winners" ON winners FOR SELECT USING (true);

-- Allow all operations via anon key (admin uses same key)
CREATE POLICY "Anon all draws"   ON draws   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon all prizes"  ON prizes  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon all winners" ON winners FOR ALL USING (true) WITH CHECK (true);

-- Sample data (optional, run after creating tables)
INSERT INTO draws (draw_name,draw_number,draw_date,draw_time,lottery_code,status)
VALUES ('Karunya','KR-702','2026-05-21','15:00','KR','published');

INSERT INTO prizes (draw_id,category,rank_order,ticket,amount,label)
VALUES (1,'1st Prize',1,'KR 456789','₹1,00,00,000','One Crore'),
       (1,'2nd Prize',2,'KR 234567','₹10,00,000','Ten Lakhs'),
       (1,'3rd Prize',3,'KR 345678','₹5,00,000','Five Lakhs'),
       (1,'Consolation',4,'Multiple','₹8,000','Eight Thousand');

INSERT INTO winners (name,district,amount,ticket,draw_id)
VALUES ('Akhil R.','Kochi','₹1,00,00,000','KR 456789',1),
       ('Priya M.','Thiruvananthapuram','₹10,00,000','KR 234567',1),
       ('Suresh K.','Kozhikode','₹70,00,000','NR 567890',null);

   ===================================================== */

/* =====================================================
   DAILY RESULTS TABLE (for Daily Result page)
   Run this SQL in Supabase → SQL Editor → New Query:
   =====================================================

CREATE TABLE daily_results (
  id              BIGSERIAL PRIMARY KEY,
  lottery_name    TEXT NOT NULL,
  draw_number     TEXT NOT NULL,
  draw_date       DATE NOT NULL,
  pdf_url         TEXT,
  pdf_filename    TEXT,
  status          TEXT DEFAULT 'draft',  -- draft | published
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read daily_results" ON daily_results FOR SELECT USING (true);
CREATE POLICY "Anon all daily_results"    ON daily_results FOR ALL USING (true) WITH CHECK (true);

   ===================================================== */

/* =====================================================
   TICKET BOOKING SYSTEM TABLES
   Run this SQL in Supabase → SQL Editor → New Query:
   =====================================================

CREATE TABLE booking_settings (
  id                BIGSERIAL PRIMARY KEY,
  upi_id            TEXT NOT NULL DEFAULT 'example@upi',
  upi_name          TEXT NOT NULL DEFAULT 'Kerala Lottery',
  qr_code_url       TEXT,
  whatsapp_number   TEXT NOT NULL DEFAULT '919876543210',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Prepopulate one default settings row
INSERT INTO booking_settings (id, upi_id, upi_name, whatsapp_number)
VALUES (1, 'example@upi', 'Kerala Lottery Support', '919876543210')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE ticket_inventory (
  id              BIGSERIAL PRIMARY KEY,
  draw_id         BIGINT REFERENCES draws(id) ON DELETE CASCADE,
  ticket_number   VARCHAR(15) NOT NULL, -- Format 'KL XXXXXX'
  set_number      INT NOT NULL,          -- 1 to 20
  status          VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'SOLD'
  held_until      TIMESTAMPTZ,           -- temp hold expiration time
  held_by         TEXT,                  -- session id
  price           NUMERIC DEFAULT 40,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_id, ticket_number)
);

CREATE TABLE ticket_bookings (
  id              BIGSERIAL PRIMARY KEY,
  booking_id      VARCHAR(20) UNIQUE NOT NULL, -- KB-XXXXXX
  draw_id         BIGINT REFERENCES draws(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  mobile_number   TEXT NOT NULL,
  utr_number      TEXT NOT NULL,
  screenshot_url  TEXT,                  -- Stores base64 encoded receipt
  ticket_count    INT NOT NULL,
  total_amount    NUMERIC NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'PENDING PAYMENT', -- PENDING PAYMENT, PAYMENT SUBMITTED, VERIFIED, CONFIRMED, REJECTED, EXPIRED
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_tickets (
  id            BIGSERIAL PRIMARY KEY,
  booking_id    BIGINT REFERENCES ticket_bookings(id) ON DELETE CASCADE,
  ticket_id     BIGINT REFERENCES ticket_inventory(id) ON DELETE CASCADE
);

ALTER TABLE booking_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_inventory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_tickets   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read booking_settings" ON booking_settings FOR SELECT USING (true);
CREATE POLICY "Anon all booking_settings"    ON booking_settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read ticket_inventory" ON ticket_inventory FOR SELECT USING (true);
CREATE POLICY "Anon all ticket_inventory"    ON ticket_inventory FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read ticket_bookings"  ON ticket_bookings  FOR SELECT USING (true);
CREATE POLICY "Anon all ticket_bookings"     ON ticket_bookings  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read booking_tickets"   ON booking_tickets   FOR SELECT USING (true);
CREATE POLICY "Anon all booking_tickets"      ON booking_tickets   FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- MULTIPLE CHANNELS SUPPORT TABLES
-- =====================================================

CREATE TABLE support_whatsapp_numbers (
  id           BIGSERIAL PRIMARY KEY,
  label        TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_call_numbers (
  id           BIGSERIAL PRIMARY KEY,
  label        TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_call_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read support_whatsapp" ON support_whatsapp_numbers FOR SELECT USING (true);
CREATE POLICY "Anon all support_whatsapp"    ON support_whatsapp_numbers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read support_call"     ON support_call_numbers FOR SELECT USING (true);
CREATE POLICY "Anon all support_call"        ON support_call_numbers FOR ALL USING (true) WITH CHECK (true);

-- Extensions for settings:
-- ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;
-- ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS call_enabled BOOLEAN NOT NULL DEFAULT true;
-- ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS live_chat_enabled BOOLEAN NOT NULL DEFAULT true;
-- ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS tawk_embed_code TEXT;

-- Extensions for bookings:
-- ALTER TABLE ticket_bookings ADD COLUMN IF NOT EXISTS assigned_whatsapp_number TEXT;
-- ALTER TABLE ticket_bookings ADD COLUMN IF NOT EXISTS assigned_call_number TEXT;
-- ALTER TABLE ticket_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
-- ALTER TABLE ticket_bookings ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

   ===================================================== */
