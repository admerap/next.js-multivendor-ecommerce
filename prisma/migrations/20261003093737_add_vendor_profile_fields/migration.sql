-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `coverImage` VARCHAR(191) NULL,
    ADD COLUMN `logo` VARCHAR(191) NULL,
    ADD COLUMN `tinCertificate` VARCHAR(191) NULL,
    ADD COLUMN `tinExpiresAt` DATE NULL,
    ADD COLUMN `tinNumber` VARCHAR(40) NULL,
    ADD COLUMN `vendorImage` VARCHAR(191) NULL;
