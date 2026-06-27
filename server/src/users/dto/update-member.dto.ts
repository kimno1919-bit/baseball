import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @IsNotEmpty({ message: '대상 부원 ID는 필수 항목입니다.' })
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
