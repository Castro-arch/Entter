import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export enum CheckInMethodDto {
  QR = 'QR',
  MANUAL = 'MANUAL',
}

export class CheckInDto {
  @IsUUID()
  eventDayId: string;

  @IsEnum(CheckInMethodDto)
  method: CheckInMethodDto;

  @ValidateIf((dto: CheckInDto) => dto.method === CheckInMethodDto.QR)
  @IsString()
  qrToken?: string;

  @ValidateIf((dto: CheckInDto) => dto.method === CheckInMethodDto.MANUAL)
  @IsUUID()
  participantId?: string;

  /** Echoed back in the response so the offline queue can reconcile it. */
  @IsOptional()
  @IsString()
  clientId?: string;
}
