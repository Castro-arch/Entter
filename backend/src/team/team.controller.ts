import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { TeamService } from './team.service';

@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.teamService.findAll(user.tenantId);
  }

  @Post()
  @Roles('OWNER')
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteTeamMemberDto) {
    return this.teamService.invite(user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamService.remove(user.tenantId, id);
  }

  @Patch(':id/permissions')
  @Roles('OWNER')
  updatePermissions(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.teamService.updatePermissions(user.tenantId, id, dto);
  }
}
