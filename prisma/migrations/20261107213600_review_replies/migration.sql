-- AlterTable
ALTER TABLE `review` ADD COLUMN `repliedAt` DATETIME(3) NULL,
    ADD COLUMN `reply` TEXT NULL;
