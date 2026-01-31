import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Geofence } from '../entities/geofence.entity';

@Injectable()
export class GeofenceRepository extends BaseRepository<Geofence> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Geofence);
  }

  async findByUserId(user_id: string): Promise<Geofence[]> {
    return this.orm.find({
      where: { user_id },
      order: { created_at: 'DESC' },
    });
  }

  async findByIdAndUserId(id: string, user_id: string): Promise<Geofence | null> {
    return this.orm.findOne({
      where: { id, user_id },
    });
  }
}
