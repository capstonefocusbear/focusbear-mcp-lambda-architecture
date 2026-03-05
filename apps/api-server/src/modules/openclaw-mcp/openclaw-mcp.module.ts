import { Module } from '@nestjs/common';
import { CryptoModule } from '@app/crypto';
import { OpenclawMcpAuthController } from './controllers/openclaw-mcp-auth.controller';
import { OpenclawMcpTasksController } from './controllers/openclaw-mcp-tasks.controller';
import { OpenclawMcpAuthService } from './services/openclaw-mcp-auth.service';
import { OpenclawMcpTasksService } from './services/openclaw-mcp-tasks.service';
import { OpenclawTokenRepository } from './repositories/openclaw-token.repository';
import { OpenclawTokenGuard } from './guards/openclaw-token.guard';
import { ToDoRepository } from '../to-do/repositories/to-do.repository';
import { TaskCommentRepository } from '../to-do/repositories/task-comment.repository';

@Module({
  imports: [CryptoModule],
  controllers: [OpenclawMcpAuthController, OpenclawMcpTasksController],
  providers: [
    OpenclawMcpAuthService,
    OpenclawMcpTasksService,
    OpenclawTokenRepository,
    OpenclawTokenGuard,
    ToDoRepository,
    TaskCommentRepository,
  ],
  exports: [OpenclawMcpAuthService, OpenclawTokenRepository],
})
export class OpenclawMcpModule {}
