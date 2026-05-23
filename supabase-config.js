/* =====================================================
   SUPABASE CONFIGURATION
   ===================================================== */

const SUPABASE_URL  = 'https://zrpufbkcfplsdnvktcez.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycHVmYmtjZnBsc2Rudmt0Y2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU3ODQsImV4cCI6MjA5NTA0MTc4NH0.Fskva4ZYH1RqR5_lwf7CS0uhcHrJZj8V5HtOnk-UdNg';

/* =====================================================
   ADMIN PASSWORD
   Change this before deploying!
   ===================================================== */
const ADMIN_PASSWORD = 'admin123';

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
