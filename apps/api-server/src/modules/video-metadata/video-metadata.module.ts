import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { VideoMetadataController } from './controllers/video-metadata.controller';
import { VideoMetadataRepository } from './repositories/video-metadata.repository';
import { VideoMetadataService } from './services/video-metadata.service';

@Module({
  providers: [VideoMetadataService, VideoMetadataRepository],
  exports: [],
  imports: [UserModule],
  controllers: [VideoMetadataController],
})
export class VideoMetadataModule {}
