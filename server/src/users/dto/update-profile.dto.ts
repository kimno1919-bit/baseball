import { IsOptional, IsString, IsNumber, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsNumber({}, { message: '등번호는 숫자 형식이어야 합니다.' })
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  primaryPosition?: string;

  @IsOptional()
  @IsString()
  battingHand?: string;

  @IsOptional()
  @IsString()
  throwingHand?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/, {
    message: '새 비밀번호는 최소 8자 이상, 영문과 숫자의 조합이어야 합니다.',
  })
  newPassword?: string;
}
