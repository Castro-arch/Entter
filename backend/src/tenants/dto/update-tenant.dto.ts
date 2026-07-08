import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      'subdomain must contain only lowercase letters, numbers and hyphens',
  })
  subdomain?: string;

  // require_tld: false — the logo is served from our own BACKEND_URL, which
  // is `http://localhost:...` in dev; the default IsUrl rejects that.
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;
}
