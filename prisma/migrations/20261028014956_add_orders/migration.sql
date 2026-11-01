-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` INTEGER NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `paymentMethod` ENUM('COD', 'STRIPE') NOT NULL,
    `paymentStatus` ENUM('UNPAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `stripePaymentIntentId` VARCHAR(255) NULL,
    `shipName` VARCHAR(120) NOT NULL,
    `shipPhone` VARCHAR(32) NOT NULL,
    `shipEmail` VARCHAR(191) NOT NULL,
    `shipAddressType` ENUM('HOME', 'OFFICE', 'OTHER') NOT NULL DEFAULT 'HOME',
    `shipCountry` VARCHAR(60) NOT NULL,
    `shipCity` VARCHAR(120) NOT NULL,
    `shipZip` VARCHAR(20) NOT NULL,
    `shipAddress` VARCHAR(500) NOT NULL,
    `billingSameAsShipping` BOOLEAN NOT NULL DEFAULT true,
    `billName` VARCHAR(120) NULL,
    `billPhone` VARCHAR(32) NULL,
    `billEmail` VARCHAR(191) NULL,
    `billAddressType` ENUM('HOME', 'OFFICE', 'OTHER') NULL,
    `billCountry` VARCHAR(60) NULL,
    `billCity` VARCHAR(120) NULL,
    `billZip` VARCHAR(20) NULL,
    `billAddress` VARCHAR(500) NULL,
    `note` VARCHAR(500) NULL,
    `subtotal` INTEGER NOT NULL,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `shipping` INTEGER NOT NULL DEFAULT 0,
    `tax` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `Order_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    INDEX `Order_customerId_createdAt_idx`(`customerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'PACKAGING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `subtotal` INTEGER NOT NULL,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `shipping` INTEGER NOT NULL DEFAULT 0,
    `tax` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL,
    `commissionRate` INTEGER NOT NULL DEFAULT 1000,
    `commission` INTEGER NOT NULL DEFAULT 0,
    `couponId` VARCHAR(191) NULL,
    `couponCode` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StoreOrder_vendorId_status_idx`(`vendorId`, `status`),
    INDEX `StoreOrder_couponId_idx`(`couponId`),
    UNIQUE INDEX `StoreOrder_orderId_vendorId_key`(`orderId`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `storeOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `variationId` VARCHAR(191) NULL,
    `productName` VARCHAR(200) NOT NULL,
    `productSlug` VARCHAR(220) NULL,
    `sku` VARCHAR(64) NULL,
    `variationName` VARCHAR(160) NULL,
    `image` VARCHAR(191) NULL,
    `unitPrice` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `tax` INTEGER NOT NULL DEFAULT 0,
    `lineTotal` INTEGER NOT NULL,

    INDEX `OrderItem_storeOrderId_idx`(`storeOrderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    INDEX `OrderItem_variationId_idx`(`variationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreOrder` ADD CONSTRAINT `StoreOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreOrder` ADD CONSTRAINT `StoreOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreOrder` ADD CONSTRAINT `StoreOrder_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_storeOrderId_fkey` FOREIGN KEY (`storeOrderId`) REFERENCES `StoreOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `ProductVariation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
