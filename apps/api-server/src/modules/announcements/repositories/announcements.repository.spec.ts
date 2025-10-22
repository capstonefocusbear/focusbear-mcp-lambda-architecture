import { AnnouncementsRepository } from './announcements.repository';

describe('AnnouncementsRepository', () => {
  it('should be defined', () => {
    expect(new AnnouncementsRepository()).toBeDefined();
  });
});
