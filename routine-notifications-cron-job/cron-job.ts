import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { OpenAIApi, Configuration } from 'openai';
import * as fs from 'fs';
import { BeamsPublishRequest } from '../libs/pusher-beams/src/domains/pusher-beams-publish-request.model';
import { CronJobDataSource } from '../user-stats-cron-job/data-source';
import { User } from '../apps/api-server/src/modules/user/entities/user.entity';

const MORNING_JSON_FILE_ENGLISH = './routine-notifications-cron-job/morning-message-english.json';
const EVENING_JSON_FILE_ENGLISH = './routine-notifications-cron-job/evening-message-english.json';
const MORNING_JSON_FILE_SPANISH = './routine-notifications-cron-job/morning-message-spanish.json';
const EVENING_JSON_FILE_SPANISH = './routine-notifications-cron-job/evening-message-spanish.json';
const ENGLISH = 'English';
const SPANISH = 'Spanish';

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

const openAiConfig = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openAiAPI = new OpenAIApi(openAiConfig);

const MORNING_NOTIFICATION_PROMPT =
  "create a push notification text telling the user it's time to start their morning routine they've set up to help with their productivity and habit formation. Return only the message and no new lines. Message: ";
const EVENING_NOTIFICATION_PROMPT =
  "create a push notification text telling the user it's time to start their evening routine they've set up to help with their productivity and habit formation. Return only the message and no new lines. Message: ";

async function generateRoutineNotification(prompt: string, fileName: string, language: string) {
  try {
    const response = await openAiAPI.createCompletion({
      model: 'text-davinci-003',
      temperature: 0.5,
      max_tokens: 100,
      prompt: `In ${language}, ${prompt}`,
    });
    const message = response.data.choices[0].text.trim();
    const messageObj = {
      message,
      timestamp: DateTime.utc().toISO(),
    };
    fs.writeFileSync(fileName, JSON.stringify(messageObj));
  } catch (error) {
    console.error('Error generating message in notification cron job: ', error);
  }
}

async function getMessage(prompt: string, fileName: string, language: string): Promise<null | string> {
  if (!fs.existsSync(fileName)) {
    await generateRoutineNotification(prompt, fileName, language);
    return null;
  }
  const messageObj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  const messageDate = DateTime.fromISO(messageObj.timestamp);
  const currentDate = DateTime.utc();
  if (!currentDate.hasSame(messageDate, 'day')) {
    await generateRoutineNotification(prompt, fileName, language);
    return null;
  }
  return messageObj.message;
}

async function getUsersForStartup() {
  const currentTime = DateTime.local();
  const oneMinuteBeforeNow = currentTime.minus({ minute: 1 });
  const currentHours = currentTime.hour < 10 ? `0${currentTime.hour}` : currentTime.hour.toString();
  const currentMinutes = currentTime.minute < 10 ? `0${currentTime.minute}` : currentTime.minute.toString();
  const currentHoursMinusMinute =
    oneMinuteBeforeNow.hour < 10 ? `0${oneMinuteBeforeNow.hour}` : oneMinuteBeforeNow.hour.toString();
  const currentMinutesMinusMinute =
    oneMinuteBeforeNow.minute < 10 ? `0${oneMinuteBeforeNow.minute}` : oneMinuteBeforeNow.minute.toString();
  const timeStamp = `${currentHours}:${currentMinutes}`;
  const timeStampOneMinuteBeforeNow = `${currentHoursMinusMinute}:${currentMinutesMinusMinute}`;
  const users = await CronJobDataSource.manager.find(User, {
    where: [{ utc_startup_time: timeStamp }, { utc_startup_time: timeStampOneMinuteBeforeNow }],
  });
  const usersToReceiveNotification = users.filter((user) => {
    const lastMorningRoutineNotification = DateTime.fromJSDate(
      new Date(user.routine_notification_times.last_time_notified_of_morning_routine),
    );
    const hasReceivedNotificationToday = lastMorningRoutineNotification.hasSame(currentTime, 'day');
    return !hasReceivedNotificationToday;
  });
  return usersToReceiveNotification;
}

