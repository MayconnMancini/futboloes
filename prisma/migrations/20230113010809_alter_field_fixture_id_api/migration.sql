/*
  Warnings:

  - You are about to drop the column `FixtureIdApi` on the `jogo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `jogo` DROP COLUMN `FixtureIdApi`,
    ADD COLUMN `fixtureIdApi` INTEGER NULL;
