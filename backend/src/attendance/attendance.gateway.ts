import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

export interface DaySummary {
  eventDayId: string;
  total: number;
  present: number;
  missing: number;
}

function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Pushes attendance counters to the check-in dashboard as they change, so
 * organizers see totals update live instead of polling. Authenticates the
 * same way the REST API does — the `access_token` httpOnly cookie — since
 * this is a same-origin-cookie dashboard client, not a public consumer.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class AttendanceGateway implements OnGatewayConnection {
  private readonly logger = new Logger(AttendanceGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(socket: Socket) {
    const token = readCookie(socket.handshake.headers.cookie, 'access_token');
    if (!token) {
      socket.disconnect(true);
      return;
    }
    try {
      socket.data.user = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      socket.disconnect(true);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { eventId: string },
  ) {
    const user = socket.data.user as JwtPayload | undefined;
    if (!user) {
      throw new UnauthorizedException();
    }
    const event = await this.prisma.event.findFirst({
      where: { id: body.eventId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!event) {
      // Don't confirm/deny existence to a socket outside the owning tenant.
      return;
    }
    await socket.join(`event:${body.eventId}`);
  }

  broadcastSummary(eventId: string, summary: DaySummary) {
    this.server.to(`event:${eventId}`).emit('attendance:update', summary);
  }
}
