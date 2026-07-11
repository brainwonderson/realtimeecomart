-- Add original_price column to products table
ALTER TABLE `products` ADD COLUMN `original_price` DECIMAL(10,2) DEFAULT NULL AFTER `price`;
