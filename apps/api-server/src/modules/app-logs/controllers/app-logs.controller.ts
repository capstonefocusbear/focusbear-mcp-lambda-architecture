import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { AppLogsService } from '../services/app-logs.service';
import { FileUploadRequest } from '../domain/upload.interface';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { CreateUploadPresignedUrlQueryDto } from '../dto/create-upload-presigned-url-query.dto';
import { NotifyLogsUploadSuccessDto } from '../dto/notify-logs-upload-success.dto';

@Controller('app-logs')
@ApiTags('app-logs')
@ApiSecurity('Auth0AccessToken')
@UseGuards(IsAuth)
export class AppLogsController {
  constructor(private readonly appLogsService: AppLogsService) {}

  // Deprecated: Use the user/uninstall endpoint instead
  @ApiOperation({
    summary: 'Deprecated: Use the user/uninstall endpoint instead',
  })
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

  // TODO: In the future, refactor the log upload flow so that clients generate and send the final filename themselves.
  // when requesting the presigned URL (via createUploadPresignedUrl). This would allow the backend to avoid constructing
  // the filename with `new Date().toISOString()` and instead simply store/use the provided filename directly.
  // It will also make it easier to extract the filename later during notify-upload-success without relying on parsing the URL.
  @Post('notify-upload-success')
  async notifyLogsUploadSuccess(
    @Body() notifyLogsUploadSuccessDto: NotifyLogsUploadSuccessDto,
    @AuthContext() { user }: Passport,
  ) {
    return this.appLogsService.notifyLogsUploadSuccess(notifyLogsUploadSuccessDto, user.id);
  }
}
