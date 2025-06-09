import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import * as sendGrid from '@sendgrid/mail';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';

// Create a shared mock manager and data source
const mockManager = {
  find: jest.fn(),
  findOne: jest.fn(),
};
const mockDataSource = {
  manager: mockManager,
  initialize: jest.fn(),
};

// Mock dependencies
jest.mock('@sendgrid/mail');
jest.mock('auth0');
jest.mock('../data-source', () => ({
  CronJobDataSource: mockDataSource,
}));

describe('Data Sync Notification Cron Job', () => {
  let mockAuth0Client: jest.Mocked<ManagementClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Auth0 mock
    mockAuth0Client = {
      users: {
        get: jest.fn(),
      },
    } as unknown as jest.Mocked<ManagementClient>;
    (ManagementClient as jest.Mock).mockImplementation(() => mockAuth0Client);
  });

  it('should send emails to users with outdated data', async () => {
    const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();
    const mockParticipants = [
      {
        id: '1',
        userId: 'user1',
        usageDataLastReceived: DateTime.now().minus({ days: 4 }).toJSDate(),
      },
      {
        id: '2',
        userId: 'user2',
        usageDataLastReceived: DateTime.now().minus({ days: 5 }).toJSDate(),
      },
    ];
    const mockUsers = [
      {
        id: 'user1',
        auth0_id: 'auth0_1',
        language: 'en',
      },
      {
        id: 'user2',
        auth0_id: 'auth0_2',
        language: 'es',
      },
    ];
    const mockAuth0Users = [{ email: 'user1@example.com' }, { email: 'user2@example.com' }];
    mockManager.find.mockResolvedValue(mockParticipants);
    mockManager.findOne.mockResolvedValueOnce(mockUsers[0]).mockResolvedValueOnce(mockUsers[1]);
    (mockAuth0Client.users.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockAuth0Users[0] })
      .mockResolvedValueOnce({ data: mockAuth0Users[1] });
    (sendGrid.send as jest.Mock).mockResolvedValue(undefined);
    await import('./cron-job');
    expect(mockManager.find).toHaveBeenCalledWith(StudyParticipant, {
      where: { usageDataLastReceived: LessThan(threeDaysAgo) },
    });
    expect(mockAuth0Client.users.get).toHaveBeenCalledTimes(2);
    expect(mockAuth0Client.users.get).toHaveBeenCalledWith({ id: 'auth0_1' });
    expect(mockAuth0Client.users.get).toHaveBeenCalledWith({ id: 'auth0_2' });
    expect(sendGrid.send).toHaveBeenCalledTimes(2);
    expect(sendGrid.send).toHaveBeenCalledWith({
      to: 'user1@example.com',
      from: expect.any(String),
      subject: expect.any(String),
      text: expect.any(String),
    });
    expect(sendGrid.send).toHaveBeenCalledWith({
      to: 'user2@example.com',
      from: expect.any(String),
      subject: expect.any(String),
      text: expect.any(String),
    });
  });

  it('should handle missing users gracefully', async () => {
    const mockParticipants = [
      {
        id: '1',
        userId: 'user1',
        usageDataLastReceived: DateTime.now().minus({ days: 4 }).toJSDate(),
      },
    ];
    mockManager.find.mockResolvedValue(mockParticipants);
    mockManager.findOne.mockResolvedValue(null);
    await import('./cron-job');
    expect(sendGrid.send).not.toHaveBeenCalled();
  });

  it('should handle Auth0 errors gracefully', async () => {
    const mockParticipants = [
      {
        id: '1',
        userId: 'user1',
        usageDataLastReceived: DateTime.now().minus({ days: 4 }).toJSDate(),
      },
    ];
    const mockUser = {
      id: 'user1',
      auth0_id: 'auth0_1',
      language: 'en',
    };
    mockManager.find.mockResolvedValue(mockParticipants);
    mockManager.findOne.mockResolvedValue(mockUser);
    (mockAuth0Client.users.get as jest.Mock).mockRejectedValue(new Error('Auth0 error'));
    await import('./cron-job');
    expect(sendGrid.send).not.toHaveBeenCalled();
  });
});
