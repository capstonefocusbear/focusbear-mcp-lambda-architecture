import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
// import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { TasksService } from './services/tasks.service';

@Module({
  imports: [HttpModule],
  // imports: [],
  // controllers: [McpController],
  providers: [McpService, TasksService],
  exports: [McpService],
})
export class McpModule {}
