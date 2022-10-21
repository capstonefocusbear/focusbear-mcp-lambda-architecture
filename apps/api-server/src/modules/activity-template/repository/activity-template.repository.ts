import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplate } from '../entity/activity-template.entity';

@Injectable()
export class ActivityTemplateRepository extends BaseRepository<ActivityTemplate> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivityTemplate);
  }

  async getActivityTemplateIds(pack_id: string) {
    const activityIdObjects = await this.orm
      .createQueryBuilder('activity_templates')
      .select(['activity_templates.id'])
      .where('activity_templates.pack_id = :pack_id', { pack_id })
      .withDeleted()
      .getMany();

    return activityIdObjects.map((idObject) => idObject.id);
  }
}
