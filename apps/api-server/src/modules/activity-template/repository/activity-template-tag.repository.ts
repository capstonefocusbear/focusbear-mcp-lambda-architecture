import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../../src/shared/repositories/base-repository.repository';
import { ActivityTemplateTag } from '../entity/activity-template-tag.entity';
import { Connection } from 'typeorm';

@Injectable()
export class ActivityTemplateTagRepository extends BaseRepository<ActivityTemplateTag> {
  constructor(private readonly connection: Connection) {
    super(connection, ActivityTemplateTag);
  }
}
