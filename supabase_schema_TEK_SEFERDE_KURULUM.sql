-- ============================================================
-- Yavuztürk Süleymaniye Portal — SIFIRDAN TEK PROJE kurulumu
-- Bu dosyanın TAMAMINI kopyalayıp yeni Supabase projenizin
-- SQL Editor'ünde TEK SEFERDE çalıştırın (Run). Hem Yurt Yoklama +
-- Namaz Yoklama + Görev Listeleri, hem de Kitap Takip tabloları
-- aynı projede, tek seferde kurulur.
-- ============================================================

-- ------------------------------------------------------------
-- BÖLÜM 1: Yurt Yoklama (temel tablolar)
-- ------------------------------------------------------------
create table if not exists gruplar (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,
  siralama int not null default 0,
  veli_bilgilendirme_aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists ogrenciler (
  id uuid primary key default gen_random_uuid(),
  ad_soyad text not null,
  grup_id uuid not null references gruplar(id) on delete cascade,
  veli_adi text,
  veli_telefon text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists yoklama (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references ogrenciler(id) on delete cascade,
  tarih date not null default current_date,
  durum text not null check (durum in ('geldi', 'izinli', 'izinsiz')),
  saat time not null default current_time,
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ogrenci_id, tarih)
);

create table if not exists erisim_kodlari (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  sahip_adi text not null,
  yetki text not null default 'yoklamaci' check (yetki in ('yonetici','yoklamaci')),
  admin boolean not null default false,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  son_giris timestamptz
);

insert into gruplar (isim, siralama) values
  ('5. Sınıf', 1), ('6. Sınıf', 2), ('7. Sınıf', 3), ('8. Sınıf', 4)
on conflict (isim) do nothing;

-- İlk giriş kodu — bu ADMIN'dir, portala ilk girişte bunu kullanın,
-- sonra kendi kodunuzu oluşturup bunu silin/pasif yapın.
insert into erisim_kodlari (kod, sahip_adi, yetki, admin) values
  ('YT2026', 'İlk Kurulum', 'yonetici', true)
on conflict (kod) do nothing;

alter table gruplar enable row level security;
alter table ogrenciler enable row level security;
alter table yoklama enable row level security;
alter table erisim_kodlari enable row level security;
-- Bu 4 tabloya public policy yok: sadece sunucu (service role) erişir.

-- ------------------------------------------------------------
-- BÖLÜM 2: Portal modülleri (namaz yoklama, görev listeleri, izinler)
-- ------------------------------------------------------------
create table if not exists moduller (
  anahtar text primary key,
  isim text not null,
  siralama int not null default 0
);
insert into moduller (anahtar, isim, siralama) values
  ('duz_yoklama', 'Yurt Yoklama', 1),
  ('namaz_yoklama', 'Namaz Yoklama', 2),
  ('kitap_takip', 'Kitap Takip', 3),
  ('gorev_listeleri', 'Görev Listeleri', 4)
on conflict (anahtar) do nothing;

create table if not exists erisim_kodu_moduller (
  erisim_kodu_id uuid not null references erisim_kodlari(id) on delete cascade,
  modul_anahtari text not null references moduller(anahtar) on delete cascade,
  primary key (erisim_kodu_id, modul_anahtari)
);
alter table erisim_kodu_moduller enable row level security;

insert into erisim_kodu_moduller (erisim_kodu_id, modul_anahtari)
select ek.id, m.anahtar from erisim_kodlari ek cross join moduller m
on conflict do nothing;

create table if not exists namaz_yoklama (
  id uuid primary key default gen_random_uuid(),
  ogrenci_id uuid not null references ogrenciler(id) on delete cascade,
  tarih date not null default current_date,
  vakit text not null check (vakit in ('sabah','ogle','ikindi','aksam','yatsi')),
  durum text not null check (durum in ('kildi','kilmadi')),
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ogrenci_id, tarih, vakit)
);
alter table namaz_yoklama enable row level security;

