import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsaasService } from '../payments/asaas.service';
import { PrismaService } from '../prisma/prisma.service';
import { signQrToken } from '../qr/qr-token';
import { AsaasWebhookDto } from './dto/asaas-webhook.dto';
import { CreateOrderDto } from './dto/create-order.dto';

/** Asaas events that mean the money has actually arrived. */
const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly qrSecret: string;
  private readonly webhookToken: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly config: ConfigService,
  ) {
    this.qrSecret =
      this.config.get<string>('QR_SECRET') ??
      this.config.getOrThrow<string>('JWT_SECRET');
    this.webhookToken = this.config.get<string>('ASAAS_WEBHOOK_TOKEN');
  }

  async createOrder(eventId: string, dto: CreateOrderDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: 'PUBLISHED' },
      include: { ticketTypes: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const ticket = event.ticketTypes.find((t) => t.id === dto.ticketTypeId);
    if (!ticket) {
      throw new NotFoundException('Ticket type not found');
    }
    if (ticket.quantityAvailable <= 0) {
      throw new ConflictException('This ticket type is sold out');
    }
    if (ticket.saleEndsAt && ticket.saleEndsAt.getTime() < Date.now()) {
      throw new BadRequestException('Sales for this ticket type have ended');
    }

    const order = await this.prisma.order.create({
      data: {
        eventId,
        ticketTypeId: ticket.id,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        buyerPhone: dto.buyerPhone,
      },
    });

    const payment = await this.asaas.createPayment({
      orderId: order.id,
      eventId,
      value: Number(ticket.price),
      description: `${event.name} — ${ticket.name}`,
      buyer: {
        name: dto.buyerName,
        email: dto.buyerEmail,
        phone: dto.buyerPhone,
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { asaasPaymentId: payment.id },
    });

    return {
      orderId: order.id,
      status: order.status,
      paymentUrl: payment.invoiceUrl,
    };
  }

  handleWebhook(token: string | undefined, dto: AsaasWebhookDto) {
    if (this.webhookToken && token !== this.webhookToken) {
      throw new UnauthorizedException('Invalid webhook token');
    }
    if (!PAID_EVENTS.has(dto.event) || !dto.payment) {
      return; // Not a settlement we act on.
    }
    return this.provisionFromPayment(dto.payment.id);
  }

  /**
   * Turns a paid order into an attendee. Idempotent: a repeated webhook for an
   * order that is already paid is a no-op, and the unique `order_id` on
   * Participant is the final backstop against duplicates.
   */
  private async provisionFromPayment(asaasPaymentId: string) {
    const order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
    });
    if (!order) {
      this.logger.warn(`Webhook for unknown payment ${asaasPaymentId}`);
      return;
    }
    if (order.status === 'PAID') {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      const participant = await tx.participant.create({
        data: {
          orderId: order.id,
          eventId: order.eventId,
          name: order.buyerName,
        },
      });

      await tx.participant.update({
        where: { id: participant.id },
        data: {
          qrToken: signQrToken(
            { p: participant.id, e: order.eventId },
            this.qrSecret,
          ),
        },
      });

      await tx.ticketType.update({
        where: { id: order.ticketTypeId },
        data: { quantityAvailable: { decrement: 1 } },
      });

      // Check-in does an atomic `UPDATE ... WHERE status = 'PENDING'`, which
      // requires the row to already exist — created here, once, rather than
      // lazily at check-in time, to keep that update a pure state transition.
      const eventDays = await tx.eventDay.findMany({
        where: { eventId: order.eventId },
        select: { id: true },
      });
      if (eventDays.length > 0) {
        await tx.attendance.createMany({
          data: eventDays.map((day) => ({
            participantId: participant.id,
            eventDayId: day.id,
          })),
        });
      }
    });

    this.logger.log(`Provisioned attendee for order ${order.id}`);
  }
}
