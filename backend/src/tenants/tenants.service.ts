import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AsaasService } from '../payments/asaas.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    return this.toProfile(tenant);
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    let tenant;
    try {
      tenant = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('subdomain already in use');
      }
      throw error;
    }
    return this.toProfile(tenant);
  }

  async connectAsaas(tenantId: string, apiKey: string) {
    const valid = await this.asaas.validateApiKey(apiKey);
    if (!valid) {
      throw new BadRequestException('Chave inválida');
    }
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { asaasApiKey: apiKey },
    });
    return this.toProfile(tenant);
  }

  async disconnectAsaas(tenantId: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { asaasApiKey: null },
    });
    return this.toProfile(tenant);
  }

  private toProfile(tenant: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl: string | null;
    asaasApiKey: string | null;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      logoUrl: tenant.logoUrl,
      asaasConnected: Boolean(tenant.asaasApiKey),
    };
  }
}
