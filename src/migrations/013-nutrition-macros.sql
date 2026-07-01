-- Simpan karbohidrat & lemak per catatan makanan (sebelumnya hanya protein & kalori).
-- Dipakai oleh pencatatan makanan via chat/suara yang mengestimasi makro otomatis.
alter table public.nutrition_logs
  add column if not exists carb_g numeric(6, 2) not null default 0,
  add column if not exists fat_g numeric(6, 2) not null default 0;
