-- ============================================================
-- Migration: Google OAuth Support
-- Jalankan di phpMyAdmin atau MySQL client
-- Database: realtime
-- ============================================================

USE `realtime`;

-- 1. Tambah kolom google_id (untuk menyimpan Google UID)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `google_id` VARCHAR(255) DEFAULT NULL UNIQUE AFTER `email`;

-- 2. Buat kolom password menjadi nullable
--    (User yang daftar via Google tidak punya password)
ALTER TABLE `users`
  MODIFY COLUMN `password` VARCHAR(255) DEFAULT NULL;

-- Verifikasi:
-- DESCRIBE users;
