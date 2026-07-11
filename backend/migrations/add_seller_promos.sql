-- Migration for Seller Promotions feature
USE `realtime`;

CREATE TABLE IF NOT EXISTS `seller_promos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `discount_percentage` INT NOT NULL DEFAULT 0,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('UPCOMING', 'ACTIVE', 'ENDED') NOT NULL DEFAULT 'UPCOMING',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_seller_promos_seller_id` (`seller_id`),
  INDEX `idx_seller_promos_status` (`status`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `seller_promo_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `promo_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  FOREIGN KEY (`promo_id`) REFERENCES `seller_promos` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_promo_product` (`promo_id`, `product_id`)
) ENGINE=InnoDB;
