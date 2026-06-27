import { IsOptional, IsString } from 'class-validator';

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  gameDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  opponentName?: string;

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsString()
  attendanceDeadline?: string;
}
// 확정된 경기의 경우 gameDate, location 외 다른 필드 변경 검증은 서비스 단에서 차단
