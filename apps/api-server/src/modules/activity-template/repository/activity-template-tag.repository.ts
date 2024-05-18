import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { ActivityTemplateTag } from '../entity/activity-template-tag.entity';

@Injectable()
export class ActivityTemplateTagRepository extends BaseRepository<ActivityTemplateTag> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivityTemplateTag);
  }
}
