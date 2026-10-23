-- AlterTable
ALTER TABLE `product` ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPopular` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `rejectionReason` VARCHAR(500) NULL;
