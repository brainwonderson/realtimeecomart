-- Add EXPIRED status to flash_sale_proposals table status enum
USE `realtime`;

ALTER TABLE `flash_sale_proposals`
MODIFY COLUMN `status` ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING';
