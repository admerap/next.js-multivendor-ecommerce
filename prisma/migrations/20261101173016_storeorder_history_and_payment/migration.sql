-- AlterTable
ALTER TABLE `storeorder` ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paymentStatus` ENUM('UNPAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID';

-- CreateTable
CREATE TABLE `StoreOrderStatusEvent` (
    `id` VARCHAR(191) NOT NULL,
    `storeOrderId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PACKAGING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELED') NOT NULL,
    `actorRole` ENUM('CUSTOMER', 'VENDOR', 'ADMIN') NULL,
    `actorId` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoreOrderStatusEvent_storeOrderId_createdAt_idx`(`storeOrderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreOrderStatusEvent` ADD CONSTRAINT `StoreOrderStatusEvent_storeOrderId_fkey` FOREIGN KEY (`storeOrderId`) REFERENCES `StoreOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (adds data only; nothing is removed or rewritten except the new columns):
-- 1. Each existing seller part takes its order's payment status (COD orders were paid as a whole so far).
UPDATE `storeorder` s JOIN `order` o ON o.id = s.orderId
SET s.paymentStatus = o.paymentStatus,
    s.paidAt = IF(o.paymentStatus = 'PAID', s.updatedAt, NULL);

-- 2. History starts with what is known: placed (the order's date, by the customer) and, when the part has
--    moved on, its current status at its last update (who did it isn't known → NULL). The in-between steps
--    of these older orders have no recorded date, so none are invented.
INSERT INTO `StoreOrderStatusEvent` (`id`, `storeOrderId`, `status`, `actorRole`, `actorId`, `createdAt`)
SELECT CONCAT('bf', REPLACE(UUID(), '-', '')), s.id, 'PENDING', 'CUSTOMER', o.customerId, o.createdAt
FROM `storeorder` s JOIN `order` o ON o.id = s.orderId;

INSERT INTO `StoreOrderStatusEvent` (`id`, `storeOrderId`, `status`, `actorRole`, `actorId`, `createdAt`)
SELECT CONCAT('bf', REPLACE(UUID(), '-', '')), s.id, s.status, NULL, NULL, s.updatedAt
FROM `storeorder` s
WHERE s.status <> 'PENDING';
