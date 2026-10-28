import { McpConnectionsService } from './services/mcp-connections.service';
import { McpAuth0Service } from './services/mcp-auth0.service';
import { Module } from '@nestjs/common';
import { CryptoModule } from '@app/crypto';
import { ExternalMcpAuthController } from './controllers/external-mcp-auth.controller';
import { ExternalMcpTasksController } from './controllers/external-mcp-tasks.controller';
import { ExternalMcpAuthService } from './services/external-mcp-auth.service';
import { ExternalMcpTasksService } from './services/external-mcp-tasks.service';
import { ExternalApiTokenRepository } from './repositories/external-api-token.repository';
import { ExternalApiTokenGuard } from './guards/external-api-token.guard';
import { ToDoModule } from '../to-do/to-do.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [CryptoModule, ToDoModule, ProjectModule],
  controllers: [ExternalMcpAuthController, ExternalMcpTasksController],
  providers: [
    McpConnectionsService,
    McpAuth0Service,
    ExternalMcpAuthService,
    ExternalMcpTasksService,
    ExternalApiTokenRepository,
    ExternalApiTokenGuard,
  ],
  exports: [ExternalMcpAuthService, ExternalApiTokenRepository],
})
export class ExternalMcpModule {}
