import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class InvitationActionDto {
  @IsNotEmpty({ message: '가입 신청 ID는 필수 항목입니다.' })
  @IsString()
  invitationId: string;

  @IsNotEmpty({ message: '액션(APPROVE/REJECT)은 필수 항목입니다.' })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'], { message: '올바른 액션 값은 APPROVE 또는 REJECT 입니다.' })
  action: 'APPROVE' | 'REJECT';
}
// PENDING 가입 신청서 최종 처리용
