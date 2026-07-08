import { Type } from 'class-transformer';
import {
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

/**
 * Where the attendee's name is composited on the credential artwork. Stored as
 * percentages (and font size relative to artwork height) so the placement is
 * resolution-independent — the editor preview and the final render can differ
 * in pixel size and still line up. See the README's engineering decisions.
 */
export class NamePositionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  xPct: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  yPct: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  fontPct?: number;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(TextAlign)
  align?: TextAlign;
}

export class UpdateCredentialDto {
  // require_tld: false — artwork is served from our own BACKEND_URL, which is
  // `http://localhost:...` in dev; the default IsUrl rejects that as TLD-less.
  @IsOptional()
  @IsUrl({ require_tld: false })
  artworkUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NamePositionDto)
  namePosition?: NamePositionDto;
}
