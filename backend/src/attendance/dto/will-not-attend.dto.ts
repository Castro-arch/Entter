import { IsBoolean } from 'class-validator';

export class WillNotAttendDto {
  @IsBoolean()
  willNotAttend: boolean;
}
