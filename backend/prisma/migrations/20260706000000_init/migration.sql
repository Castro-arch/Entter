-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('DRAFT', 'PUBLISHED', 'FINISHED');

-- CreateEnum
CREATE TYPE "certificate_dispatch_mode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('PENDING', 'PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "check_in_method" AS ENUM ('QR', 'MANUAL');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "asaas_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "location" TEXT,
    "status" "event_status" NOT NULL DEFAULT 'DRAFT',
    "credential_artwork_url" TEXT,
    "credential_name_position" JSONB,
    "certificate_template_url" TEXT,
    "certificate_name_position" JSONB,
    "certificate_dispatch_mode" "certificate_dispatch_mode" NOT NULL DEFAULT 'MANUAL',
    "certificate_auto_delay_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_days" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "event_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity_available" INTEGER NOT NULL,
    "sale_ends_at" TIMESTAMP(3),

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "ticket_type_id" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_phone" TEXT,
    "asaas_payment_id" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qr_token" TEXT,
    "credential_generated_at" TIMESTAMP(3),
    "credential_sent_at" TIMESTAMP(3),
    "certificate_sent_at" TIMESTAMP(3),
    "will_not_attend" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "event_day_id" TEXT NOT NULL,
    "status" "attendance_status" NOT NULL DEFAULT 'PENDING',
    "checked_in_at" TIMESTAMP(3),
    "method" "check_in_method",

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "events_tenant_id_idx" ON "events"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_days_event_id_order_index_key" ON "event_days"("event_id", "order_index");

-- CreateIndex
CREATE INDEX "ticket_types_event_id_idx" ON "ticket_types"("event_id");

-- CreateIndex
CREATE INDEX "orders_event_id_idx" ON "orders"("event_id");

-- CreateIndex
CREATE INDEX "orders_ticket_type_id_idx" ON "orders"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_order_id_key" ON "participants"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_qr_token_key" ON "participants"("qr_token");

-- CreateIndex
CREATE INDEX "participants_event_id_idx" ON "participants"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_participant_id_event_day_id_key" ON "attendance"("participant_id", "event_day_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_days" ADD CONSTRAINT "event_days_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_day_id_fkey" FOREIGN KEY ("event_day_id") REFERENCES "event_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

