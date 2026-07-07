import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class AsaasWebhookPayment {
  @IsString()
  id: string;
}

/** The subset of the Asaas webhook body we rely on. */
export class AsaasWebhookDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AsaasWebhookPayment)
  payment?: AsaasWebhookPayment;
}
