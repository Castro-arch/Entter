import { Module } from '@nestjs/common';
import { AsaasService } from '../payments/asaas.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, AsaasService],
})
export class CheckoutModule {}
