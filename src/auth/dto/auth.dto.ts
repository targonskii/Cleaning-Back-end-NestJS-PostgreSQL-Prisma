import { IsEmail, IsString, MinLength } from 'class-validator';

export class AuthDTO {
  @IsEmail()
  email: string;

  phone: string;
  firstName: string;
  birthDay: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsString()
  password: string;
}
