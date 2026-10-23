-- AlterTable
ALTER TABLE `coupon` ADD COLUMN `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `rejectionReason` VARCHAR(500) NULL;

-- Coupons that existed before admin review keep working: grandfather them as APPROVED.
UPDATE `coupon` SET `approvalStatus` = 'APPROVED';
