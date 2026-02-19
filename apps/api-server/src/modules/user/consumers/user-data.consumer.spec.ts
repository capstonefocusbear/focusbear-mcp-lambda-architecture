import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { Auth0ManagementService } from '@app/auth0';
import { RevenueCatService } from '@app/revenue-cat';
import { R2Service } from '@app/r2/services/r2.service';
import { SendGridService } from '@app/send-grid';
import { I18nService } from 'nestjs-i18n';
import { Job } from 'bull';
import {
  Auth0ManagementServiceMock,
  RevenueCatServiceMock,
  R2ServiceMock,
  SendGridServiceMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { LanguageOptions } from '../../../shared/domain/language-options.enum';
import { UserRepository } from '../repositories/user.repository';
import { UserPersonalDataConsumer } from './user-data.consumer';

describe('UserPersonalDataConsumer', () => {
  let consumer: UserPersonalDataConsumer;

  const i18nServiceMock = {
    t: jest.fn(),
  };

  const buildJob = (): Job<{ user_id: string; language: LanguageOptions }> =>
    ({
      data: {
        user_id: 'user-1',
        language: LanguageOptions.ENGLISH,
      },
    } as Job<{ user_id: string; language: LanguageOptions }>);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPersonalDataConsumer,
        { provide: SENTRY_TOKEN, useValue: SentryServiceMock },
        { provide: Auth0ManagementService, useValue: Auth0ManagementServiceMock },
        { provide: RevenueCatService, useValue: RevenueCatServiceMock },
        { provide: UserRepository, useValue: UserRepositoryMock },
        { provide: R2Service, useValue: R2ServiceMock },
        { provide: SendGridService, useValue: SendGridServiceMock },
        { provide: I18nService, useValue: i18nServiceMock },
      ],
    }).compile();

    consumer = module.get<UserPersonalDataConsumer>(UserPersonalDataConsumer);
    jest.clearAllMocks();
  });

  it('loads user personal data using query relation strategy with tasks and notifications relations', async () => {
    UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
      id: 'user-1',
      auth0_id: 'auth0|user-1',
      to_dos: [],
      notifications: [],
    });
    Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: 'user@example.com' });
    RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValueOnce({ id: 'subscriber-1' });
    R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://example.com/download');
    i18nServiceMock.t.mockReturnValue('translated');

    await consumer.readOperationJob(buildJob());

    expect(UserRepositoryMock.orm.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      relationLoadStrategy: 'query',
      relations: [
        'devices',
        'activities',
        'activities.log_quantity_questions',
        'focus_modes',
        'to_dos',
        'notifications',
      ],
    });
  });

  it('exports fetched to_dos and notifications to R2 payload', async () => {
    const toDos = [{ id: 'todo-1', title: 'Task 1' }];
    const notifications = [{ id: 'notification-1', summary: 'Calendar event' }];

    UserRepositoryMock.orm.findOne.mockResolvedValueOnce({
      id: 'user-1',
      auth0_id: 'auth0|user-1',
      to_dos: toDos,
      notifications,
    });
    Auth0ManagementServiceMock.getAuth0User.mockResolvedValueOnce({ email: 'user@example.com' });
    RevenueCatServiceMock.getOrCreateSubscriber.mockResolvedValueOnce({ id: 'subscriber-1' });
    R2ServiceMock.getPresignedUrl.mockResolvedValueOnce('https://example.com/download');
    i18nServiceMock.t.mockReturnValue('translated');

    await consumer.readOperationJob(buildJob());

    expect(R2ServiceMock.addObjectToBucket).toHaveBeenCalledWith(
      'user-data',
      'user-1',
      expect.objectContaining({
        focus_bear_data: expect.objectContaining({
          to_dos: toDos,
          notifications,
        }),
      }),
    );
    expect(SendGridServiceMock.sendEmail).toHaveBeenCalled();
  });
});
