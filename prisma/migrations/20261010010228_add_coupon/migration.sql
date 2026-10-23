-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `type` ENUM('DISCOUNT', 'FREE_DELIVERY', 'FIRST_ORDER') NOT NULL DEFAULT 'DISCOUNT',
    `discountType` ENUM('AMOUNT', 'PERCENTAGE') NOT NULL DEFAULT 'AMOUNT',
    `discountValue` INTEGER NOT NULL DEFAULT 0,
    `scope` ENUM('STORE_WIDE', 'SPECIFIC_PRODUCTS') NOT NULL DEFAULT 'STORE_WIDE',
    `minPurchase` INTEGER NOT NULL DEFAULT 0,
    `maxDiscount` INTEGER NULL,
    `usageLimit` INTEGER NULL,
    `limitPerUser` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `startsAt` DATE NOT NULL,
    `expiresAt` DATE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Coupon_vendorId_isActive_idx`(`vendorId`, `isActive`),
    UNIQUE INDEX `Coupon_vendorId_code_key`(`vendorId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CouponProduct` (
    `couponId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,

    INDEX `CouponProduct_productId_idx`(`productId`),
    PRIMARY KEY (`couponId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponProduct` ADD CONSTRAINT `CouponProduct_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CouponProduct` ADD CONSTRAINT `CouponProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
