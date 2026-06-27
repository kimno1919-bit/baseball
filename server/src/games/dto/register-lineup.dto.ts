import { IsNotEmpty, IsArray, IsString, IsBoolean, IsOptional, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LineupItem {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsOptional()
  @IsInt()
  battingOrder: number | null;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsNotEmpty()
  @IsBoolean()
  isStarter: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isStartingPitcher: boolean;
}

export class RegisterLineupDto {
  @IsNotEmpty({ message: '라인업 목록 데이터는 필수입니다.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupItem)
  lineups: LineupItem[];
}
