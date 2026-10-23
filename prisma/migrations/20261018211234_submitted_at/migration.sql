-- AlterTable
ALTER TABLE `coupon` ADD COLUMN `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `product` ADD COLUMN `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `Coupon_approvalStatus_submittedAt_idx` ON `Coupon`(`approvalStatus`, `submittedAt`);

-- CreateIndex
CREATE INDEX `Product_approvalStatus_submittedAt_idx` ON `Product`(`approvalStatus`, `submittedAt`);

-- Existing rows: their submission is their creation (resubmission dates were never recorded before).
UPDATE `product` SET `submittedAt` = `createdAt`;
UPDATE `coupon` SET `submittedAt` = `createdAt`;
