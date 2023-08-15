import { IsString } from 'class-validator';

export class refreshTokenDTO {
  @IsString()
  refreshToken: string;
}
