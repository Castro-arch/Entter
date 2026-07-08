import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { AttendanceService } from './attendance.service';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { CheckInDto } from './dto/check-in.dto';
import { WillNotAttendDto } from './dto/will-not-attend.dto';

@Controller('events/:eventId/attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('checkIn')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(user.tenantId, eventId, dto);
  }

  @Post('batch-sync')
  batchSync(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: BatchSyncDto,
  ) {
    return this.attendanceService.batchSync(user.tenantId, eventId, dto);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.attendanceService.getSummary(user.tenantId, eventId);
  }

  @Get('search')
  search(
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('eventDayId', ParseUUIDPipe) eventDayId: string,
    @Query('q') query: string = '',
  ) {
    return this.attendanceService.search(
      user.tenantId,
      eventId,
      eventDayId,
      query,
    );
  }

  @Patch('participants/:participantId/will-not-attend')
  setWillNotAttend(
    @CurrentUser() user: JwtPayload,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() dto: WillNotAttendDto,
  ) {
    return this.attendanceService.setWillNotAttend(
      user.tenantId,
      participantId,
      dto.willNotAttend,
    );
  }
}
