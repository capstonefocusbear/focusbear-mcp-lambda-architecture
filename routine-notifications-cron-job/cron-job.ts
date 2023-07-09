import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { OpenAIApi, Configuration } from 'openai';
import * as fs from 'fs';
import { BeamsPublishRequest } from '../libs/pusher-beams/src/domains/pusher-beams-publish-request.model';
import { CronJobDataSource } from '../user-stats-cron-job/data-source';
import { User } from '../apps/api-server/src/modules/user/entities/user.entity';
import { ActivityType } from '../apps/api-server/src/modules/activity/domain/activity-type.enum';

const MORNING_ROUTINE_TITLES = {
  en: "It's time for your morning routine!",
  es: '¡Es hora de tu rutina matutina!',
};
const EVENING_ROUTINE_TITLES = {
  en: "It's time for your evening routine!",
  es: '¡Es hora de tu rutina nocturna!',
};
const LANGUAGES = ['es', 'en'];
const LANGUAGES_MAP = {
  en: 'English',
  es: 'Spanish',
};

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

interface TranslationDataType {
  [key: string]: { morning: { title: string; message: string }; evening: { title: string; message: string } };
}

const openAiConfig = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openAiAPI = new OpenAIApi(openAiConfig);

function getPrompt(routine: string, language: string) {
  return `In ${LANGUAGES_MAP[language]}, create a push notification text in a humorous and and motivational tone, telling the user it's time to start their evening ${routine} they've set up to help with their productivity and habit formation. Return only the message and no new lines. Message: `;
}

async function generateRoutineNotification(routine: string, fileName: string, language: string) {
  try {
    const response = await openAiAPI.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: getPrompt(routine, language) }],
      temperature: 0.5,
      max_tokens: 100,
      n: 1,
    });
    const message = response.data.choices[0].message.content.trim();
    const messageObj = {
      message,
      timestamp: DateTime.utc().toISO(),
    };
    fs.writeFileSync(fileName, JSON.stringify(messageObj));
  } catch (error) {
    console.error('Error generating message in notification cron job: ', error);
  }
}

async function getMessage(routine: string, fileName: string, language: string): Promise<null | string> {
  if (!fs.existsSync(fileName)) {
    await generateRoutineNotification(routine, fileName, language);
    return null;
  }
  const messageObj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  const messageDate = DateTime.fromISO(messageObj.timestamp);
  const currentDate = DateTime.utc();
  if (!currentDate.hasSame(messageDate, 'day')) {
    await generateRoutineNotification(routine, fileName, language);
    return null;
  }
  return messageObj.message;
}

async function getUsersForStartup() {
  const currentTime = DateTime.local();
  const oneMinuteBeforeNow = currentTime.minus({ minute: 1 });
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampMinusMinute = oneMinuteBeforeNow.toFormat('HH:mm');
  const users = await CronJobDataSource.manager.find(User, {
    where: [{ utc_startup_time: timeStamp }, { utc_startup_time: timeStampMinusMinute }],
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
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampMinusMinute = oneMinuteBeforeNow.toFormat('HH:mm');
  const users = await CronJobDataSource.manager.find(User, {
    where: [{ utc_shutdown_time: timeStamp }, { utc_shutdown_time: timeStampMinusMinute }],
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

function publishToUsersByLanguage(
  users: User[],
  language: string,
  routine: string,
  translationData: TranslationDataType,
) {
  const usersMatchingLanguage = users.filter((user) => user.language === language);
  const userIDs = usersMatchingLanguage.map((user) => user.id);
  if (userIDs.length !== 0) {
    const { title, message } = translationData[language][routine];
    const publishRequest = new BeamsPublishRequest({
      apns: { aps: {}, data: { title, body: message } },
      fcm: { data: { title, body: message } },
    });
    return beamsClient.publishToUsers(userIDs, publishRequest);
  }
}

function createFileName(routine: string, language: string) {
  return `./routine-notifications-cron-job/${routine}-message-${language}.json`;
}

(async () => {
  await CronJobDataSource.initialize();
  const translationData: TranslationDataType = {};

  for await (const language of LANGUAGES) {
    const morningMessage = await getMessage(
      ActivityType.morning,
      createFileName(ActivityType.morning, language),
      language,
    );
    const eveningMessage = await getMessage(
      ActivityType.evening,
      createFileName(ActivityType.evening, language),
      language,
    );
    translationData[language] = {
      morning: { title: MORNING_ROUTINE_TITLES[language], message: morningMessage },
      evening: { title: EVENING_ROUTINE_TITLES[language], message: eveningMessage },
    };
    const startupUsers = await getUsersForStartup();
    const shutdownUsers = await getUsersForShutdown();
    await Promise.all([
      publishToUsersByLanguage(startupUsers, language, ActivityType.morning, translationData),
      publishToUsersByLanguage(shutdownUsers, language, ActivityType.evening, translationData),
    ]);
    await Promise.all([
      updateUsersMorningRoutineNotification(startupUsers),
      updateUsersEveningRoutineNotification(shutdownUsers),
    ]);
  }

  process.exit();
})();
