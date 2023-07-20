import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { SavedWebsiteRepositoryMock } from '../../../../test/mocks/index';
import { SavedWebsiteService } from './saved-website.service';
import { SavedWebsiteRepository } from '../repositories/saved-website.repository';
import { userDummy } from '../../../../test/dummies';
import { SavedWebsite } from '../entities/saved-website.entity';

describe('SavedWebsiteService', () => {
  let savedWebsiteService: SavedWebsiteService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SavedWebsiteService, SavedWebsiteRepository],
    })
      .overrideProvider(SavedWebsiteRepository)
      .useValue(SavedWebsiteRepositoryMock)
      .compile();

    savedWebsiteService = moduleRef.get<SavedWebsiteService>(SavedWebsiteService);
  });

  it('should be defined', () => {
    expect(savedWebsiteService).toBeDefined();
  });

  describe('getUserSavedWebsites', () => {
    it('positive: should fetch users saved websites', async () => {
      await savedWebsiteService.getUserSavedWebsites(userDummy.id);

      expect(SavedWebsiteRepositoryMock.orm.find).toBeCalledWith({
        where: { user_id: userDummy.id },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('saveWebsites', () => {
    it('positive: should save each website passed into function', async () => {
      const savedWebsiteDummy = { url: 'www.test.com', title: 'Test Site' };
      await savedWebsiteService.saveWebsites(userDummy.id, [savedWebsiteDummy]);

      expect(SavedWebsiteRepositoryMock.orm.save).toBeCalledWith([
        new SavedWebsite({ user_id: userDummy.id, ...savedWebsiteDummy }),
      ]);
    });
  });

  describe('deleteSavedWebsite', () => {
    it('positive: should delete user saved website', async () => {
      const websiteIdDummy = randomUUID();
      await savedWebsiteService.deleteSavedWebsite(userDummy.id, websiteIdDummy);

      expect(SavedWebsiteRepositoryMock.orm.delete).toBeCalledWith({ user_id: userDummy.id, id: websiteIdDummy });
    });
  });

  describe('deleteSavedWebsites', () => {
    it('positive: should delete user saved website', async () => {
      const websiteIdDummy = randomUUID();
      await savedWebsiteService.deleteSavedWebsites(userDummy.id, [websiteIdDummy]);

      expect(SavedWebsiteRepositoryMock.orm.delete).toBeCalledWith({ user_id: userDummy.id, id: In([websiteIdDummy]) });
    });
  });
});
