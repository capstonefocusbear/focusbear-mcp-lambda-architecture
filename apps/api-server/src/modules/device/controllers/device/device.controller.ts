import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../../shared/decorators/passport.decorator';
import { Passport } from '../../../auth/domain/passport.model';
import { IsAuth } from '../../../auth/guards/is-auth/is-auth.guard';
import { FocusMode } from '../../../focus-mode/entities/focus-mode.entity';
import { CreateDeviceDto } from '../../dto/create-device.dto';
import { UpdateDeviceDto } from '../../dto/update-device.dto';
import { Device } from '../../entities/device.entity';
import { DeviceService } from '../../services/device/device.service';

@Controller('device')
@ApiTags('device')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  createDevice(@Body() createDeviceDto: CreateDeviceDto, @AuthContext() { user }: Passport): Promise<Device> {
    return this.deviceService.createDevice({ ...createDeviceDto }, user.id);
  }

  @Patch(':device_id')
  async updateDevice(@Body() updateDeviceDto: UpdateDeviceDto, @Param() { device_id }): Promise<FocusMode> {
    return this.deviceService.update(device_id, { ...updateDeviceDto });
  }
}
