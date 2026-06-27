import { IsNotEmpty, IsString, IsOptional, IsNumberString, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: '이름은 필수 항목입니다.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '학번은 필수 항목입니다.' })
  @IsString()
  loginId: string;

  @IsNotEmpty({ message: '비밀번호는 필수 항목입니다.' })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/, {
    message: '비밀번호는 최소 8자 이상, 영문과 숫자의 조합이어야 합니다.',
  })
  password: string;

  @IsNotEmpty({ message: '전화번호는 필수 항목입니다.' })
  @IsString()
  phone: string;

  @IsOptional()
  @IsNumberString({}, { message: '등번호는 숫자 형식이어야 합니다.' })
  jerseyNumber?: string;

  @IsOptional()
  @IsString()
  primaryPosition?: string;

  @IsOptional()
  @IsString()
  battingHand?: string;

  @IsOptional()
  @IsString()
  throwingHand?: string;

  @IsNotEmpty({ message: '초대 코드는 필수 항목입니다.' })
  @IsString()
  inviteCode: string;
}
