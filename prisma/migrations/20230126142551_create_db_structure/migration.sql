-- CreateTable
CREATE TABLE `Bolao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `donoBolaoId` INTEGER NULL,

    UNIQUE INDEX `Bolao_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participante` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `bolao_id` INTEGER NOT NULL,

    UNIQUE INDEX `Participante_usuario_id_bolao_id_key`(`usuario_id`, `bolao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NULL,
    `googleId` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fixtureIdApi` INTEGER NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `timeCasa` VARCHAR(191) NOT NULL,
    `timeFora` VARCHAR(191) NOT NULL,
    `competicao` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `flag` VARCHAR(191) NULL,
    `logoTimeCasa` VARCHAR(191) NULL,
    `logoTimeFora` VARCHAR(191) NULL,
    `resultGolTimeCasa` INTEGER NULL,
    `resultGolTimeFora` INTEGER NULL,
    `statusJogo` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jogo_bolao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jogo_id` INTEGER NOT NULL,
    `bolao_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Jogo_bolao_jogo_id_bolao_id_key`(`jogo_id`, `bolao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Palpite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `golTimeCasa` INTEGER NOT NULL,
    `golTimeFora` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pontuacao` INTEGER NULL,
    `jogoBolao_id` INTEGER NOT NULL,
    `participante_id` INTEGER NOT NULL,

    UNIQUE INDEX `Palpite_participante_id_jogoBolao_id_key`(`participante_id`, `jogoBolao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bolao` ADD CONSTRAINT `Bolao_donoBolaoId_fkey` FOREIGN KEY (`donoBolaoId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participante` ADD CONSTRAINT `Participante_bolao_id_fkey` FOREIGN KEY (`bolao_id`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participante` ADD CONSTRAINT `Participante_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo_bolao` ADD CONSTRAINT `Jogo_bolao_bolao_id_fkey` FOREIGN KEY (`bolao_id`) REFERENCES `Bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jogo_bolao` ADD CONSTRAINT `Jogo_bolao_jogo_id_fkey` FOREIGN KEY (`jogo_id`) REFERENCES `Jogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Palpite` ADD CONSTRAINT `Palpite_participante_id_fkey` FOREIGN KEY (`participante_id`) REFERENCES `Participante`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Palpite` ADD CONSTRAINT `Palpite_jogoBolao_id_fkey` FOREIGN KEY (`jogoBolao_id`) REFERENCES `Jogo_bolao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
