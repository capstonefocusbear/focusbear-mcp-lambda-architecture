import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import * as axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import {
  userDummy,
  videoMetadataRepositoryDBResponseDummy,
  videoMetadataRepositoryDBResponseSecondDummy,
  videoMetadataReturnValueDummy,
  videoMetadataReturnValueWithInvalidURLDummy,
  videoMetadataYoutubeAPIResponseDummy,
  videoMetadataYoutubeAPIResponseWithoutVideoDummy,
  videoUrlsDummy,
} from '../../../../test/dummies/index';
import { UserRepositoryMock, VideoMetadataRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { SentryServiceMock } from '../../../../test/mocks';
import { VideoMetadataService } from './video-metadata.service';
import { VideoMetadataRepository } from '../repositories/video-metadata.repository';
import { UserRepository } from '../../user/repositories/user.repository';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios.default>;

describe('VideoMetadataService', () => {
  let videoMetadataService: VideoMetadataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VideoMetadataService,
        VideoMetadataRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(VideoMetadataRepository)
      .useValue(VideoMetadataRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    videoMetadataService = moduleRef.get<VideoMetadataService>(VideoMetadataService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(videoMetadataService).toBeDefined();
  });

  describe('upsertVideosMetadata', () => {
    it('negative: should throw not found exception for user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await videoMetadataService.saveVideosMetadata(videoUrlsDummy, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toMatch(errorMessage);
    });

    it('positive: invalid YouTube URL should be added to response errors array if no video is returned from YouTube', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      mockedAxios.get.mockResolvedValue(videoMetadataYoutubeAPIResponseWithoutVideoDummy);
      VideoMetadataRepositoryMock.orm.find.mockResolvedValueOnce(videoMetadataRepositoryDBResponseSecondDummy);
      const result = await videoMetadataService.saveVideosMetadata(
        [...videoUrlsDummy, 'https://youtu.be/12345n9kA5t13'],
        userDummy.id,
      );

      expect(VideoMetadataRepositoryMock.upsert).toBeCalledTimes(0);
      expect(result).toEqual(videoMetadataReturnValueWithInvalidURLDummy);
    });

    it('positive: should return array of VideoMetadataDto objects', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      mockedAxios.get.mockResolvedValueOnce(videoMetadataYoutubeAPIResponseDummy);
      VideoMetadataRepositoryMock.orm.find.mockResolvedValueOnce(videoMetadataRepositoryDBResponseDummy);

      const result = await videoMetadataService.saveVideosMetadata(videoUrlsDummy, userDummy.id);

      expect(VideoMetadataRepositoryMock.upsert).toBeCalledTimes(1);
      expect(result).toEqual(videoMetadataReturnValueDummy);
    });
  });

  describe('getIdFromYouTubeURL', () => {
    it('Positive: should return id extracted from URL (URL format 1)', () => {
      const testURL = 'https://www.youtube.com/watch?v=EL1wNBsEHiY';
      const id = videoMetadataService.getIdFromYouTubeURL(testURL);

      expect(id).toBe('EL1wNBsEHiY');
    });

    it('Positive: should return id extracted from URL (URL format 2)', () => {
      const testURL = 'https://youtu.be/Db9QbtV4mJM';
      const id = videoMetadataService.getIdFromYouTubeURL(testURL);

      expect(id).toBe('Db9QbtV4mJM');
    });

    it('Positive: should return id extracted from URL (URL format 3)', () => {
      const testURL = 'https://www.youtube.com/embed/0zM3nApSvMg?rel=0';
      const id = videoMetadataService.getIdFromYouTubeURL(testURL);

      expect(id).toBe('0zM3nApSvMg');
    });
  });

  describe('parseDuration', () => {
    it('Positive: should return formatted ISO duration longer than a day in hh:mm:ss format', () => {
      const testDuration = 'P1DT19M23S';
      const id = videoMetadataService.parseDuration(testDuration);

      expect(id).toBe('24:19:23');
    });

    it('Positive: should return formatted ISO duration longer than an hour and less than 10 hours in h:mm:ss format', () => {
      const testDuration = 'PT2H15M23S';
      const id = videoMetadataService.parseDuration(testDuration);

      expect(id).toBe('2:15:23');
    });

    it('Positive: should return formatted ISO duration shorter than an hour in mm:ss format', () => {
      const testDuration = 'PT10M30S';
      const id = videoMetadataService.parseDuration(testDuration);

      expect(id).toBe('10:30');
    });

    it('Positive: should return formatted ISO duration shorter than 1 minute in mm:ss format', () => {
      const testDuration = 'PT30S';
      const id = videoMetadataService.parseDuration(testDuration);

      expect(id).toBe('00:30');
    });
  });
});
