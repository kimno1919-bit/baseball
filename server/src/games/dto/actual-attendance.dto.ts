import { IsNotEmpty, IsArray, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ActualAttendanceItem {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsBoolean()
  actualAttended: boolean;
}

export class ActualAttendanceDto {
  @IsNotEmpty({ message: '출석 목록 데이터는 필수입니다.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActualAttendanceItem)
  attendances: ActualAttendanceItem[];
}
