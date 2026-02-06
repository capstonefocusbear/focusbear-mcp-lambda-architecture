import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { GeofenceService } from '../services/geofence.service';
import { CreateGeofenceDto } from '../dto/create-geofence.dto';
import { UpdateGeofenceDto } from '../dto/update-geofence.dto';
import { GeofenceIdParamDto } from '../dto/geofence-id-param.dto';
import { Geofence } from '../entities/geofence.entity';

@Controller('geofences')
@UseGuards(IsAuth)
@ApiTags('geofences')
@ApiSecurity('Auth0AccessToken')
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Get()
  async getUserGeofences(@AuthContext() { user }: Passport): Promise<Geofence[]> {
    return this.geofenceService.getUserGeofences(user.id);
  }

  @Get(':geofence_id')
  async getGeofenceById(
    @Param() { geofence_id }: GeofenceIdParamDto,
    @AuthContext() { user }: Passport,
  ): Promise<Geofence> {
    return this.geofenceService.getGeofenceById(user.id, geofence_id);
  }

  @Post()
  async createGeofence(
    @Body() createGeofenceDto: CreateGeofenceDto,
    @AuthContext() { user }: Passport,
  ): Promise<Geofence> {
    return this.geofenceService.createGeofence(user.id, createGeofenceDto);
  }

  @Put(':geofence_id')
  async updateGeofence(
    @Param() { geofence_id }: GeofenceIdParamDto,
    @Body() updateGeofenceDto: UpdateGeofenceDto,
    @AuthContext() { user }: Passport,
  ): Promise<Geofence> {
    return this.geofenceService.updateGeofence(user.id, geofence_id, updateGeofenceDto);
  }

  @Delete(':geofence_id')
  async deleteGeofence(@Param() { geofence_id }: GeofenceIdParamDto, @AuthContext() { user }: Passport) {
    return this.geofenceService.deleteGeofence(user.id, geofence_id);
  }
}
