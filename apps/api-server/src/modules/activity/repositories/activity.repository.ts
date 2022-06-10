import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { createBaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivityRepository extends createBaseRepository<Activity>(Activity) {
  constructor(private readonly connection: Connection) {
    super(connection);
  }

  async findOneByTypeForUser(type: string, user_id: string): Promise<Activity> {
    return this.orm.findOne({ where: { type, user_id } });
  }
}
