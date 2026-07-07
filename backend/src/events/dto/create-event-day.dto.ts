import { IsDateString } from 'class-validator';

export class CreateEventDayDto {
  /** Calendar day of the event, as an ISO 8601 date (YYYY-MM-DD). */
  @IsDateString()
  date: string;
}
