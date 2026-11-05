-- AlterTable
ALTER TABLE `adminrole` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` VARCHAR(40) NULL;
