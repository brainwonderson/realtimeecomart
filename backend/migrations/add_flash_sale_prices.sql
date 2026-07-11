-- Add original_price and flash_sale_price columns to flash_sale_proposals table
USE `realtime`;

ALTER TABLE `flash_sale_proposals`
ADD COLUMN `original_price` DECIMAL(10,2) DEFAULT NULL AFTER `message`,
ADD COLUMN `flash_sale_price` DECIMAL(10,2) DEFAULT NULL AFTER `original_price`;
