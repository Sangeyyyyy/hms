-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `emergency_contact_name` VARCHAR(191) NULL,
    ADD COLUMN `emergency_contact_phone` VARCHAR(191) NULL,
    ADD COLUMN `emergency_contact_relation` VARCHAR(191) NULL,
    ADD COLUMN `function_hall_preferred_time` VARCHAR(191) NULL,
    ADD COLUMN `has_availed_before` BOOLEAN NULL,
    ADD COLUMN `holder_address` VARCHAR(191) NULL,
    ADD COLUMN `holder_city` VARCHAR(191) NULL,
    ADD COLUMN `holder_country` VARCHAR(191) NULL DEFAULT 'Philippines',
    ADD COLUMN `holder_gender` VARCHAR(191) NULL,
    ADD COLUMN `holder_state` VARCHAR(191) NULL,
    ADD COLUMN `holder_zip_code` VARCHAR(191) NULL,
    ADD COLUMN `preferred_contact_method` VARCHAR(191) NULL,
    ADD COLUMN `referral_source` VARCHAR(191) NULL;
