import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { GeofenceRepository } from './repositories/geofence.repository';
import { GeofenceService } from './services/geofence.service';
import { GeofenceController } from './controllers/geofence.controller';

@Module({
  providers: [GeofenceRepository, GeofenceService],
  controllers: [GeofenceController],
  exports: [GeofenceRepository, GeofenceService],
  imports: [UserModule],
})
export class GeofenceModule {}
