/*
  Warnings:

  - The `procedimiento` column on the `Session` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `modo` column on the `Session` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Procedimiento" AS ENUM ('RINOPLASTIA', 'LIFTING_CEJAS', 'AUMENTO_MENTON', 'AUMENTO_LABIOS', 'LIFTING_CUELLO', 'BLEFAROPLASTIA', 'SUAVIZADO_PIEL', 'FEMINIZACION_FACIAL');

-- CreateEnum
CREATE TYPE "TecnicaSesion" AS ENUM ('QUIRURGICO', 'RINOMODELACION', 'ENDOSCOPICO', 'IMPLANTE', 'FILLER', 'LIPOSUCCION', 'SUPERIOR', 'INFERIOR', 'COMPLETO', 'LASER', 'MICRONEEDLING');

-- AlterTable
ALTER TABLE "Preset" ADD COLUMN     "procedimiento" "Procedimiento";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "procedimiento",
ADD COLUMN     "procedimiento" "Procedimiento" NOT NULL DEFAULT 'RINOPLASTIA',
DROP COLUMN "modo",
ADD COLUMN     "modo" "TecnicaSesion" NOT NULL DEFAULT 'QUIRURGICO';
