import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/** Days and ticket types are always loaded with an event; days stay ordered. */
const eventInclude = {
  eventDays: { orderBy: { orderIndex: 'asc' } },
  ticketTypes: { orderBy: { name: 'asc' } },
} satisfies Prisma.EventInclude;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        location: dto.location,
        coverImageUrl: dto.coverImageUrl,
        eventDays: {
          // Array order is the source of truth for orderIndex, keeping the
          // UNIQUE(event_id, order_index) constraint satisfied.
          create: dto.days.map((day, index) => ({
            date: new Date(day.date),
            orderIndex: index,
          })),
        },
        ticketTypes: {
          create: dto.ticketTypes?.map((ticket) => ({
            name: ticket.name,
            price: ticket.price,
            quantityAvailable: ticket.quantityAvailable,
            saleEndsAt: ticket.saleEndsAt ? new Date(ticket.saleEndsAt) : null,
          })),
        },
      },
      include: eventInclude,
    });
  }

  findAll(tenantId: string) {
    return this.prisma.event.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: eventInclude,
    });
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, tenantId },
      include: eventInclude,
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async update(tenantId: string, id: string, dto: UpdateEventDto) {
    // Enforce tenant ownership before mutating (findOne throws otherwise).
    await this.findOne(tenantId, id);
    return this.prisma.event.update({
      where: { id },
      data: dto,
      include: eventInclude,
    });
  }

  async updateCredential(
    tenantId: string,
    id: string,
    dto: UpdateCredentialDto,
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        credentialArtworkUrl: dto.artworkUrl,
        // `undefined` leaves the stored position untouched; a value replaces it.
        credentialNamePosition: dto.namePosition
          ? { ...dto.namePosition }
          : undefined,
      },
      include: eventInclude,
    });
  }

  async updateCertificate(
    tenantId: string,
    id: string,
    dto: UpdateCertificateDto,
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        certificateTemplateUrl: dto.templateUrl,
        certificateNamePosition: dto.namePosition
          ? { ...dto.namePosition }
          : undefined,
        certificateDispatchMode: dto.dispatchMode,
        certificateAutoDelayHours: dto.autoDelayHours,
        // Editing the config after an AUTO sweep already ran means it should
        // be eligible to run again under the new settings.
        certificatesDispatchedAt:
          dto.dispatchMode || dto.autoDelayHours !== undefined
            ? null
            : undefined,
      },
      include: eventInclude,
    });
  }

  async listParticipants(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.participant.findMany({
      where: { eventId: id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        willNotAttend: true,
        credentialSentAt: true,
        certificateSentAt: true,
        order: { select: { buyerEmail: true } },
        // One row per event day; the client picks the one matching whichever
        // day is selected (see the Check-in → Participants tab).
        attendance: {
          select: { eventDayId: true, status: true, checkedInAt: true },
        },
      },
    });
  }
}
