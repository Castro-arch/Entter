import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CertificatesService } from './certificates.service';

@Controller('events/:eventId')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('participants/:participantId/certificate')
  sendOne(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.certificatesService.sendOne(
      user.tenantId,
      eventId,
      participantId,
    );
  }

  @Post('certificates/send-all')
  sendAll(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.certificatesService.sendAll(user.tenantId, eventId);
  }
}
