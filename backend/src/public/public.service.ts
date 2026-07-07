import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Only attendee-facing fields — never the tenant id, Asaas ids, or the
 * credential/certificate configuration.
 */
const publicEventSelect = {
  id: true,
  name: true,
  description: true,
  location: true,
  coverImageUrl: true,
  eventDays: {
    select: { id: true, date: true, orderIndex: true },
    orderBy: { orderIndex: 'asc' },
  },
  ticketTypes: {
    select: {
      id: true,
      name: true,
      price: true,
      quantityAvailable: true,
      saleEndsAt: true,
    },
    orderBy: { name: 'asc' },
  },
} satisfies Prisma.EventSelect;

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvent(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: 'PUBLISHED' },
      select: publicEventSelect,
    });
    if (!event) {
      // Draft/finished events are indistinguishable from missing ones publicly.
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async listTenantEvents(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, name: true },
    });
    if (!tenant) {
      throw new NotFoundException('Organizer not found');
    }
    const events = await this.prisma.event.findMany({
      where: { tenantId: tenant.id, status: 'PUBLISHED' },
      select: publicEventSelect,
      orderBy: { createdAt: 'desc' },
    });
    return { organizer: tenant.name, events };
  }
}
