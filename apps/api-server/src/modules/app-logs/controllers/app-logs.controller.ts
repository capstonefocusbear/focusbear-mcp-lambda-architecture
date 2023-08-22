import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { AppLogsService } from '../services/app-logs.service';
import { FileUploadRequest } from '../domain/upload.interface';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';

@Controller('app-logs')
@ApiTags('app-logs')
@ApiSecurity('Auth0AccessToken')
export class AppLogsController {
  constructor(private readonly appLogsService: AppLogsService) {}

  @Post()
  @UseGuards(IsAuth)
  async uploadFile(
    @Req() request: FileUploadRequest,
    @Res() response: FastifyReply,
    @AuthContext() { user }: Passport,
  ) {
    return this.appLogsService.uploadFile(request, response, user.id);
  }
}
