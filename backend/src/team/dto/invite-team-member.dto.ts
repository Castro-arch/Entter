import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteTeamMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;
}
