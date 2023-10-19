import { Body, Controller, Post, Res, Sse, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AiService } from '../services/ai.service';
import { GenerateChatBotResponseDto } from '../../user/dto/generate-chatbot-response.dto';

@Controller('ai')
@ApiTags('ai')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('/chat')
  @Sse()
  @UseGuards(IsAuth)
  getCompletion(
    @Res() response: FastifyReply,
    @Body() { chat, language }: GenerateChatBotResponseDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.aiService.streamChatReply(response, user.id, chat, language);
  }
}
