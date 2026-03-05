import { Module } from '@nestjs/common';
import { CryptoModule } from '@app/crypto';
import { OpenclawMcpAuthController } from './controllers/openclaw-mcp-auth.controller';
import { OpenclawMcpTasksController } from './controllers/openclaw-mcp-tasks.controller';
import { OpenclawMcpAuthService } from './services/openclaw-mcp-auth.service';
import { OpenclawMcpTasksService } from './services/openclaw-mcp-tasks.service';
import { OpenclawTokenRepository } from './repositories/openclaw-token.repository';
import { OpenclawTokenGuard } from './guards/openclaw-token.guard';
import { ToDoModule } from '../to-do/to-do.module';

@Module({
  imports: [CryptoModule, ToDoModule],
  controllers: [OpenclawMcpAuthController, OpenclawMcpTasksController],
  providers: [OpenclawMcpAuthService, OpenclawMcpTasksService, OpenclawTokenRepository, OpenclawTokenGuard],
  exports: [OpenclawMcpAuthService, OpenclawTokenRepository],
})
export class OpenclawMcpModule {}
