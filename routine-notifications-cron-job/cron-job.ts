/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import { OpenAIApi, Configuration } from 'openai';
// eslint-disable-next-line import/extensions
import * as S3 from 'aws-sdk/clients/s3.js';
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

const s3Client = new S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: process.env.R2_SIGNATURE_VERSION,
});

interface TranslationDataType {
  [key: string]: { morning: { title: string; message: string }; evening: { title: string; message: string } };
}

const openAiConfig = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openAiAPI = new OpenAIApi(openAiConfig);

function getPrompt(routine: string, language: string) {
  return `In ${LANGUAGES_MAP[language]}, create a push notification text in a humorous and and motivational tone, telling the user it's time to start their ${routine} routine they've set up to help with their productivity and habit formation. Return only the message and no new lines. Message: `;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getMessageFromR2(fileName: string) {
  try {
    const messageData = await s3Client.getObject({ Bucket: 'routine-notifications', Key: fileName }).promise();
    return JSON.parse(messageData.Body.toString());
  } catch (error) {
    return null;
  }
}

async function addMessageToR2(filename: string, messageData: { message: string; timestamp: string }) {
  const buf = Buffer.from(JSON.stringify(messageData));
  const objectData = {
    Bucket: 'routine-notifications',
    Key: filename,
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'application/json',
    ContentDisposition: 'attachment',
  };
  await s3Client.upload({ ...objectData }).promise();
}

async function generateRoutineNotification(routine: string, fileName: string, language: string) {
  const maxRetries = 3;
  const TEN_SECONDS = 10000;
  for (let i = 0; i <= maxRetries; i++) {
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
      await addMessageToR2(fileName, messageObj);
      // Exit the loop if request is successful
      return message;
    } catch (error) {
      console.error(
        `Attempt ${i + 1} of ${maxRetries + 1} failed. Error generating message in notification cron job: `,
        error,
      );
      // If we have not reached max retries, wait for ten seconds and retry.
      if (i < maxRetries) {
        await sleep(TEN_SECONDS);
      } else {
        console.error(`Failed to generate message in notification after ${maxRetries + 1} attempts.`);
      }
    }
  }
}

async function getMessage(routine: string, fileName: string, language: string): Promise<null | string> {
  const existingMessage = await getMessageFromR2(fileName);
  if (!existingMessage) {
    return generateRoutineNotification(routine, fileName, language);
  }
  const messageDate = DateTime.fromISO(existingMessage.timestamp);
  const currentDate = DateTime.utc();
  if (!currentDate.hasSame(messageDate, 'day')) {
    return generateRoutineNotification(routine, fileName, language);
  }
  return existingMessage.message;
}

async function getUsersForStartup() {
  const currentTime = DateTime.local();
  const oneMinuteBeforeNow = currentTime.minus({ minute: 1 });
  const oneMinuteAfterNow = currentTime.minus({ minute: 1 });
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampMinusMinute = oneMinuteBeforeNow.toFormat('HH:mm');
  const timeStampPlusMinute = oneMinuteAfterNow.toFormat('HH:mm');
  const users = await CronJobDataSource.manager.find(User, {
    where: [
      { utc_startup_time: timeStamp },
      { utc_startup_time: timeStampMinusMinute },
      { utc_startup_time: timeStampPlusMinute },
    ],
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
  const oneMinuteAfterNow = currentTime.minus({ minute: 1 });
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampMinusMinute = oneMinuteBeforeNow.toFormat('HH:mm');
  const timeStampPlusMinute = oneMinuteAfterNow.toFormat('HH:mm');
  const users = await CronJobDataSource.manager.find(User, {
    where: [
      { utc_shutdown_time: timeStamp },
      { utc_shutdown_time: timeStampMinusMinute },
      { utc_shutdown_time: timeStampPlusMinute },
    ],
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
      apns: { aps: { alert: { title, body: message } } },
      fcm: { notification: { title, body: message } },
    });
    return beamsClient.publishToUsers(userIDs, publishRequest);
  }
}

function createFileName(routine: string, language: string) {
  return `${routine}-message-${language}.json`;
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
