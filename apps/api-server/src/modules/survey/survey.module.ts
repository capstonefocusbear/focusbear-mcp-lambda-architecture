import { Module, forwardRef } from '@nestjs/common';
import { SurveyController } from './controllers/survey.controller';
import { SurveyService } from './services/survey.service';
import { SurveyRepository } from './repositories/survey.repository';
import { SurveyAnswerRepository } from './repositories/survey-answer.repository';
import { SurveyAnswerMetadataRepository } from './repositories/survey-answer-metadata.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [SurveyRepository, SurveyAnswerRepository, SurveyAnswerMetadataRepository, SurveyService],
  controllers: [SurveyController],
})
export class SurveyModule {}
