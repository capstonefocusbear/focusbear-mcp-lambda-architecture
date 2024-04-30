import { Connection } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { SurveyMetadata } from '../entities/survey-metadata.entity';

@Injectable()
export class SurveyMetadataRepository extends BaseRepository<SurveyMetadata> {
  constructor(private readonly connection: Connection) {
    super(connection, SurveyMetadata);
  }
}
