import { Test } from '@nestjs/testing';
import { SavedWebsiteRepositoryMock } from '../../../../test/mocks/index';
import { SavedWebsiteService } from './saved-website.service';
import { SavedWebsiteRepository } from '../repositories/saved-website.repository';

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
});
