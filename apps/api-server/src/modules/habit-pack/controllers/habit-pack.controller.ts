import { Body, Controller, Param, Put, UseGuards, Delete, Get, Query, Post } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { HabitPack } from '../entity/habit-pack.entity';
import { UpsertHabitPackDto } from '../dto/upsert-habit-pack.dto';
import { HabitPackService } from '../services/habit-pack/habit-pack.service';
import { GetHabitPackParamDto } from '../dto/get-habit-pack.dto';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { HabitPackManagerService } from '../services/habit-pack/habit-pack-manager.service';
import { InstallPackAsDefaultSettingsDto } from '../dto/install-pack-as-default-settings.dto';
import { UserSettingsResponseDto } from '../../user/dto/user-settings-response.dto';
import { GetMultiplePacksQueryDto } from '../dto/get-multiple-packs-query.dto';
import { InstalledStandalonePackResponse } from '../domain/installed-standalone-pack-response.model';

@Controller('habit-packs')
@ApiTags('habit-packs')
export class HabitPackController {
  constructor(
    private readonly habitPackService: HabitPackService,
    private readonly habitPackManagerService: HabitPackManagerService,
  ) {}

  @Get(':pack_id')
  getHabitPackById(@Param() { pack_id }: GetHabitPackParamDto): Promise<HabitPack> {
    return this.habitPackService.getHabitPack(pack_id);
  }

  @Get()
  getHabitPacks(
    @Query()
    getPacksQuery: GetMultiplePacksQueryDto,
  ): Promise<HabitPack[]> {
    return this.habitPackService.getMultipleHabitPacks(getPacksQuery);
  }

  @Put()
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async createOrUpdateHabitPack(
    @Body() upsertHabitPackDto: UpsertHabitPackDto,
    @AuthContext() { user }: Passport,
  ): Promise<HabitPack> {
    return this.habitPackService.upsertHabitPack(user.id, upsertHabitPackDto);
  }

  @Delete(':pack_id')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  deleteHabitPack(
    @Param() { pack_id }: GetHabitPackParamDto,
    @AuthContext() { user }: Passport,
  ): Promise<ResponseMessage> {
    return this.habitPackService.deleteHabitPack(user.id, pack_id);
  }

  @Post(':pack_id/install')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  installHabitPack(@Param() { pack_id }: GetHabitPackParamDto, @AuthContext() { user }: Passport) {
    return this.habitPackManagerService.installHabitPack(user.id, pack_id);
  }

  @Delete(':pack_id/uninstall')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  uninstallHabitPack(@Param() { pack_id }: GetHabitPackParamDto, @AuthContext() { user }: Passport) {
    return this.habitPackManagerService.uninstallHabitPack(user.id, pack_id);
  }

  @Get('/default')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async installPackAsDefaultSettings(
    @Query() { pack_id }: InstallPackAsDefaultSettingsDto,
    @AuthContext() { user }: Passport,
  ): Promise<UserSettingsResponseDto> {
    return this.habitPackManagerService.installPackAsDefaultSettings(user.id, pack_id);
  }

  @Get('/user-packs')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  getUserInstalledPacks(@AuthContext() { user }: Passport): Promise<HabitPack[]> {
    return this.habitPackManagerService.getUserInstalledPacks(user.id);
  }

  @Get('/installed-standalone-packs')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async getUserInstalledStandalonePacks(@AuthContext() { user }: Passport): Promise<InstalledStandalonePackResponse[]> {
    return this.habitPackManagerService.getUserInstalledStandalonePacks(user.id);
  }
}
