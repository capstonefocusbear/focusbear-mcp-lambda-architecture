import { Body, Controller, Param, Patch, Post, Get, UseGuards, Query, Put } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { FocusMode } from '../../../focus-mode/entities/focus-mode.entity';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { UpdateDeviceDto } from '../../dto/update-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceService } from '../../services/device/device.service';
import { IsAdmin } from '../../../auth/guards/is-admin/is-admin.guard';
import { GetDevicesQueryDto } from '../../dto/get-devices-query.dto';
import { SearchDeviceQueryDto } from '../../dto/search-device-query.dto';

@Controller('device')
@ApiTags('device')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post() // needs to removed after couple  of months
  @Put()
  createOrUpdateDevice(@Body() createDeviceDto: CreateDeviceDto, @AuthContext() { user }: Passport): Promise<Device> {
    return this.deviceService.createOrUpdateDevice({ ...createDeviceDto }, user.id);
  }

  @Patch(':device_id')
  async updateDevice(@Body() updateDeviceDto: UpdateDeviceDto, @Param() { device_id }): Promise<FocusMode> {
    return this.deviceService.update(device_id, { ...updateDeviceDto });
  }

  @Get('/admin')
  @UseGuards(IsAdmin)
  async getDevicesForAdmin(@Query() { user_id }: GetDevicesQueryDto, @AuthContext() { user: admin }: Passport) {
    return this.deviceService.getDevicesForAdmin(admin.id, user_id);
  }

  @Get('/search')
  async searchUserDevice(@Query() searchDeviceQueryDto: SearchDeviceQueryDto, @AuthContext() { user }: Passport) {
    return this.deviceService.searchUserDevice(searchDeviceQueryDto, user.id);
  }
}
