import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import axios from 'axios';
import { NotFoundException } from '@nestjs/common';
import {
  userDummy,
  videoMetadataRepositoryDBResponseDummy,
  videoMetadataReturnValueDummy,
  videoMetadataReturnValueThirdVideoNullThumbnailDummy,
  videoMetadataYoutubeAPIResponseAllThumbnailsDummy,
  videoMetadataYoutubeAPIResponseDummy,
  videoMetadataYoutubeAPIResponseEmptyThumbnailsDummy,
  videoMetadataYoutubeAPIResponseMissingDefaultDummy,
  videoMetadataYoutubeAPIResponseMissingHighDummy,
  videoMetadataYoutubeAPIResponseMissingMaxresDummy,
  videoMetadataYoutubeAPIResponseMissingMaxresStandardDummy,
  videoMetadataYoutubeAPIResponseMissingMaxresStandardHighDummy,
  videoMetadataYoutubeAPIResponseMissingMaxresStandardHighMediumDummy,
  videoMetadataYoutubeAPIResponseMissingMediumDummy,
  videoMetadataYoutubeAPIResponseMissingStandardDummy,
  videoMetadataYoutubeAPIResponseNoThumbnailsDummy,
  videoMetadataYoutubeAPIResponseOnlyDefaultDummy,
  videoMetadataYoutubeAPIResponseThumbnailsNullDummy,
  videoMetadataYoutubeAPIResponseThumbnailsStringDummy,
  videoMetadataYoutubeAPIResponseThumbnailsUndefinedDummy,
  videoMetadataYoutubeAPIResponseOnlyHighDummy,
  videoMetadataYoutubeAPIResponseOnlyMaxresDummy,
  videoMetadataYoutubeAPIResponseOnlyMediumDummy,
  videoMetadataYoutubeAPIResponseOnlyStandardDummy,
  videoMetadataYoutubeAPIResponseThumbnailMissingUrlDummy,
  videoMetadataYoutubeAPIResponseThumbnailMissingWidthHeightDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataAllFieldsInvalidDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataEmptyObjectDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataNullDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataStringDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataUndefinedDummy,
  videoMetadataYoutubeAPIResponseThumbnailsDataWrongTypesDummy,
  videoMetadataYoutubeAPIResponseWeirdThumbnailsDummy,
  videoUrlsDummy,
} from '../../../../test/dummies/index';
import { UserRepositoryMock, VideoMetadataRepositoryMock } from '../../../../test/mocks/repositories.mock';
import { SentryServiceMock } from '../../../../test/mocks';
import { VideoMetadataService } from './video-metadata.service';
import { VideoMetadataRepository } from '../repositories/video-metadata.repository';
import { UserRepository } from '../../user/repositories/user.repository';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

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

    it('positive: should return array of VideoMetadataDto objects', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      mockedAxios.get.mockResolvedValueOnce(videoMetadataYoutubeAPIResponseDummy);
      VideoMetadataRepositoryMock.orm.find.mockResolvedValueOnce(videoMetadataRepositoryDBResponseDummy);

      const result = await videoMetadataService.saveVideosMetadata(videoUrlsDummy, userDummy.id);

      expect(VideoMetadataRepositoryMock.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(videoMetadataReturnValueDummy);
    });

    /**
     * @brief Tests for saveVideosMetadata when the mocked YouTube API response has varying or missing thumbnails.
     *
     * The service fetches one video (KLKn9kA5t58) from YouTube when repository find returns two existing
     * records; the third video's thumbnail fields are derived from snippet.thumbnails using the preference
     * order: maxres → standard → high → medium → default. These tests use dummies defined in
     * test/dummies/index.ts to cover no thumbnails, empty/weird thumbnails, single-size presence, and
     * all combinations of missing standard keys.
     */
    describe('saveVideosMetadata when YouTube API response thumbnails vary', () => {
      /**
       * Arranges mocks so that one video (KLKn9kA5t58) is fetched from YouTube and the given API response
       * is returned by axios.get. Asserts that the third element of result.videos_metadata matches expected
       * thumbnail fields (and optionally other fields via fullExpectedThird).
       * @param youtubeResponse - Mock axios response (object with data.items[0].snippet.thumbnails etc.)
       * @param expectedThird - Expected third video metadata object (at least thumbnail_url, thumbnail_width, thumbnail_height)
       */
      const runSaveVideosMetadataWithYouTubeResponse = async (
        youtubeResponse: object,
        expectedThird: {
          thumbnail_url: string | null;
          thumbnail_width: number | null;
          thumbnail_height: number | null;
        },
      ) => {
        UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
        VideoMetadataRepositoryMock.orm.find.mockResolvedValueOnce(videoMetadataRepositoryDBResponseDummy);
        mockedAxios.get.mockResolvedValueOnce(youtubeResponse);

        const result = await videoMetadataService.saveVideosMetadata(videoUrlsDummy, userDummy.id);

        expect(result.videos_metadata).toHaveLength(3);
        expect(result.videos_metadata[0]).toEqual(videoMetadataReturnValueDummy.videos_metadata[0]);
        expect(result.videos_metadata[1]).toEqual(videoMetadataReturnValueDummy.videos_metadata[1]);
        expect(result.videos_metadata[2].thumbnail_url).toBe(expectedThird.thumbnail_url);
        expect(result.videos_metadata[2].thumbnail_width).toBe(expectedThird.thumbnail_width);
        expect(result.videos_metadata[2].thumbnail_height).toBe(expectedThird.thumbnail_height);
      };

      /**
       * When snippet has no "thumbnails" property at all, destructuring yields undefined and
       * thumbnailsData is undefined; all thumbnail fields are set to null.
       */
      it('sets thumbnail fields to null when snippet has no thumbnails field', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseNoThumbnailsDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * When snippet.thumbnails is null, optional chaining yields undefined for all size keys
       * so thumbnailsData is undefined; all thumbnail fields are set to null.
       */
      it('sets thumbnail fields to null when thumbnails is null', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsNullDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * When snippet.thumbnails is undefined, optional chaining yields undefined for all size keys
       * so thumbnailsData is undefined; all thumbnail fields are set to null.
       */
      it('sets thumbnail fields to null when thumbnails is undefined', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsUndefinedDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * When snippet.thumbnails is an empty object ({}), none of maxres/standard/high/medium/default
       * exist so thumbnailsData is undefined; all thumbnail fields are set to null.
       */
      it('sets thumbnail fields to null when thumbnails object is empty', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseEmptyThumbnailsDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * When snippet.thumbnails is a string (e.g. a URL) instead of an object, thumbnails?.maxres
       * etc. are undefined so thumbnailsData is undefined; all thumbnail fields are set to null.
       */
      it('sets thumbnail fields to null when thumbnails is a string', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsStringDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      it('sets thumbnail fields to null when thumbnails contains only non-standard keys', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseWeirdThumbnailsDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      it('uses default when only default thumbnail size is present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseOnlyDefaultDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/default.jpg',
          thumbnail_width: 120,
          thumbnail_height: 90,
        });
      });

      it('uses medium when only medium thumbnail size is present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseOnlyMediumDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/mddefault.jpg',
          thumbnail_width: 320,
          thumbnail_height: 180,
        });
      });

      it('uses high when only high thumbnail size is present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseOnlyHighDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/hddefault.jpg',
          thumbnail_width: 480,
          thumbnail_height: 360,
        });
      });

      it('uses standard when only standard thumbnail size is present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseOnlyStandardDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/sddefault.jpg',
          thumbnail_width: 640,
          thumbnail_height: 480,
        });
      });

      it('uses maxres when only maxres thumbnail size is present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseOnlyMaxresDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses maxres when all five thumbnail sizes are present', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseAllThumbnailsDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses standard when maxres is missing (standard, high, medium, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingMaxresDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/stdefault.jpg',
          thumbnail_width: 480,
          thumbnail_height: 360,
        });
      });

      it('uses maxres when standard is missing (maxres, high, medium, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingStandardDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses maxres when high is missing (maxres, standard, medium, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingHighDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses maxres when medium is missing (maxres, standard, high, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingMediumDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses maxres when default is missing (maxres, standard, high, medium present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingDefaultDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/maxresdefault.jpg',
          thumbnail_width: 1280,
          thumbnail_height: 720,
        });
      });

      it('uses high when maxres and standard are missing (high, medium, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingMaxresStandardDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/hddefault.jpg',
          thumbnail_width: 480,
          thumbnail_height: 360,
        });
      });

      it('uses medium when maxres, standard and high are missing (medium, default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseMissingMaxresStandardHighDummy, {
          thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/mddefault.jpg',
          thumbnail_width: 320,
          thumbnail_height: 180,
        });
      });

      it('uses default when maxres, standard, high and medium are missing (only default present)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseMissingMaxresStandardHighMediumDummy,
          {
            thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/default.jpg',
            thumbnail_width: 120,
            thumbnail_height: 90,
          },
        );
      });

      it('sets thumbnail_url to null but keeps width/height when chosen thumbnail object has no url', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(videoMetadataYoutubeAPIResponseThumbnailMissingUrlDummy, {
          thumbnail_url: null,
          thumbnail_width: 120,
          thumbnail_height: 90,
        });
      });

      it('uses url and null width/height when chosen thumbnail has url but missing width and height', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailMissingWidthHeightDummy,
          {
            thumbnail_url: 'https://i.ytimg.com/vi/KLKn9kA5t58/default.jpg',
            thumbnail_width: null,
            thumbnail_height: null,
          },
        );
      });

      /**
       * Sets thumbnail fields to null when the resolved thumbnailsData (the first of maxres/standard/high/medium/default)
       * is a string instead of an object. The service only treats objects as valid thumbnail data.
       */
      it('sets thumbnail fields to null when thumbnailsData is a string (non-object)', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataStringDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * Sets thumbnail fields to null when the resolved thumbnailsData is null.
       * Null is not an object so the service leaves all thumbnail fields as null.
       */
      it('sets thumbnail fields to null when thumbnailsData is null', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataNullDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * Sets thumbnail fields to null when the resolved thumbnailsData is undefined
       * (e.g. snippet.thumbnails.default is undefined). Undefined is not an object.
       */
      it('sets thumbnail fields to null when thumbnailsData is undefined', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataUndefinedDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * Sets thumbnail fields to null when thumbnailsData is an empty object (no url, width, height).
       * The service enters the object branch but each property is missing so all outputs are null.
       */
      it('sets thumbnail fields to null when thumbnailsData is an empty object', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataEmptyObjectDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * Sets thumbnail fields to null when thumbnailsData is an object but url, width and height
       * are all null or undefined. Only string url and number width/height are accepted.
       */
      it('sets thumbnail fields to null when thumbnailsData object has url, width and height all null or undefined', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataAllFieldsInvalidDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });

      /**
       * Sets thumbnail fields to null when thumbnailsData is an object but url, width and height
       * have incorrect types (e.g. number for url, strings for width/height). The service
       * requires typeof url === "string" and typeof width/height === "number".
       */
      it('sets thumbnail fields to null when thumbnailsData object has url, width and height with incorrect data types', async () => {
        await runSaveVideosMetadataWithYouTubeResponse(
          videoMetadataYoutubeAPIResponseThumbnailsDataWrongTypesDummy,
          videoMetadataReturnValueThirdVideoNullThumbnailDummy,
        );
      });
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
