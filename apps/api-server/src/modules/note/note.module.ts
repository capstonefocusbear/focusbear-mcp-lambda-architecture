import { Module, forwardRef } from '@nestjs/common';
import { NoteController } from './controllers/note.controller';
import { NoteService } from './services/note.service';
import { NoteRepository } from './repositories/note.repository';
import { NoteTagRepository } from './repositories/note-tag.repository';
import { ToDoModule } from '../to-do/to-do.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [forwardRef(() => ToDoModule), ActivityModule],
  controllers: [NoteController],
  providers: [NoteService, NoteRepository, NoteTagRepository],
  exports: [NoteService, NoteRepository, NoteTagRepository],
})
export class NoteModule {}
