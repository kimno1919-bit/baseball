import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGameDto {
  @IsNotEmpty({ message: '시즌 ID는 필수 항목입니다.' })
  @IsString()
  seasonId: string;

  @IsNotEmpty({ message: '경기 일시는 필수 항목입니다.' })
  @IsString()
  gameDate: string;

  @IsNotEmpty({ message: '경기 장소는 필수 항목입니다.' })
  @IsString()
  location: string;

  @IsNotEmpty({ message: '상대팀명은 필수 항목입니다.' })
  @IsString()
  opponentName: string;

  @IsNotEmpty({ message: '경기 유형은 필수 항목입니다.' })
  @IsString()
  gameType: string;

  @IsNotEmpty({ message: '출결 응답 마감일시는 필수 항목입니다.' })
  @IsString()
  attendanceDeadline: string;
}
