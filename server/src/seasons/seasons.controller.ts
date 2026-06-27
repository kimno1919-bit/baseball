import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSeasonDto } from './dto/create-season.dto';

@Controller('seasons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  @Get()
  async getSeasons(@CurrentUser() user: AuthenticatedUser) {
    return this.seasonsService.getSeasons(user);
  }

  @Post()
  @Roles('ADMIN')
  async createSeason(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSeasonDto) {
    return this.seasonsService.createSeason(user, dto);
  }

  @Post(':id/close')
  @Roles('ADMIN')
  async closeSeason(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.seasonsService.closeSeason(user, id);
  }
}