create table if not exists gorev_listeleri (
  id uuid primary key default gen_random_uuid(),
  isim text not null unique,
  siralama int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists gorev_kisileri (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  ad_soyad text not null,
  sira int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gorev_kayitlari (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null references gorev_listeleri(id) on delete cascade,
  kisi_id uuid not null references gorev_kisileri(id) on delete cascade,
  tarih date not null default current_date,
  yapildi boolean not null default false,
  not_metni text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kisi_id, tarih)
);
alter table gorev_listeleri enable row level security;
alter table gorev_kisileri enable row level security;
alter table gorev_kayitlari enable row level security;

insert into gorev_listeleri (isim, siralama) values
  ('Yemekçilik', 1), ('Müezzinlik', 2), ('Nöbetçi', 3)
on conflict (isim) do nothing;

-- ------------------------------------------------------------
-- BÖLÜM 3: Kitap Takip (kendi tabloları — tarayıcıdan anon key ile
-- doğrudan erişilir, bu yüzden "herkese açık" policy'leri var; bunu
-- sadece güvendiğiniz kişilerle paylaşılan bir link/PIN korumasıyla
-- kullanın — mevcut Takip Defteri de zaten bu şekilde çalışıyordu.)
-- ------------------------------------------------------------
create table if not exists teachers (
  id text primary key,
  name text not null,
  pin text,
  msg_template text,
  group_header_template text,
  group_line_template text,
  created_at timestamptz default now()
);
create table if not exists students (
  id text primary key,
  teacher_id text references teachers(id) on delete cascade,
  name text not null,
  parent_phone text,
  created_at timestamptz default now()
);
create table if not exists book_library (
  id text primary key,
  name text not null,
  total_pages int,
  publisher_id text,
  created_at timestamptz default now()
);
create table if not exists publishers (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);
create table if not exists books (
  id text primary key,
  student_id text references students(id) on delete cascade,
  name text not null,
  total_pages int,
  status text default 'reading',
  goal jsonb,
  library_book_id text references book_library(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists logs (
  id text primary key,
  book_id text references books(id) on delete cascade,
  date date not null,
  page int not null,
  pages_read int not null,
  finished_on_this boolean default false,
  ts bigint,
  created_at timestamptz default now()
);
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'book_library_publisher_fk'
  ) then
    alter table book_library add constraint book_library_publisher_fk foreign key (publisher_id) references publishers(id) on delete set null;
  end if;
end $$;

create index if not exists idx_students_teacher_id on students(teacher_id);
create index if not exists idx_books_student_id on books(student_id);
create index if not exists idx_logs_book_id on logs(book_id);
create index if not exists idx_logs_date on logs(date);
create index if not exists idx_book_library_name on book_library(name);
create index if not exists idx_book_library_publisher_id on book_library(publisher_id);

alter table teachers enable row level security;
alter table students enable row level security;
alter table books enable row level security;
alter table logs enable row level security;
alter table book_library enable row level security;
alter table publishers enable row level security;
drop policy if exists "herkese acik" on teachers;
drop policy if exists "herkese acik" on students;
drop policy if exists "herkese acik" on books;
drop policy if exists "herkese acik" on logs;
drop policy if exists "herkese acik" on book_library;
drop policy if exists "herkese acik" on publishers;
create policy "herkese acik" on teachers for all using (true) with check (true);
create policy "herkese acik" on students for all using (true) with check (true);
create policy "herkese acik" on books for all using (true) with check (true);
create policy "herkese acik" on logs for all using (true) with check (true);
create policy "herkese acik" on book_library for all using (true) with check (true);
create policy "herkese acik" on publishers for all using (true) with check (true);

-- ============================================================
-- Bitti. Şimdi: Project Settings > API'den şu 3 değeri not alın:
--   1) Project URL
--   2) anon public key
--   3) service_role key (gizli, kimseyle paylaşmayın)
-- ============================================================
