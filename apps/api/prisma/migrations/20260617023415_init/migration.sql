-- CreateIndex
CREATE INDEX `facilities_building_idx` ON `facilities`(`building`);

-- CreateIndex
CREATE INDEX `facilities_is_active_idx` ON `facilities`(`is_active`);

-- CreateIndex
CREATE INDEX `reservation_charges_type_idx` ON `reservation_charges`(`type`);

-- CreateIndex
CREATE INDEX `reservations_status_idx` ON `reservations`(`status`);

-- CreateIndex
CREATE INDEX `reservations_check_in_date_idx` ON `reservations`(`check_in_date`);

-- CreateIndex
CREATE INDEX `reservations_check_out_date_idx` ON `reservations`(`check_out_date`);

-- CreateIndex
CREATE INDEX `reservations_client_type_idx` ON `reservations`(`client_type`);

-- CreateIndex
CREATE INDEX `reservations_holder_email_idx` ON `reservations`(`holder_email`);

-- CreateIndex
CREATE INDEX `users_email_idx` ON `users`(`email`);

-- CreateIndex
CREATE INDEX `users_role_idx` ON `users`(`role`);

-- CreateIndex
CREATE INDEX `users_is_active_idx` ON `users`(`is_active`);

-- RenameIndex
ALTER TABLE `facilities` RENAME INDEX `facilities_facility_type_id_fkey` TO `facilities_facility_type_id_idx`;

-- RenameIndex
ALTER TABLE `reservation_charges` RENAME INDEX `reservation_charges_reservation_id_fkey` TO `reservation_charges_reservation_id_idx`;

-- RenameIndex
ALTER TABLE `reservations` RENAME INDEX `reservations_created_by_id_fkey` TO `reservations_created_by_id_idx`;
