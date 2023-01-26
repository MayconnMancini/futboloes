-- AlterTable
ALTER TABLE `jogo` ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `flag` VARCHAR(191) NULL,
    ADD COLUMN `logo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `palpite` ADD COLUMN `pontuacao` INTEGER NULL;
