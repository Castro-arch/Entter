import { Type } from 'class-transformer';
import { ArrayMaxSize, ValidateNested } from 'class-validator';
import { CheckInDto } from './check-in.dto';

export class BatchSyncDto {
  @ValidateNested({ each: true })
  @Type(() => CheckInDto)
  @ArrayMaxSize(500)
  checkIns: CheckInDto[];
}
