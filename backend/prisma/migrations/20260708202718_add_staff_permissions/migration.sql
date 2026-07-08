-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_certificates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_check_in" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_eventos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "can_financeiro" BOOLEAN NOT NULL DEFAULT true;
