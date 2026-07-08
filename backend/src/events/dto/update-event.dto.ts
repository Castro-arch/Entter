import { EventStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Updates the event's own fields. Days and ticket types are managed through
 * their own endpoints, so they are intentionally not editable here.
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  // require_tld: false — cover images are served from our own BACKEND_URL,
  // which is `http://localhost:...` in dev; the default IsUrl rejects that.
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
