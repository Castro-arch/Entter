import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  ticketTypeId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  buyerName: string;

  @IsEmail()
  buyerEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buyerPhone?: string;
}
