import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AuthDTO } from './dto/auth.dto';
import { hash, verify } from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: AuthDTO) {
    return this.validateUser(dto);
  }

  async getNewTokens(refreshToken: string) {
    const userId = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const tokens = await this.issueTokens(user.id);

    return { user: this.returnUserFields(user), ...tokens };
  }

  async register(dto: AuthDTO) {
    await this.ensureUniqueEmailAndPhone(dto.email, dto.phone);

    const hashedPassword = await hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        birthDay: dto.birthDay,
      },
    });

    const tokens = await this.issueTokens(user.id);

    return { user: this.returnUserFields(user), ...tokens };
  }

  private async verifyRefreshToken(refreshToken: string) {
    const result = await this.jwtService.verifyAsync(refreshToken);
    if (!result) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return result.id;
  }

  private async ensureUniqueEmailAndPhone(email: string, phone: string) {
    const userByEmail = await this.prisma.user.findFirst({
      where: { email },
    });

    if (userByEmail) {
      throw new BadRequestException('Email is already registered');
    }

    const userByPhone = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (userByPhone) {
      throw new BadRequestException('Phone number is already registered');
    }
  }

  private async issueTokens(userId: number) {
    const data = { id: userId };
    const accessToken = this.jwtService.sign(data, {
      expiresIn: '1h',
    });
    const refreshToken = this.jwtService.sign(data, {
      expiresIn: '3d',
    });

    return { accessToken, refreshToken };
  }

  private returnUserFields(user: User) {
    return {
      id: user.id,
      email: user.email,
    };
  }

  private async validateUser(dto: AuthDTO) {
    const user = await this.getUserByEmailOrPhone(dto.email, dto.phone);

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    const isValidPassword = await verify(user.password, dto.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    return user;
  }

  private async getUserByEmailOrPhone(email: string, phone: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    return user;
  }
}
