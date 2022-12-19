import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { trackDtoDummy } from '../../../../test/dummies';
import { SentryServiceMock, TracksRepositoryMock } from '../../../../test/mocks';
import { TracksRepository } from '../repositories/tracks.repository';
import { TracksService } from './tracks.service';

describe('TracksService', () => {
  let tracksService: TracksService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TracksService,
        TracksRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(TracksRepository)
      .useValue(TracksRepositoryMock)
      .compile();

    tracksService = moduleRef.get<TracksService>(TracksService);
  });

  it('should be defined', () => {
    expect(tracksService).toBeDefined();
  });

  describe('getAllTracks', () => {
    it('Poitive: should fetch tracks from tracks repository', async () => {
      await tracksService.getAllTracks();

      expect(TracksRepositoryMock.orm.find).toBeCalled();
    });
  });

  describe('upsertTrack', () => {
    it('Poitive: should call upsert on tracksRepository with track DTO', async () => {
      await tracksService.upsertTrack(trackDtoDummy);

      expect(TracksRepositoryMock.upsert).toBeCalledWith(trackDtoDummy, ['id']);
    });
  });
});
