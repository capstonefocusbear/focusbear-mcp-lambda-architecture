import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Activity } from '../../src/modules/activity/entities/activity.entity';
import { AppModule } from '../../src/app.module';
import { testUserRoutineHabitPack } from '../dummies/habit-packs.dummies';
import { auth0LoginUser } from '../utils/auth0-login';
import { trackDtoDummy } from '../dummies';

describe('endpoints', () => {
  let app: NestFastifyApplication;
  // Test user ID - 2636a216-f363-493e-aeb8-d275a0a9016d
  // Point base URL to staging server URL and run: npm run test:e2e
  const testUser = {
    email: 'backendtestuser@mail.com',
    password: 'Passw0rd!',
  };
  const userDeviceId = '092d701d-26f4-4e3b-9da0-bde03f950982';
  const userFocusModeId = '6a85825f-2b49-46c5-b838-dd1bafa5f6ed';
  let token: string;
  const baseURL = 'https://eyst-backend-prod-pr-302.onrender.com';
  let userFirstActivity: Activity;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const tokenData = await auth0LoginUser(testUser.email, testUser.password);
    token = tokenData.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /healthcheck', () => {
    it('positive: should return 200 status code', async () => {
      const response = await request(baseURL).get('/healthcheck');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /user-settings', () => {
    it('positive: should return 200 status code', async () => {
      const response = await request(baseURL)
        .get('/user-settings')
        .set({ Authorization: `Bearer ${token}` });

      const { morning_activities } = response.body;
      // eslint-disable-next-line prefer-destructuring
      userFirstActivity = morning_activities[0];
      expect(response.status).toBe(200);
      expect(response.body.startup_time).toBeString();
    });
  });

  describe('POST /focus-mode/:focus_mode_id/start', () => {
    jest.setTimeout(10000);
    it('positive: should return successful start message', async () => {
      const startTime = new Date();
      const finishTime = new Date();
      finishTime.setHours(finishTime.getHours() + 2);
      const responseMessage = 'Focus mode has been successfully started!';
      const response = await request(baseURL)
        .post(`/focus-mode/${userFocusModeId}/start`)
        .send({
          finish_time: finishTime,
          start_time: startTime,
          intention: 'Study',
        })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.body.message).toBe(responseMessage);
      expect(response.status).toBe(201);
    });
  });

  describe('POST /focus-mode/:id/finish', () => {
    jest.setTimeout(10000);
    it('positive: should return successful completion message', async () => {
      const responseMessage = 'Focus mode has been successfully finished!';
      const response = await request(baseURL)
        .post(`/focus-mode/${userFocusModeId}/finish`)
        .send({
          finish_time: new Date(),
        })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.body.message).toBe(responseMessage);
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /habit-packs', () => {
    it('positive: should return a 200 status code for upserting habit pack', async () => {
      const response = await request(baseURL)
        .put('/habit-packs')
        .send({ ...testUserRoutineHabitPack })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /habit-packs/:pack_id/install', () => {
    it('positive: should return a 201 status code for installing habit pack', async () => {
      const response = await request(baseURL)
        .post(`/habit-packs/${testUserRoutineHabitPack.id}/install`)
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /habit-packs/:pack_id/uninstall', () => {
    it('positive: should return a 200 status code for uninstalling habit pack', async () => {
      const response = await request(baseURL)
        .delete(`/habit-packs/${testUserRoutineHabitPack.id}/uninstall`)
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /completed-activity', () => {
    it('positive: should return a 201 status code for newly created completed activity record and starting sequence', async () => {
      const startTime = new Date();
      const finishTime = new Date();
      finishTime.setMinutes(finishTime.getMinutes() + 5);
      const response = await request(baseURL)
        .post('/completed-activity')
        .send({
          activity_id: userFirstActivity.id,
          choice_id: null,
          quantity_logged: 20,
          duration_logged: 120,
          device_id: userDeviceId,
          activity_sequence_id: userFirstActivity.activity_sequence_id,
          start_time: startTime,
          finish_time: finishTime,
        })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /completed-activity/sync', () => {
    it('positive: should return a 201 status code for newly created completed activity logs', async () => {
      const response = await request(baseURL)
        .post('/completed-activity/sync')
        .send({
          completed_activites: [
            {
              activity_id: 'a7e6f2e9-d783-4443-864e-22071b853700',
              device_id: userDeviceId,
              activity_sequence_id: '992f79ca-380a-44fa-9166-eba70251712f',
              duration_logged: 120,
              start_time: '2022-12-10T12:00:00+0000',
              finish_time: '2022-12-10T12:02:00+0000',
            },
            {
              activity_id: 'dba00bb3-0482-4b63-8675-2781818141b2',
              device_id: userDeviceId,
              activity_sequence_id: '992f79ca-380a-44fa-9166-eba70251712f',
              duration_logged: 120,
              start_time: '2022-12-10T12:00:00+0000',
              finish_time: '2022-12-10T12:02:00+0000',
            },
            {
              activity_id: '2aec3416-c3c0-47ea-b5d2-45c35ad57043',
              device_id: userDeviceId,
              activity_sequence_id: '4cef5086-3d11-4e22-9380-3e50a357bcb9',
              duration_logged: 120,
              start_time: '2022-12-12T20:00:00+0000',
              finish_time: '2022-12-12T20:05:00+0000',
            },
            {
              activity_id: 'f93e4ebd-1246-487b-a090-3e10ee6871ad',
              device_id: userDeviceId,
              activity_sequence_id: '4cef5086-3d11-4e22-9380-3e50a357bcb9',
              duration_logged: 120,
              start_time: '2022-12-13T20:00:00+0000',
              finish_time: '2022-12-13T20:07:00+0000',
            },
          ],
        })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /completed-activity/:activity_id', () => {
    it('positive: should return a 200 status code', async () => {
      const fromTime = new Date();
      const toTime = new Date();
      fromTime.setDate(fromTime.getDate() - 1);
      const response = await request(baseURL)
        .get(`/completed-activity/${userFirstActivity.id}`)
        .query({ from_time: fromTime, to_time: toTime })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /completed-activity-sequence/:activity_sequence_id/force-complete-current-sequence', () => {
    it('positive: should return a 201 status code for newly created completed activity record and starting sequence', async () => {
      const response = await request(baseURL)
        .post(`/completed-activity-sequence/${userFirstActivity.activity_sequence_id}/force-complete-current-sequence`)
        .query({ cancel_habits_for_today: true })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /video-metadata', () => {
    it('positive: should return a 201 status code for newly created video metadata records', async () => {
      const response = await request(baseURL)
        .post('/video-metadata')
        .send({
          video_urls: [
            'https://www.youtube.com/watch?v=EL1wNBsEHiY',
            'https://www.youtube.com/watch?v=R0Ut6nldt9g',
            'https://youtu.be/KLKn9kA5t58',
          ],
        })
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /tracks', () => {
    it('positive: should return a 200 status for upserting track', async () => {
      const response = await request(baseURL)
        .put('/tracks')
        .send(trackDtoDummy)
        .set({ Authorization: `Bearer ${token}` });

      expect(response.status).toBe(200);
    });
  });
});
