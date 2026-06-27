import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class SubmitAttendanceDto {
  @IsNotEmpty({ message: '출결 상태 값은 필수입니다.' })
  @IsString()
  @IsIn(['ATTEND', 'ABSENT', 'UNDECIDED'], { message: '올바른 출결 값은 ATTEND, ABSENT, UNDECIDED 입니다.' })
  response: 'ATTEND' | 'ABSENT' | 'UNDECIDED';

  @IsOptional()
  @IsString()
  absentReason?: string;
}
