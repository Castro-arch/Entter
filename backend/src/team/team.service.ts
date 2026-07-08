import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

const SALT_ROUNDS = 10;

const MEMBER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  canCheckIn: true,
  canCertificates: true,
  canFinanceiro: true,
  canEventos: true,
} as const;

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: MEMBER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(tenantId: string, dto: InviteTeamMemberDto) {
    const temporaryPassword = randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: 'STAFF',
        },
        select: MEMBER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('email already in use');
      }
      throw error;
    }

    return { user, temporaryPassword };
  }

  async remove(tenantId: string, userId: string) {
    const { count } = await this.prisma.user.deleteMany({
      where: { id: userId, tenantId, role: 'STAFF' },
    });
    if (count === 0) {
      throw new NotFoundException('Team member not found');
    }
  }

  async updatePermissions(
    tenantId: string,
    userId: string,
    dto: UpdatePermissionsDto,
  ) {
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, tenantId, role: 'STAFF' },
      data: dto,
    });
    if (count === 0) {
      throw new NotFoundException('Team member not found');
    }
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: MEMBER_SELECT,
    });
  }
}
