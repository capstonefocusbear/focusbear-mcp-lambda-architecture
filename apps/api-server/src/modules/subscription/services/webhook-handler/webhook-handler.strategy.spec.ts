import { RevenueCatService } from '@app/revenue-cat';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { getQueueToken } from '@nestjs/bull';
import { QueueMock, TeamWithMembersDummy, userDummy } from '../../../../../test/dummies';
import { UserRepositoryMock, TeamRepositoryMock, RevenueCatServiceMock } from '../../../../../test/mocks';
import { TeamRepository } from '../../../team/repositories/team.repository';
import { UserRepository } from '../../../user/repositories/user.repository';
import { WebhookHandlerStrategy } from './webhook-handler.strategy';
import { Entitlement } from '../../domain/entitlement.enum';

describe('WebhookHandlerStrategy', () => {
  let webhookHandlerStrategy: WebhookHandlerStrategy;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserRepository,
        TeamRepository,
        RevenueCatService,
        WebhookHandlerStrategy,
        {
          provide: getQueueToken('revenue-cat-status'),
          useValue: QueueMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(TeamRepository)
      .useValue(TeamRepositoryMock)
      .overrideProvider(RevenueCatService)
      .useValue(RevenueCatServiceMock)
      .compile();

    webhookHandlerStrategy = moduleRef.get<WebhookHandlerStrategy>(WebhookHandlerStrategy);
  });

  it('should be defined', () => {
    expect(webhookHandlerStrategy).toBeDefined();
  });

  const testEventWithTeamEntitlement = {
    entitlement_ids: ['team_owner', 'team_size_5'],
    app_user_id: userDummy.id,
    expiration_at_ms: Date.now(),
  };
  const testEventWithPersonalEntitlement = {
    entitlement_ids: ['personal'],
  };

  describe('INITIAL_PURCHASE', () => {
    it('positive: if there is no team_owner entitlement return null', async () => {
      const result = await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithPersonalEntitlement);

      expect(result).toBeNull();
    });

    it('positive: team item should be created (or updated if exists), user item should be saved with team association', async () => {
      TeamRepositoryMock.upsert.mockResolvedValue(TeamWithMembersDummy);

      await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithTeamEntitlement);

      expect(TeamRepositoryMock.upsert).toBeCalledWith(
        {
          team_size: 5,
          owner_id: testEventWithTeamEntitlement.app_user_id,
          expires_date: expect.toBeDate(),
        },
        ['owner_id'],
      );
      expect(UserRepositoryMock.update).toBeCalledWith(testEventWithTeamEntitlement.app_user_id, {
        owner_of_team_id: TeamWithMembersDummy.id,
        member_of_team_id: TeamWithMembersDummy.id,
      });
    });
  });

  describe('RENEWAL', () => {
    it('positive: if there is no team_owner entitlement return null', async () => {
      const result = await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithPersonalEntitlement);

      expect(result).toBeNull();
    });

    it('positive: team needs to be activated, access for all members should be granted', async () => {
      const id = randomUUID();
      TeamWithMembersDummy.members.push({ ...userDummy, id });
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);

      await webhookHandlerStrategy.RENEWAL(testEventWithTeamEntitlement);

      expect(TeamRepositoryMock.orm.save).toBeCalledWith({
        ...TeamWithMembersDummy,
        is_active: true,
        expires_date: new Date(testEventWithTeamEntitlement.expiration_at_ms),
      });
      expect(RevenueCatServiceMock.grantTeamMembership).toBeCalledWith(id, Entitlement.team_member);
    });
  });

  describe('EXPIRATION', () => {
    it('positive: if there is no team_owner entitlement return null', async () => {
      const result = await webhookHandlerStrategy.INITIAL_PURCHASE(testEventWithPersonalEntitlement);

      expect(result).toBeNull();
    });

    it('positive: team needs to be deactivated, access for all members should be revoked', async () => {
      const id = randomUUID();
      TeamWithMembersDummy.members.push({ ...userDummy, id });
      TeamRepositoryMock.orm.findOne.mockResolvedValue(TeamWithMembersDummy);

      await webhookHandlerStrategy.EXPIRATION(testEventWithTeamEntitlement);

      expect(TeamRepositoryMock.orm.save).toBeCalledWith({ ...TeamWithMembersDummy, is_active: false });
      expect(RevenueCatServiceMock.revokeTeamMembership).toBeCalledWith(id, Entitlement.team_member);
    });
  });

  describe('TEST', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.TEST();

      expect(result).toBeNull();
    });
  });

  describe('NON_RENEWING_PURCHASE', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.NON_RENEWING_PURCHASE(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('CANCELLATION', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.CANCELLATION(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('PRODUCT_CHANGE', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.PRODUCT_CHANGE(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('UNCANCELLATION', () => {
    it('positive: should return null', async () => {
      const result = await webhookHandlerStrategy.UNCANCELLATION(testEventWithTeamEntitlement);

      expect(result).toBeNull();
    });
  });

  describe('BILLING_ISSUE', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.BILLING_ISSUE();

      expect(result).toBeNull();
    });
  });

  describe('SUBSCRIPTION_PAUSED', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.SUBSCRIPTION_PAUSED();

      expect(result).toBeNull();
    });
  });

  describe('TRANSFER', () => {
    it('positive: should return null', () => {
      const result = webhookHandlerStrategy.TRANSFER();

      expect(result).toBeNull();
    });
  });
});
