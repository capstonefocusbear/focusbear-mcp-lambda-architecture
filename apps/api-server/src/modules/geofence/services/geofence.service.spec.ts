import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { userDummy } from '../../../../test/dummies';
import { ActivitySequenceRepositoryMock, GeofenceRepositoryMock } from '../../../../test/mocks';
import { ActivitySequenceRepository } from '../../activity/repositories/activity-sequence.repository';
import { Geofence } from '../entities/geofence.entity';
import { GeofenceRepository } from '../repositories/geofence.repository';
import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
  let geofenceService: GeofenceService;

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
      expect(GeofenceRepositoryMock.orm.save).not.toHaveBeenCalled();
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

      GeofenceRepositoryMock.findByIdAndUserId.mockResolvedValueOnce(existingGeofence);
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
      expect(GeofenceRepositoryMock.orm.save).not.toHaveBeenCalled();
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

      GeofenceRepositoryMock.findByIdAndUserId.mockResolvedValueOnce(existingGeofence);
      GeofenceRepositoryMock.orm.save.mockResolvedValueOnce({
        ...existingGeofence,
        associated_routine_id: null,
      });

      await geofenceService.updateGeofence(userDummy.id, geofenceId, {
        associated_routine_id: null,
      } as any);

      expect(ActivitySequenceRepositoryMock.findOneByIdForUser).not.toHaveBeenCalled();
      expect(GeofenceRepositoryMock.orm.save).toHaveBeenCalledWith(
        expect.objectContaining({ associated_routine_id: null }),
      );
    });
  });
});
