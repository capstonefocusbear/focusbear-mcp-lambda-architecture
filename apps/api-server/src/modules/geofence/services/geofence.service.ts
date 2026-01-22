import { Injectable, NotFoundException } from '@nestjs/common';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { GeofenceRepository } from '../repositories/geofence.repository';
import { CreateGeofenceDto } from '../dto/create-geofence.dto';
import { UpdateGeofenceDto } from '../dto/update-geofence.dto';
import { Geofence } from '../entities/geofence.entity';

@Injectable()
export class GeofenceService {
  constructor(private readonly geofenceRepository: GeofenceRepository) {}

  async getUserGeofences(user_id: string): Promise<Geofence[]> {
    return this.geofenceRepository.findByUserId(user_id);
  }

  async getGeofenceById(user_id: string, geofence_id: string): Promise<Geofence> {
    const geofence = await this.geofenceRepository.findByIdAndUserId(geofence_id, user_id);
    if (!geofence) {
      throw new NotFoundException(`Geofence with ID: ${geofence_id} not found`);
    }
    return geofence;
  }

  async createGeofence(user_id: string, createGeofenceDto: CreateGeofenceDto): Promise<Geofence> {
    const geofence = new Geofence({
      user_id,
      ...createGeofenceDto,
      radius: createGeofenceDto.radius || 100,
    });
    return this.geofenceRepository.orm.save(geofence);
  }

  async updateGeofence(user_id: string, geofence_id: string, updateGeofenceDto: UpdateGeofenceDto): Promise<Geofence> {
    const existingGeofence = await this.geofenceRepository.findByIdAndUserId(geofence_id, user_id);
    if (!existingGeofence) {
      throw new NotFoundException(`Geofence with ID: ${geofence_id} not found`);
    }

    Object.assign(existingGeofence, updateGeofenceDto);
    return this.geofenceRepository.orm.save(existingGeofence);
  }

  async deleteGeofence(user_id: string, geofence_id: string): Promise<ResponseMessage> {
    const existingGeofence = await this.geofenceRepository.findByIdAndUserId(geofence_id, user_id);
    if (!existingGeofence) {
      throw new NotFoundException(`Geofence with ID: ${geofence_id} not found`);
    }

    await this.geofenceRepository.orm.delete({ id: geofence_id, user_id });
    return new ResponseMessage(`Successfully deleted geofence with ID: ${geofence_id}`);
  }
}
