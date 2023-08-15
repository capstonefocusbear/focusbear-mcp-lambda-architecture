import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { TodoController } from './controllers/to-do.controller';
import { ToDoService } from './services/to-do.service';
import { ToDoRepository } from './repositories/to-do.repository';

@Module({
  providers: [ToDoService, ToDoRepository],
  exports: [ToDoRepository],
  imports: [UserModule],
  controllers: [TodoController],
})
export class ToDoModule {}
