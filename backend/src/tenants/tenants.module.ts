import { Module } from '@nestjs/common';
import { AsaasService } from '../payments/asaas.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, AsaasService],
})
export class TenantsModule {}
