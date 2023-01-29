import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsController } from './controllers/lessons.controller';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonsRepository } from './repositories/lessons.repository';
import { LessonsService } from './services/lessons.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, LessonCompletion])],
  controllers: [LessonsController],
  providers: [LessonsService, LessonsRepository],
})
export class LessonModule {}
