-- Migration: Tambah kolom type dan seller_id ke promo_banners
-- Jalankan: mysql -u root realtime < add_banner_type_seller.sql

ALTER TABLE promo_banners
  ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'homepage' AFTER `title`,
  ADD COLUMN `seller_id` INT DEFAULT NULL AFTER `type`,
  ADD INDEX `idx_banners_type` (`type`),
  ADD INDEX `idx_banners_seller_id` (`seller_id`);

-- Update banner yang sudah ada menjadi tipe 'homepage' milik admin (seller_id NULL)
UPDATE promo_banners SET `type` = 'homepage' WHERE `seller_id` IS NULL;
