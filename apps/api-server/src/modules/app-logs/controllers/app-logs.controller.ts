import { Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { AppLogsService } from '../services/app-logs.service';
import { FileUploadRequest } from '../domain/upload.interface';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CreateUploadPresignedUrlQueryDto } from '../dto/create-upload-presigned-url-query.dto';

@Controller('app-logs')
@ApiTags('app-logs')
@ApiSecurity('Auth0AccessToken')
@UseGuards(IsAuth)
export class AppLogsController {
  constructor(private readonly appLogsService: AppLogsService) {}

  // Deprecated: Use the user/uninstall endpoint instead
  @Post()
  async uploadFile(
    @Req() request: FileUploadRequest,
    @Res() response: FastifyReply,
    @AuthContext() { user }: Passport,
  ) {
    return this.appLogsService.uploadFile(request, response, user.id);
  }

  @Get('upload-logs-url')
  async generateUploadUrl(
    @AuthContext() { user }: Passport,
    @Query() createUploadPresignedUrlQueryDto: CreateUploadPresignedUrlQueryDto,
  ) {
    return this.appLogsService.createUploadPresignedUrl(createUploadPresignedUrlQueryDto, user.id);
  }
}
