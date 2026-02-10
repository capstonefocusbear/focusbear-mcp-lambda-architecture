import { Injectable, NotFoundException } from '@nestjs/common';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { ActivitySequenceRepository } from '../../activity/repositories/activity-sequence.repository';
import { GeofenceRepository } from '../repositories/geofence.repository';
import { CreateGeofenceDto } from '../dto/create-geofence.dto';
import { UpdateGeofenceDto } from '../dto/update-geofence.dto';
import { Geofence } from '../entities/geofence.entity';

@Injectable()
export class GeofenceService {
  constructor(
    private readonly geofenceRepository: GeofenceRepository,
    private readonly activitySequenceRepository: ActivitySequenceRepository,
  ) {}

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
    await this.assertAssociatedRoutineOwnership(user_id, createGeofenceDto.associated_routine_id);
    const geofence = new Geofence({
      user_id,
      name: createGeofenceDto.name,
      latitude: String(createGeofenceDto.latitude),
      longitude: String(createGeofenceDto.longitude),
      radius: createGeofenceDto.radius || 100,
      trigger_after_time: createGeofenceDto.trigger_after_time,
      associated_routine_id: createGeofenceDto.associated_routine_id,
    });
    return this.geofenceRepository.orm.save(geofence);
  }

  async updateGeofence(user_id: string, geofence_id: string, updateGeofenceDto: UpdateGeofenceDto): Promise<Geofence> {
    const existingGeofence = await this.geofenceRepository.findByIdAndUserId(geofence_id, user_id);
    if (!existingGeofence) {
      throw new NotFoundException(`Geofence with ID: ${geofence_id} not found`);
    }

    if (updateGeofenceDto.name !== undefined) {
      existingGeofence.name = updateGeofenceDto.name;
    }
    if (updateGeofenceDto.latitude !== undefined) {
      existingGeofence.latitude = String(updateGeofenceDto.latitude);
    }
    if (updateGeofenceDto.longitude !== undefined) {
      existingGeofence.longitude = String(updateGeofenceDto.longitude);
    }
    if (updateGeofenceDto.radius !== undefined) {
      existingGeofence.radius = updateGeofenceDto.radius;
    }
    if (updateGeofenceDto.trigger_after_time !== undefined) {
      existingGeofence.trigger_after_time = updateGeofenceDto.trigger_after_time;
    }
    if (updateGeofenceDto.associated_routine_id !== undefined) {
      await this.assertAssociatedRoutineOwnership(user_id, updateGeofenceDto.associated_routine_id);
      existingGeofence.associated_routine_id = updateGeofenceDto.associated_routine_id ?? null;
    }

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

  private async assertAssociatedRoutineOwnership(
    user_id: string,
    associated_routine_id?: string | null,
  ): Promise<void> {
    if (!associated_routine_id) {
      return;
    }

    const routine = await this.activitySequenceRepository.findOneByIdForUser(associated_routine_id, user_id);
    if (!routine) {
      throw new NotFoundException('Associated routine not found');
    }
  }
}
