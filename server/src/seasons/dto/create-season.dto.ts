import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateSeasonDto {
  @IsNotEmpty({ message: '시즌 이름은 필수 항목입니다.' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '시작일은 필수 항목입니다.' })
  @IsString()
  startDate: string;

  @IsNotEmpty({ message: '종료일은 필수 항목입니다.' })
  @IsString()
  endDate: string;

  @IsNotEmpty({ message: '정규 이닝 수는 필수 항목입니다.' })
  @IsNumber({}, { message: '정규 이닝 수는 숫자 형식이어야 합니다.' })
  inningsPerGame: number;

  @IsOptional()
  @IsNumber({}, { message: '콜드게임 기준 점수는 숫자 형식이어야 합니다.' })
  mercyRuleDiff?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
