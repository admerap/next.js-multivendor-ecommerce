-- CreateTable
CREATE TABLE `AdminRole` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminRole_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The Super Admin role: full access, can't be deleted or switched off (isSystem).
INSERT INTO `AdminRole` (`id`, `name`, `description`, `isActive`, `isSystem`, `createdAt`, `updatedAt`)
VALUES ('role-super-admin', 'Super Admin', 'Full access to all modules', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
