import { Test, TestingModule } from '@nestjs/testing';
import { ExternalApiController } from './external-api.controller';
import { FocusModeManagerService } from '../../focus-mode/services/focus-mode-manager/focus-mode-manager.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CompletedActivityService } from '../../activity/services/completed-activity/completed-activity.service';
import { ActivitySequenceRepository } from '../../activity/repositories/activity-sequence.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { DeviceRepository } from '../../device/repositories/device.repository';
import { DeviceService } from '../../device/services/device/device.service';
import { Passport } from '../../auth/domain/passport.model';
import { userDummy } from '../../../../test/dummies';
import { ActivityType } from '../../activity/domain/activity-type.enum';

describe('ExternalApiController', () => {
  let controller: ExternalApiController;

  const passport = new Passport({
    user: userDummy as any,
    isAuth: true,
    declineReason: null,
  });

  const focusModeManagerServiceMock = {
    startCurrentFocusMode: jest.fn(),
  };

  const focusModeServiceMock = {
    fetchUserFocusModes: jest.fn(),
  };

  const completedActivityServiceMock = {
    completeActivity: jest.fn(),
  };

  const activitySequenceRepositoryMock = {
    orm: {
      find: jest.fn(),
    },
  };

  const userRepositoryMock = {
    orm: {
      findOne: jest.fn(),
    },
  };

  const deviceRepositoryMock = {
    orm: {
      findOne: jest.fn(),
    },
  };

  const deviceServiceMock = {
    createOrUpdateDevice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalApiController],
      providers: [
        { provide: FocusModeManagerService, useValue: focusModeManagerServiceMock },
        { provide: FocusModeService, useValue: focusModeServiceMock },
        { provide: CompletedActivityService, useValue: completedActivityServiceMock },
        { provide: ActivitySequenceRepository, useValue: activitySequenceRepositoryMock },
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: DeviceRepository, useValue: deviceRepositoryMock },
        { provide: DeviceService, useValue: deviceServiceMock },
      ],
    }).compile();

    controller = module.get<ExternalApiController>(ExternalApiController);
    jest.clearAllMocks();
  });

  it('returns sample webhook payloads for testing', async () => {
    const result = await controller.getWebhookSample('habit.completed', passport);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('event_type', 'habit.completed');
  });

  it('completes habit using leader device when available', async () => {
    activitySequenceRepositoryMock.orm.find.mockResolvedValueOnce([
      {
        id: 'seq-1',
        type: ActivityType.morning,
        activities: [
          {
            id: 'act-1',
            activity_data: { name: 'Meditation' },
            duration_seconds: 300,
          },
        ],
      },
    ]);

    deviceRepositoryMock.orm.findOne.mockResolvedValueOnce({ id: 'device-1' });
    completedActivityServiceMock.completeActivity.mockResolvedValueOnce({
      completed_activity_log: { id: 'log-1' },
    });

    const result = await controller.completeHabit(
      {},
      { habit_name: 'Meditation', routine_name: 'morning', duration_seconds: 300 } as any,
      passport,
    );

    expect(completedActivityServiceMock.completeActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_id: 'act-1',
        activity_sequence_id: 'seq-1',
        device_id: 'device-1',
        should_not_update_current_activity: true,
      }),
      {},
      { user_id: userDummy.id },
    );
    expect(result.completed_activity_log_id).toBe('log-1');
  });
});
