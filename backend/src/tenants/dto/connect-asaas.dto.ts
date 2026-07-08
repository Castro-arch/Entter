import { IsString, MinLength } from 'class-validator';

export class ConnectAsaasDto {
  @IsString()
  @MinLength(10)
  apiKey: string;
}
