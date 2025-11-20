import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { R2Service } from '@app/r2/services/r2.service';
import { trackDtoDummy, userDummy } from '../../../../test/dummies';
import { R2ServiceMock, SentryServiceMock, TracksRepositoryMock, UserRepositoryMock } from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { TracksRepository } from '../repositories/tracks.repository';
import { TracksService } from './tracks.service';

describe('TracksService', () => {
  let tracksService: TracksService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TracksService,
        TracksRepository,
        UserRepository,
        R2Service,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(TracksRepository)
      .useValue(TracksRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(R2Service)
      .useValue(R2ServiceMock)
      .compile();

    tracksService = moduleRef.get<TracksService>(TracksService);
  });

  it('should be defined', () => {
    expect(tracksService).toBeDefined();
  });

  describe('getAllTracks', () => {
    it('Negative: should throw notfound error if user is not found in DB', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await tracksService.getAllTracks(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should fetch tracks from DB and get download and thumbnail URLs for each track from R2, then format response to include download URL for each track', async () => {
      const testUrl = 'https://test-url.com';
      const testThumbnailUrl = 'https://test-thumbnail-url.com';
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      TracksRepositoryMock.orm.find.mockResolvedValueOnce([trackDtoDummy]);
      R2ServiceMock.getPresignedUrl.mockResolvedValueOnce(testUrl).mockResolvedValueOnce(testThumbnailUrl);

      const res = await tracksService.getAllTracks(userDummy.id);

      expect(res).toStrictEqual([
        {
          id: trackDtoDummy.id,
          name: trackDtoDummy.name,
          artist: trackDtoDummy.artist,
          description: trackDtoDummy.description,
          download_url: testUrl,
          thumbnail_download_url: testThumbnailUrl,
          duration: trackDtoDummy.duration,
        },
      ]);
    });
  });

  describe('upsertTrack', () => {
    it('Positive: should call upsert on tracksRepository with track DTO', async () => {
      await tracksService.upsertTrack(trackDtoDummy);

      expect(TracksRepositoryMock.upsert).toHaveBeenCalledWith(trackDtoDummy, ['id']);
    });
  });
});
