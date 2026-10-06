-- DropForeignKey
ALTER TABLE `Category` DROP FOREIGN KEY `Category_parentId_fkey`;

-- DropIndex
DROP INDEX `Category_level_status_idx` ON `Category`;

-- DropIndex
DROP INDEX `Category_parentId_name_key` ON `Category`;

-- AlterTable
ALTER TABLE `Category` DROP COLUMN `level`,
    DROP COLUMN `parentId`;

-- CreateTable
CREATE TABLE `SubCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubCategory_slug_key`(`slug`),
    UNIQUE INDEX `SubCategory_categoryId_name_key`(`categoryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubSubCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `categoryId` VARCHAR(191) NOT NULL,
    `subCategoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubSubCategory_slug_key`(`slug`),
    INDEX `SubSubCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `SubSubCategory_subCategoryId_name_key`(`subCategoryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Category_name_key` ON `Category`(`name`);

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubSubCategory` ADD CONSTRAINT `SubSubCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubSubCategory` ADD CONSTRAINT `SubSubCategory_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `SubCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

