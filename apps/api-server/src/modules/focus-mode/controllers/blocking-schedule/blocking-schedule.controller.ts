import { Body, Controller, Delete, Get, HttpCode, Param, Put, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { BlockingScheduleService } from '../../services/blocking-schedule/blocking-schedule.service';
import { UpsertBlockingScheduleDto } from '../../dto/upsert-blocking-schedule.dto';
import { BlockingSchedule } from '../../entities/blocking-schedule.entity';

@Controller('blocking-schedules')
@ApiTags('focus-mode')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class BlockingScheduleController {
  constructor(private readonly blockingScheduleService: BlockingScheduleService) {}

  @Get()
  async getBlockingSchedules(@AuthContext() { user }: Passport): Promise<BlockingSchedule[]> {
    return this.blockingScheduleService.getBlockingSchedules(user.id);
  }

  @Post()
  async createBlockingSchedule(
    @Body() blockingScheduleDto: UpsertBlockingScheduleDto,
    @AuthContext() { user }: Passport,
  ): Promise<BlockingSchedule> {
    return this.blockingScheduleService.createBlockingSchedule(user.id, blockingScheduleDto);
  }

  @Put(':id')
  async updateBlockingSchedule(
    @Param('id') id: string,
    @Body() blockingScheduleDto: UpsertBlockingScheduleDto,
    @AuthContext() { user }: Passport,
  ): Promise<BlockingSchedule> {
    return this.blockingScheduleService.updateBlockingSchedule(user.id, id, blockingScheduleDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteBlockingSchedule(@Param('id') id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.blockingScheduleService.deleteBlockingSchedule(user.id, id);
  }
}
