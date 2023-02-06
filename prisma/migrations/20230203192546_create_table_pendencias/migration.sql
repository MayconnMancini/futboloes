-- CreateTable
CREATE TABLE `Pendencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `bolao_id` INTEGER NOT NULL,

    UNIQUE INDEX `Pendencias_usuario_id_bolao_id_key`(`usuario_id`, `bolao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pendencias` ADD CONSTRAINT `Pendencias_bolao_id_fkey` FOREIGN KEY (`bolao_id`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pendencias` ADD CONSTRAINT `Pendencias_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
