-- AlterTable
ALTER TABLE `user` ADD COLUMN `adminRoleId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_adminRoleId_fkey` FOREIGN KEY (`adminRoleId`) REFERENCES `AdminRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
