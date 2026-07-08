import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { NamePositionDto } from './update-credential.dto';

export enum CertificateDispatchModeDto {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

export class UpdateCertificateDto {
  @IsOptional()
  @IsUrl()
  templateUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NamePositionDto)
  namePosition?: NamePositionDto;

  @IsOptional()
  @IsEnum(CertificateDispatchModeDto)
  dispatchMode?: CertificateDispatchModeDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 30)
  autoDelayHours?: number;
}
