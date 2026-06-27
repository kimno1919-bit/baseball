import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { ActualAttendanceDto } from './dto/actual-attendance.dto';
import { RegisterLineupDto } from './dto/register-lineup.dto';
import { SaveRecordsDto } from './dto/save-records.dto';

@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get()
  async getGames(@CurrentUser() user: AuthenticatedUser) {
    return this.gamesService.getGames(user);
  }

  @Get(':id')
  async getGameDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.getGameDetail(user, id);
  }

  @Post()
  @Roles('ADMIN')
  async createGame(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGameDto) {
    return this.gamesService.createGame(user, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  async updateGame(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.gamesService.updateGame(user, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  async deleteGame(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.deleteGame(user, id);
  }

  @Post(':id/attendance')
  async submitAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitAttendanceDto,
  ) {
    return this.gamesService.submitAttendance(user, id, dto);
  }

  @Post(':id/actual-attendance')
  @Roles('ADMIN', 'MANAGER')
  async saveActualAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ActualAttendanceDto,
  ) {
    return this.gamesService.saveActualAttendance(user, id, dto);
  }

  @Post(':id/lineup')
  @Roles('ADMIN', 'MANAGER')
  async registerLineup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RegisterLineupDto,
  ) {
    return this.gamesService.registerLineup(user, id, dto);
  }

  @Post(':id/records')
  @Roles('ADMIN', 'MANAGER')
  async saveRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SaveRecordsDto,
  ) {
    return this.gamesService.saveRecords(user, id, dto);
  }
}