async function getUsersForShutdown() {
  const currentTime = DateTime.local();
  const oneMinuteBeforeNow = currentTime.minus({ minute: 1 });
  const currentHours = currentTime.hour < 10 ? `0${currentTime.hour}` : currentTime.hour.toString();
  const currentMinutes = currentTime.minute < 10 ? `0${currentTime.minute}` : currentTime.minute.toString();
  const currentHoursMinusMinute =
    oneMinuteBeforeNow.hour < 10 ? `0${oneMinuteBeforeNow.hour}` : oneMinuteBeforeNow.hour.toString();
  const currentMinutesMinusMinute =
    oneMinuteBeforeNow.minute < 10 ? `0${oneMinuteBeforeNow.minute}` : oneMinuteBeforeNow.minute.toString();
  const timeStamp = `${currentHours}:${currentMinutes}`;
  const timeStampOneMinuteFromNow = `${currentHoursMinusMinute}:${currentMinutesMinusMinute}`;
  const users = await CronJobDataSource.manager.find(User, {
    where: [{ utc_shutdown_time: timeStamp }, { utc_shutdown_time: timeStampOneMinuteFromNow }],
  });
  const usersToReceiveNotification = users.filter((user) => {
    const lastEveningRoutineNotification = DateTime.fromJSDate(
      new Date(user.routine_notification_times.last_time_notified_of_evening_routine),
    );
    const hasReceivedNotificationToday = lastEveningRoutineNotification.hasSame(currentTime, 'day');
    return !hasReceivedNotificationToday;
  });
  return usersToReceiveNotification;
}

async function updateUsersMorningRoutineNotification(users: User[]) {
  const updatedUsers = users.map((user) => {
    const userClone = { ...user };
    userClone.routine_notification_times.last_time_notified_of_morning_routine = DateTime.local().toJSDate();
    return userClone;
  });
  await CronJobDataSource.manager.save(User, updatedUsers);
}

async function updateUsersEveningRoutineNotification(users: User[]) {
  const updatedUsers = users.map((user) => {
    const userClone = { ...user };
    userClone.routine_notification_times.last_time_notified_of_evening_routine = DateTime.local().toJSDate();
    return userClone;
  });
  await CronJobDataSource.manager.save(User, updatedUsers);
}

async function sendMorningNotifications(users: User[]) {
  const userIds = users.map((user) => user.id);
  const publishRequest = new BeamsPublishRequest({
    apns: {
      aps: {},
      data: {
        text: 'Time for your morning routine!',
        body: 'Start your morning routine to get your productivity up.',
      },
    },
    fcm: {
      data: {
        text: 'Time for your morning routine!',
        body: 'Start your morning routine to get your productivity up.',
      },
    },
  });
  if (userIds.length !== 0) {
    await beamsClient.publishToUsers(userIds, publishRequest);
  }
}

// TODO: Merge PR adding language column to users table then separate English and Spanish users and send different notifications
async function sendEveningNotifications(users: User[]) {
  const userIds = users.map((user) => user.id);
  const publishRequest = new BeamsPublishRequest({
    apns: {
      aps: {},
      data: {
        text: 'Time for your evening routine!',
        body: 'Start your evening routine to get your productivity up.',
      },
    },
    fcm: {
      data: {
        text: 'Time for your evening routine!',
        body: 'Start your evening routine to get your productivity up.',
      },
    },
  });
  if (userIds.length !== 0) {
    await beamsClient.publishToUsers(userIds, publishRequest);
  }
}

(async () => {
  await CronJobDataSource.initialize();
  // TODO: pass messages into functions sending notifications
  await getMessage(MORNING_NOTIFICATION_PROMPT, MORNING_JSON_FILE_ENGLISH, ENGLISH);
  await getMessage(EVENING_NOTIFICATION_PROMPT, EVENING_JSON_FILE_ENGLISH, ENGLISH);
  await getMessage(MORNING_NOTIFICATION_PROMPT, MORNING_JSON_FILE_SPANISH, SPANISH);
  await getMessage(EVENING_NOTIFICATION_PROMPT, EVENING_JSON_FILE_SPANISH, SPANISH);
  const startupUsers = await getUsersForStartup();
  const shutdownUsers = await getUsersForShutdown();
  await Promise.all([sendMorningNotifications(startupUsers), sendEveningNotifications(shutdownUsers)]);
  await Promise.all([
    updateUsersMorningRoutineNotification(startupUsers),
    updateUsersEveningRoutineNotification(shutdownUsers),
  ]);
  process.exit();
})();
