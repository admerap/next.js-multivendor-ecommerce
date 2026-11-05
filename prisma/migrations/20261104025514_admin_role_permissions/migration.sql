-- CreateTable
CREATE TABLE `AdminRolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(40) NOT NULL,
    `canRead` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canUpdate` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminRolePermission_roleId_module_key`(`roleId`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminRolePermission` ADD CONSTRAINT `AdminRolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `AdminRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
