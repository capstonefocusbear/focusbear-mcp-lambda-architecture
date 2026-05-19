/*
import { Controller, Post, Body, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { McpService } from './mcp.service';
import { IsAuth } from '../auth/guards/is-auth.guard';
// import { AuthContext, Passport } from '../auth/decorators/auth.decorator';
import { AuthContext } from '../auth/decorators/auth.decorator';
import { Passport } from '../auth/domain/passport.model';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Sse('sse')
  @UseGuards(IsAuth)
  sse(@AuthContext() { user }: Passport): Observable<MessageEvent> {
    return this.mcpService.initializeSseStream(user.id);
  }

  @Post('messages')
  @UseGuards(IsAuth)
  async handleMessage(@AuthContext() { user }: Passport, @Body() message: any) {
    return this.mcpService.handleIncomingMessage(user.id, message);
  }
}*/
