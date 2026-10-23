-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `productType` ENUM('PHYSICAL', 'DIGITAL') NOT NULL DEFAULT 'PHYSICAL',
    `unit` ENUM('PC', 'KG', 'G', 'BOX', 'PAIR') NOT NULL DEFAULT 'PC',
    `shortDescription` VARCHAR(500) NULL,
    `description` TEXT NOT NULL,
    `tags` JSON NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `subCategoryId` VARCHAR(191) NULL,
    `subSubCategoryId` VARCHAR(191) NULL,
    `brandId` VARCHAR(191) NULL,
    `price` INTEGER NOT NULL,
    `compareAtPrice` INTEGER NULL,
    `discountType` ENUM('FLAT', 'PERCENT') NOT NULL DEFAULT 'FLAT',
    `discountValue` INTEGER NOT NULL DEFAULT 0,
    `taxRate` INTEGER NULL,
    `shippingCost` INTEGER NOT NULL DEFAULT 0,
    `shippingPerUnit` BOOLEAN NOT NULL DEFAULT false,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `minOrderQty` INTEGER NOT NULL DEFAULT 1,
    `thumbnail` VARCHAR(191) NULL,
    `videoUrl` VARCHAR(255) NULL,
    `variantOptions` JSON NULL,
    `metaTitle` VARCHAR(120) NULL,
    `metaDescription` VARCHAR(320) NULL,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    INDEX `Product_vendorId_approvalStatus_idx`(`vendorId`, `approvalStatus`),
    INDEX `Product_approvalStatus_isActive_idx`(`approvalStatus`, `isActive`),
    INDEX `Product_categoryId_idx`(`categoryId`),
    INDEX `Product_subCategoryId_idx`(`subCategoryId`),
    INDEX `Product_subSubCategoryId_idx`(`subSubCategoryId`),
    INDEX `Product_brandId_idx`(`brandId`),
    UNIQUE INDEX `Product_vendorId_sku_key`(`vendorId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductImage_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariation` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `attributes` JSON NOT NULL,
    `sku` VARCHAR(64) NULL,
    `price` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `image` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariation_productId_name_key`(`productId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `SubCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subSubCategoryId_fkey` FOREIGN KEY (`subSubCategoryId`) REFERENCES `SubSubCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariation` ADD CONSTRAINT `ProductVariation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
