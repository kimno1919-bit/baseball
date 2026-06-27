import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { InvitationActionDto } from './dto/invitation-action.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard) // 글로벌로 JwtAuthGuard 와 RolesGuard 바인딩
export class UsersController {
  constructor(private usersService: UsersService) {}

  // A. 일반 부원 공통 프로필 변경
  @Patch('users/profile')
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user, dto);
  }

  // B. [교사 전용] 부원 권한 목록 조회
  @Get('admin/members')
  @Roles('ADMIN')
  async getMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMembers(user);
  }

  // C. [교사 전용] 부원 정보/권한/상태 설정
  @Patch('admin/members')
  @Roles('ADMIN')
  async updateMember(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMemberDto) {
    return this.usersService.updateMember(user, dto);
  }

  // D. [교사 전용] 가입 신청 목록 조회
  @Get('admin/invitations')
  @Roles('ADMIN')
  async getInvitations(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getInvitations(user);
  }

  // E. [교사 전용] 가입 신청 승인/거절 액션
  @Post('admin/invitations')
  @Roles('ADMIN')
  async handleInvitation(@CurrentUser() user: AuthenticatedUser, @Body() dto: InvitationActionDto) {
    return this.usersService.handleInvitation(user, dto);
  }
}
