import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePermissionsDto {
  @IsOptional()
  @IsBoolean()
  canCheckIn?: boolean;

  @IsOptional()
  @IsBoolean()
  canCertificates?: boolean;

  @IsOptional()
  @IsBoolean()
  canFinanceiro?: boolean;

  @IsOptional()
  @IsBoolean()
  canEventos?: boolean;
}
