import { Body, Controller, Param, Put, UseGuards, Delete, Get, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { HabitPack } from '../entity/habit-pack.entity';
import { CreateHabitPackDto } from '../dto/create-habit-pack-param.dto';
import { HabitPackService } from '../services/habit-pack/habit-pack.service';
import { GetHabitPackParamDto } from '../dto/get-habit-pack.dto';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { HabitPackManagerService } from '../services/habit-pack/habit-pack-manager.service';
import { InstallPackAsDefaultSettingsDto } from '../dto/install-pack-as-default-settings.dto';
import { UserSettingsResponseDto } from '../../user/dto/user-settings-response.dto';

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

  @Get('marketplace-approved')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  getMarketplaceApprovedPacks(@AuthContext() { user }: Passport): Promise<HabitPack[]> {
    return this.habitPackService.getMarketplaceApprovedPacks(user.id);
  }

  @Put()
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  async createOrUpdateHabitPack(
    @Body() createHabitPackDto: CreateHabitPackDto,
    @AuthContext() { user }: Passport,
  ): Promise<CreateHabitPackDto> {
    return this.habitPackService.createHabitPack(user.id, createHabitPackDto);
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

  @Get(':pack_id/install')
  @UseGuards(IsAuth)
  @ApiSecurity('Auth0AccessToken')
  installHabitPack(@Param() { pack_id }: GetHabitPackParamDto, @AuthContext() { user }: Passport) {
    return this.habitPackManagerService.installHabitPack(user.id, pack_id);
  }

  @Get(':pack_id/uninstall')
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
}
