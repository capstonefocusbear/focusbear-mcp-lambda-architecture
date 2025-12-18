import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { AppVersionsRepository } from '../repositories/app-versions.repository';
import { AppVersionsRepositoryMock } from '../../../../test/mocks/repositories.mock';
import {
  appVersionDummyiOS,
  appVersionDummyiOSMinSupported,
  appVersionDummyBeta,
  appVersionDummyAndroid,
  appVersionDummyAndroidMinSupported,
  appVersionDummyEdgeCaseOldest,
  appVersionDummyEdgeCaseAlpha,
  createAppVersionDtoiOSDummy,
  createAppVersionDtoBetaDummy,
  createAppVersionDtoAndroidDummy,
  createAppVersionDtoEdgeCaseOldestDummy,
  createAppVersionDtoInvalidMissingPatchDummy,
  createAppVersionDtoInvalidCompletelyDummy,
  createAppVersionDtoInvalidWildcardDummy,
  createAppVersionDtoDuplicateiOSDummy,
  createAppVersionDtoDuplicateAndroidDummy,
  createAppVersionDtoSameVersionDifferentOSDummy,
} from '../../../../test/dummies';
import { OperatingSystem } from '../../../shared/domain/operating-system.enum';

describe('AppVersionsService', () => {
  let appVersionsService: AppVersionsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppVersionsService, AppVersionsRepository],
    })
      .overrideProvider(AppVersionsRepository)
      .useValue(AppVersionsRepositoryMock)
      .compile();

    appVersionsService = moduleRef.get<AppVersionsService>(AppVersionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(appVersionsService).toBeDefined();
  });

  describe('getLatestVersion', () => {
    it('positive: should return latest and minimum supported versions for iOS', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(appVersionDummyiOS);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(appVersionDummyiOSMinSupported);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.iOS);

      expect(AppVersionsRepositoryMock.findLatest).toHaveBeenCalledWith(OperatingSystem.iOS, false);
      expect(AppVersionsRepositoryMock.findMinSupported).toHaveBeenCalledWith(OperatingSystem.iOS);
      expect(result).toEqual({
        minimum_supported_app_version: appVersionDummyiOSMinSupported.semver_string,
        latest_app_version: appVersionDummyiOS.semver_string,
        release_notes: appVersionDummyiOS.release_notes,
      });
    });

    it('positive: should return latest and minimum supported versions for Android', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(appVersionDummyAndroid);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(appVersionDummyAndroidMinSupported);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.Android);

      expect(AppVersionsRepositoryMock.findLatest).toHaveBeenCalledWith(OperatingSystem.Android, false);
      expect(AppVersionsRepositoryMock.findMinSupported).toHaveBeenCalledWith(OperatingSystem.Android);
      expect(result).toEqual({
        minimum_supported_app_version: appVersionDummyAndroidMinSupported.semver_string,
        latest_app_version: appVersionDummyAndroid.semver_string,
        release_notes: appVersionDummyAndroid.release_notes,
      });
    });

    it('positive: should include beta versions when includeBeta is true', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(appVersionDummyBeta);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(appVersionDummyiOSMinSupported);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.iOS, true);

      expect(AppVersionsRepositoryMock.findLatest).toHaveBeenCalledWith(OperatingSystem.iOS, true);
      expect(result).toEqual({
        minimum_supported_app_version: appVersionDummyiOSMinSupported.semver_string,
        latest_app_version: appVersionDummyBeta.semver_string,
        release_notes: appVersionDummyBeta.release_notes,
      });
    });

    it('positive: should exclude beta versions when includeBeta is false', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(appVersionDummyiOS);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(appVersionDummyiOSMinSupported);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.iOS, false);

      expect(AppVersionsRepositoryMock.findLatest).toHaveBeenCalledWith(OperatingSystem.iOS, false);
      expect(result.latest_app_version).toBe(appVersionDummyiOS.semver_string);
      expect(appVersionDummyiOS.is_beta_only).toBe(false);
    });

    it('positive: should return nulls when no versions exist', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(null);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(null);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.iOS);

      expect(result).toEqual({
        minimum_supported_app_version: null,
        latest_app_version: null,
        release_notes: null,
      });
    });

    it('positive: should handle edge case versions like alpha', async () => {
      AppVersionsRepositoryMock.findLatest.mockResolvedValueOnce(appVersionDummyEdgeCaseAlpha);
      AppVersionsRepositoryMock.findMinSupported.mockResolvedValueOnce(appVersionDummyEdgeCaseOldest);

      const result = await appVersionsService.getLatestVersion(OperatingSystem.iOS, true);

      expect(result).toEqual({
        minimum_supported_app_version: appVersionDummyEdgeCaseOldest.semver_string,
        latest_app_version: appVersionDummyEdgeCaseAlpha.semver_string,
        release_notes: appVersionDummyEdgeCaseAlpha.release_notes,
      });
    });
  });

  describe('createVersion', () => {
    it('positive: should create a valid version for iOS', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([]);

      const expectedResult = {
        ...createAppVersionDtoiOSDummy,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      };

      AppVersionsRepositoryMock.createVersion.mockResolvedValueOnce(expectedResult);

      const result = await appVersionsService.createVersion(createAppVersionDtoiOSDummy);

      expect(AppVersionsRepositoryMock.findAllByOS).toHaveBeenCalledWith(createAppVersionDtoiOSDummy.operating_system);
      expect(AppVersionsRepositoryMock.createVersion).toHaveBeenCalledWith({
        operating_system: createAppVersionDtoiOSDummy.operating_system,
        semver_string: createAppVersionDtoiOSDummy.semver_string,
        is_supported: createAppVersionDtoiOSDummy.is_supported,
        is_beta_only: createAppVersionDtoiOSDummy.is_beta_only,
        release_notes: createAppVersionDtoiOSDummy.release_notes,
      });
      expect(result).toEqual(expectedResult);
    });

    it('positive: should create a valid version for Android', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([]);

      const expectedResult = {
        ...createAppVersionDtoAndroidDummy,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      };

      AppVersionsRepositoryMock.createVersion.mockResolvedValueOnce(expectedResult);

      const result = await appVersionsService.createVersion(createAppVersionDtoAndroidDummy);

      expect(AppVersionsRepositoryMock.findAllByOS).toHaveBeenCalledWith(OperatingSystem.Android);
      expect(AppVersionsRepositoryMock.createVersion).toHaveBeenCalledWith({
        operating_system: createAppVersionDtoAndroidDummy.operating_system,
        semver_string: createAppVersionDtoAndroidDummy.semver_string,
        is_supported: createAppVersionDtoAndroidDummy.is_supported,
        is_beta_only: createAppVersionDtoAndroidDummy.is_beta_only,
        release_notes: createAppVersionDtoAndroidDummy.release_notes,
      });
      expect(result).toEqual(expectedResult);
    });

    it('positive: should create a beta version', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([appVersionDummyAndroid]);
      AppVersionsRepositoryMock.createVersion.mockResolvedValueOnce(appVersionDummyBeta);

      const result = await appVersionsService.createVersion(createAppVersionDtoBetaDummy);

      expect(AppVersionsRepositoryMock.createVersion).toHaveBeenCalledWith({
        operating_system: createAppVersionDtoBetaDummy.operating_system,
        semver_string: createAppVersionDtoBetaDummy.semver_string,
        is_supported: createAppVersionDtoBetaDummy.is_supported,
        is_beta_only: createAppVersionDtoBetaDummy.is_beta_only,
        release_notes: createAppVersionDtoBetaDummy.release_notes,
      });
      expect(result.is_beta_only).toBe(true);
    });

    it('positive: should create edge case version 0.0.1', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([]);

      const expectedResult = {
        ...createAppVersionDtoEdgeCaseOldestDummy,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      };

      AppVersionsRepositoryMock.createVersion.mockResolvedValueOnce(expectedResult);

      const result = await appVersionsService.createVersion(createAppVersionDtoEdgeCaseOldestDummy);

      expect(result.semver_string).toBe('0.0.1');
      expect(result).toEqual(expectedResult);
    });

    it('positive: should allow same version for different operating systems', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([]);

      const expectedResult = {
        ...createAppVersionDtoSameVersionDifferentOSDummy,
        id: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      };

      AppVersionsRepositoryMock.createVersion.mockResolvedValueOnce(expectedResult);

      const result = await appVersionsService.createVersion(createAppVersionDtoSameVersionDifferentOSDummy);

      expect(result.semver_string).toBe('2.1.0');
      expect(AppVersionsRepositoryMock.createVersion).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('negative: should throw BadRequestException for invalid semver format (missing patch)', async () => {
      let exception: any;

      try {
        await appVersionsService.createVersion(createAppVersionDtoInvalidMissingPatchDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Invalid semantic version: 2.1');
    });

    it('negative: should throw BadRequestException for invalid semver format (completely invalid)', async () => {
      let exception: any;

      try {
        await appVersionsService.createVersion(createAppVersionDtoInvalidCompletelyDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Invalid semantic version: invalid');
    });

    it('negative: should throw BadRequestException for invalid semver format (with wildcard)', async () => {
      let exception: any;

      try {
        await appVersionsService.createVersion(createAppVersionDtoInvalidWildcardDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Invalid semantic version: 2.1.x');
    });

    it('negative: should throw BadRequestException when duplicate version exists for iOS', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([appVersionDummyiOS]);

      let exception: any;

      try {
        await appVersionsService.createVersion(createAppVersionDtoDuplicateiOSDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Version 2.1.0 already exists for iOS');
      expect(AppVersionsRepositoryMock.createVersion).not.toHaveBeenCalled();
    });

    it('negative: should throw BadRequestException when duplicate version exists for Android', async () => {
      AppVersionsRepositoryMock.findAllByOS.mockResolvedValueOnce([appVersionDummyAndroid]);

      let exception: any;

      try {
        await appVersionsService.createVersion(createAppVersionDtoDuplicateAndroidDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toBe('Version 3.0.0 already exists for Android');
      expect(AppVersionsRepositoryMock.createVersion).not.toHaveBeenCalled();
    });
  });
});
