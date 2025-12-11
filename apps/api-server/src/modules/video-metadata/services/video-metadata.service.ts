import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import axios from 'axios';
import { In } from 'typeorm';
import { UserRepository } from '../../user/repositories/user.repository';
import { VideoMetadataResponseDto } from '../dto/video-metadata-response.dto';
import { VideoMetadata } from '../entities/video-metadata.entity';
import { VideoMetadataRepository } from '../repositories/video-metadata.repository';

@Injectable()
export class VideoMetadataService {
  constructor(
    private readonly videoMetadataRepository: VideoMetadataRepository,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly userRepository: UserRepository,
  ) {}

  async saveVideosMetadata(video_urls: string[], user_id: string): Promise<VideoMetadataResponseDto> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Upserting activity videos metadata',
        data: {
          video_urls,
        },
      });
      const user = await this.userRepository.orm.findOneBy({ id: user_id });
      if (!user) throw new NotFoundException(`User with ID: ${user_id} does not exist!`);

      // fetch data from YouTube for videos that aren't stored in DB
      const videoIdsFromClient = video_urls.map((url) => this.getIdFromYouTubeURL(url));
      const existingVideosMetadata = await this.videoMetadataRepository.orm.find({
        where: { id: In(videoIdsFromClient) },
      });
      const existingVideosIds = existingVideosMetadata.map((video) => video.id);
      const videoIdsToFetchFromYouTube = videoIdsFromClient.filter((id) => !existingVideosIds.includes(id));
      const videosMetadataFromYouTube = await this.getVideosMetadataFromYouTube(videoIdsToFetchFromYouTube, video_urls);

      // save valid new videos' metadata
      await Promise.all(
        videosMetadataFromYouTube.map(
          (video) => video instanceof VideoMetadata && this.videoMetadataRepository.upsert(video, ['id']),
        ),
      );
      // format response
      const newVideosMetadata = videosMetadataFromYouTube.filter(
        (video) => video instanceof VideoMetadata,
      ) as VideoMetadata[];
      const formattedMetadata = [...existingVideosMetadata, ...newVideosMetadata].map(
        ({ id, video_url, title, duration }) => {
          return { id, video_url, title, duration };
        },
      );
      return {
        videos_metadata: formattedMetadata,
      };
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  private async getVideosMetadataFromYouTube(videoIdsToFetchFromYouTube: string[], video_urls: string[]) {
    this.sentryService.instance().addBreadcrumb({
      category: 'Service',
      level: 'debug',
      message: 'Fetching videos metadata from YouTube API',
      data: {
        videoIdsToFetchFromYouTube,
      },
    });
    const videoUrlsAndIds = videoIdsToFetchFromYouTube.map((id) => {
      const videoURL = video_urls.filter((url) => url.includes(id))[0];
      return { id, video_url: videoURL };
    });
    return Promise.all(
      videoUrlsAndIds.map(({ id, video_url }) => this.getVideoMetadataById({ video_id: id, video_url })),
    );
  }

  private async getVideoMetadataById({ video_id, video_url }: { video_id: string; video_url: string }) {
    const { data } = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${video_id}&key=${process.env.YOUTUBE_API_KEY}`,
    );
    if (data.pageInfo.totalResults === 0) {
      return video_url;
    }
    const { title } = data?.items[0]?.snippet;
    const { duration } = data?.items[0]?.contentDetails;
    const formattedDuration = this.parseDuration(duration);
    const video = new VideoMetadata({ id: video_id, video_url, title, duration: formattedDuration });
    return video;
  }

  getIdFromYouTubeURL = (url: string) => {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Extracting ID from YouTube URL',
        data: {
          url,
        },
      });
      const regex = /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/gm;
      const regexArray = regex.exec(url)[3];
      return regexArray;
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
    }
  };

  parseDuration(duration: string) {
    // handle case of YouTube live-stream URL duration
    if (duration === 'P0D') return '00:00';
    const output = [];
    let totalDurationInSec = 0;
    const matches = duration.match(/P(?:(\d*)D)?T(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/i);
    const segments = [
      {
        // days
        pos: 1,
        multiplier: 86400,
      },
      {
        // hours
        pos: 2,
        multiplier: 3600,
      },
      {
        // minutes
        pos: 3,
        multiplier: 60,
      },
      {
        // seconds
        pos: 4,
        multiplier: 1,
      },
    ];
    const definedTimeSegments = segments.filter((part) => typeof matches[part.pos] !== 'undefined');
    totalDurationInSec = definedTimeSegments.reduce(
      (durationSeconds, currentSegment) =>
        durationSeconds + parseInt(matches[currentSegment.pos], 10) * currentSegment.multiplier,
      totalDurationInSec,
    );
    // hours extraction
    if (totalDurationInSec > 3599) {
      output.push(parseInt((totalDurationInSec / 3600).toString(), 10));
      totalDurationInSec %= 3600;
    }
    // minutes extraction with leading zero
    output.push(`0${parseInt((totalDurationInSec / 60).toString(), 10)}`.slice(-2));
    // seconds extraction with leading zero
    output.push(`0${totalDurationInSec % 60}`.slice(-2));
    return output.join(':');
  }
}
