import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { AsaasWebhookDto } from './dto/asaas-webhook.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /** Public: start a purchase for a published event's ticket type. */
  @Post('public/events/:id/checkout')
  createOrder(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.checkoutService.createOrder(eventId, dto);
  }

  /** Asaas payment webhook — provisions the attendee once payment settles. */
  @Post('webhooks/asaas')
  @HttpCode(HttpStatus.OK)
  async asaasWebhook(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() dto: AsaasWebhookDto,
  ) {
    await this.checkoutService.handleWebhook(token, dto);
    return { received: true };
  }
}
