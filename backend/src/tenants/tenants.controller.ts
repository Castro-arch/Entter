import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ConnectAsaasDto } from './dto/connect-asaas.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch()
  @Roles('OWNER')
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(user.tenantId, dto);
  }

  @Patch('asaas')
  @Roles('OWNER')
  connectAsaas(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConnectAsaasDto,
  ) {
    return this.tenantsService.connectAsaas(user.tenantId, dto.apiKey);
  }

  @Delete('asaas')
  @Roles('OWNER')
  disconnectAsaas(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.disconnectAsaas(user.tenantId);
  }
}
