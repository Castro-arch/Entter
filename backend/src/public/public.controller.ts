import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PublicService } from './public.service';

/** Unauthenticated, attendee-facing endpoints for published events. */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('events/:id')
  getEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicService.getEvent(id);
  }

  @Get('tenants/:subdomain/events')
  listTenantEvents(@Param('subdomain') subdomain: string) {
    return this.publicService.listTenantEvents(subdomain);
  }
}
