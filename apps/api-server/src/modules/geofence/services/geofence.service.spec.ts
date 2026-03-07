import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { userDummy } from '../../../../test/dummies';
import { ActivitySequenceRepositoryMock, GeofenceRepositoryMock } from '../../../../test/mocks';
import { Activity } from '../../activity/entities/activity.entity';
import { ActivitySequenceRepository } from '../../activity/repositories/activity-sequence.repository';
import { Geofence } from '../entities/geofence.entity';
import { GeofenceRepository } from '../repositories/geofence.repository';
import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
  let geofenceService: GeofenceService;
  let transactionManagerMock: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GeofenceService, GeofenceRepository, ActivitySequenceRepository],
    })
      .overrideProvider(GeofenceRepository)
      .useValue(GeofenceRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .compile();

    geofenceService = moduleRef.get<GeofenceService>(GeofenceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManagerMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    GeofenceRepositoryMock.orm.manager.transaction.mockImplementation(
      async (callback: (manager: typeof transactionManagerMock) => Promise<unknown>) =>
        callback(transactionManagerMock),
    );
  });

  it('should be defined', () => {
    expect(geofenceService).toBeDefined();
  });

  describe('createGeofence', () => {
    it('Negative: should throw notfound error if associated routine is not found', async () => {
      const routineId = randomUUID();
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);

      let exception: any;
      try {
        await geofenceService.createGeofence(userDummy.id, {
          name: 'Home',
          latitude: 1,
          longitude: 2,
          associated_routine_id: routineId,
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Associated routine not found');
      expect(GeofenceRepositoryMock.orm.manager.transaction).not.toHaveBeenCalled();
    });

    it('Positive: should sync geofence id to routine activities when routine is provided', async () => {
      const routineId = randomUUID();
      const geofenceId = randomUUID();
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce({ id: routineId });
      transactionManagerMock.save.mockResolvedValueOnce({
        id: geofenceId,
        user_id: userDummy.id,
        associated_routine_id: routineId,
      });
      transactionManagerMock.find.mockResolvedValueOnce([{ id: randomUUID() }]);

      await geofenceService.createGeofence(userDummy.id, {
        name: 'Home',
        latitude: 1,
        longitude: 2,
        associated_routine_id: routineId,
      });

      expect(transactionManagerMock.update).toHaveBeenCalledWith(
        Activity,
        { user_id: userDummy.id, activity_sequence_id: routineId, is_deleted: false },
        { geofence_id: geofenceId },
      );
      const parentChoiceUpdateCall = transactionManagerMock.update.mock.calls.find(
        ([, criteria]) => criteria && typeof criteria === 'object' && 'parent_id' in criteria,
      );
      expect(parentChoiceUpdateCall).toBeDefined();
    });
  });

  describe('updateGeofence', () => {
    it('Negative: should throw notfound error if associated routine is not found', async () => {
      const geofenceId = randomUUID();
      const routineId = randomUUID();
      const existingGeofence = new Geofence({
        id: geofenceId,
        user_id: userDummy.id,
        name: 'Office',
        latitude: '1',
        longitude: '2',
        radius: 100,
        associated_routine_id: routineId,
      });

      transactionManagerMock.findOne.mockResolvedValueOnce(existingGeofence);
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce(null);

      let exception: any;
      try {
        await geofenceService.updateGeofence(userDummy.id, geofenceId, {
          associated_routine_id: randomUUID(),
        });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual('Associated routine not found');
      expect(transactionManagerMock.save).not.toHaveBeenCalled();
    });

    it('Positive: should clear associated routine when null is provided', async () => {
      const geofenceId = randomUUID();
      const existingGeofence = new Geofence({
        id: geofenceId,
        user_id: userDummy.id,
        name: 'Gym',
        latitude: '1',
        longitude: '2',
        radius: 100,
        associated_routine_id: randomUUID(),
      });

      transactionManagerMock.findOne.mockResolvedValueOnce(existingGeofence);
      transactionManagerMock.save.mockResolvedValueOnce({
        ...existingGeofence,
        associated_routine_id: null,
      });

      await geofenceService.updateGeofence(userDummy.id, geofenceId, {
        associated_routine_id: null,
      });

      expect(ActivitySequenceRepositoryMock.findOneByIdForUser).not.toHaveBeenCalled();
      expect(transactionManagerMock.save).toHaveBeenCalledWith(
        Geofence,
        expect.objectContaining({ associated_routine_id: null }),
      );
      expect(transactionManagerMock.update).toHaveBeenCalledWith(
        Activity,
        { user_id: userDummy.id, geofence_id: geofenceId, is_deleted: false },
        { geofence_id: null },
      );
      const sequenceUpdateCalls = transactionManagerMock.update.mock.calls.filter(
        ([, criteria]) => criteria && typeof criteria === 'object' && 'activity_sequence_id' in criteria,
      );
      expect(sequenceUpdateCalls).toHaveLength(0);
    });

    it('Positive: should re-link geofence when associated routine changes from A to B', async () => {
      const geofenceId = randomUUID();
      const routineAId = randomUUID();
      const routineBId = randomUUID();
      const existingGeofence = new Geofence({
        id: geofenceId,
        user_id: userDummy.id,
        name: 'Office',
        latitude: '1',
        longitude: '2',
        radius: 100,
        associated_routine_id: routineAId,
      });

      transactionManagerMock.findOne.mockResolvedValueOnce(existingGeofence);
      ActivitySequenceRepositoryMock.findOneByIdForUser.mockResolvedValueOnce({ id: routineBId });
      transactionManagerMock.save.mockResolvedValueOnce({
        ...existingGeofence,
        associated_routine_id: routineBId,
      });
      transactionManagerMock.find.mockResolvedValueOnce([{ id: randomUUID() }]);

      await geofenceService.updateGeofence(userDummy.id, geofenceId, {
        associated_routine_id: routineBId,
      });

      expect(transactionManagerMock.update).toHaveBeenNthCalledWith(
        1,
        Activity,
        { user_id: userDummy.id, geofence_id: geofenceId, is_deleted: false },
        { geofence_id: null },
      );
      expect(transactionManagerMock.update).toHaveBeenNthCalledWith(
        2,
        Activity,
        { user_id: userDummy.id, activity_sequence_id: routineBId, is_deleted: false },
        { geofence_id: geofenceId },
      );
      const choiceUpdateCall = transactionManagerMock.update.mock.calls.find(
        ([, criteria]) => criteria && typeof criteria === 'object' && 'parent_id' in criteria,
      );
      expect(choiceUpdateCall).toBeDefined();
    });
  });
});
