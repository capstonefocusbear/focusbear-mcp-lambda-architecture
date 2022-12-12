import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { VideoMetadataBodyDto } from '../dto/video-metadata-body.dto';
import { VideoMetadataResponseDto } from '../dto/video-metadata-response.dto';
import { VideoMetadataService } from '../services/video-metadata.service';

@Controller('video-metadata')
@UseGuards(IsAuth)
@ApiTags('activity')
@ApiSecurity('Auth0AccessToken')
export class VideoMetadataController {
  constructor(private readonly videoMetadataService: VideoMetadataService) {}

  @Post()
  updateVideosMetadata(
    @Body() { video_urls }: VideoMetadataBodyDto,
    @AuthContext() { user },
  ): Promise<VideoMetadataResponseDto> {
    return this.videoMetadataService.saveVideosMetadata(video_urls, user.id);
  }
}
