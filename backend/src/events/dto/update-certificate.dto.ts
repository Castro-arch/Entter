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
  // require_tld: false — templates are served from our own BACKEND_URL, which
  // is `http://localhost:...` in dev; the default IsUrl rejects that as TLD-less.
  @IsOptional()
  @IsUrl({ require_tld: false })
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
