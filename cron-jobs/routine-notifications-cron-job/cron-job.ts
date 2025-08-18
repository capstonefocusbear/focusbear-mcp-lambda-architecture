/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import PushNotifications = require('@pusher/push-notifications-server');
import OpenAI from 'openai';
import { MoreThanOrEqual } from 'typeorm';
// eslint-disable-next-line import/extensions
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { GPT_4_1_MINI } from '../../apps/api-server/src/shared/utils/constants';
import { BeamsPublishRequest } from '../../libs/pusher-beams/src/domains/pusher-beams-publish-request.model';
import { CronJobDataSource } from '../data-source';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { ActivityType } from '../../apps/api-server/src/modules/activity/domain/activity-type.enum';
import { openAiConfig } from '../../apps/api-server/src/config';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const OPEN_AI_CONFIG = openAiConfig();

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

// Available tones for routine notifications (subset of AiToneOptions for notifications)
const NOTIFICATION_TONES = [
  'humorous',
  'cheerleader',
  'upbeat',
  'sassy',
  'scientist',
  'pirate',
];

// Function to get a random tone
function getRandomTone(): string {
  return NOTIFICATION_TONES[Math.floor(Math.random() * NOTIFICATION_TONES.length)];
}

const beamsClient = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID,
  secretKey: process.env.PUSHER_BEAMS_PRIMARY_KEY,
});

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
interface TranslationDataType {
  [key: string]: { morning: { title: string; message: string }; evening: { title: string; message: string } };
}

const openAiAPI = new OpenAI({ apiKey: OPEN_AI_CONFIG.pushNotification.apiKey });

// getPrompt function includes a default tone "humorous" if no tone is provided
function getPrompt(routine: string, language: string, tone: string = 'humorous') {
  return `In ${LANGUAGES_MAP[language]}, create a push notification text in a ${tone} and motivational tone, telling the user it's time to start their ${routine} routine they've set up to help with their productivity and habit formation. Return only the message and no new lines. Message: `;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function getMessageFromR2(fileName: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: 'routine-notifications',
      Key: fileName,
    });

    const response = await s3Client.send(command);
    const bodyString = await streamToString(response.Body as NodeJS.ReadableStream);
    const parsedMessage = JSON.parse(bodyString);
    return parsedMessage || null;
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'getMessageFromR2',
      cronJob: 'routine-notifications',
      extra: {
        fileName,
        bucket: 'routine-notifications',
      },
    });
    return null;
  }
}

function removeQuotes(input: string): string {
  // Use a regular expression to match double quotes at the start and end of the string
  const regex = /^"|"$/g;

  // Use the replace method to remove the matched double quotes
  const result = input.replace(regex, '');

  return result;
}

async function addMessageToR2(filename: string, messageData: { message: string; timestamp: string }) {
  const buf = Buffer.from(JSON.stringify(messageData));

  const command = new PutObjectCommand({
    Bucket: 'routine-notifications',
    Key: filename,
    Body: buf,
    ContentEncoding: 'base64',
    ContentType: 'application/json',
    ContentDisposition: 'attachment',
  });

  await s3Client.send(command);
}

async function generateRoutineNotification(routine: string, fileName: string, language: string) {
  const maxRetries = 1; //reduce the number of retries to total of 2 to prevent maxing open ai limit as the cron job is run every minute
  const TEN_SECONDS = 10000;
  const randomTone = getRandomTone(); // Get a random tone for this notification
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await openAiAPI.chat.completions.create({
        model: GPT_4_1_MINI,
        messages: [{ role: 'system', content: getPrompt(routine, language, randomTone) }],
        temperature: 1,
        max_tokens: 100,
        n: 1,
      });
      const message = response.choices[0].message.content.trim();
      const messageWithoutQuotes = removeQuotes(message);
      const messageObj = {
        message: messageWithoutQuotes,
        timestamp: DateTime.utc().toISO(),
      };
      await addMessageToR2(fileName, messageObj);
      // Exit the loop if request is successful
      return messageWithoutQuotes;
    } catch (error) {
      // If we have not reached max retries, wait for ten seconds and retry.
      if (i < maxRetries) {
        console.error(
          `Attempt ${i + 1} of ${maxRetries + 1} failed. Error generating message in notification cron job: `,
          error,
        );
        await sleep(TEN_SECONDS);
      } else {
        captureErrorWithContext(error, {
          operation: 'generateRoutineNotification',
          cronJob: 'routine-notifications',
          extra: {
            routine,
            fileName,
            language,
            attempts: maxRetries + 1,
          },
        });
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

async function getUsersForStartup(language: string) {
  const currentTime = DateTime.local();
  const oneMinuteAfterNow = currentTime.plus({ minute: 1 });
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampPlusMinute = oneMinuteAfterNow.toFormat('HH:mm');
  const timeStrings: string[] = [];
  for (let i = 0; i <= 30; i++) {
    timeStrings.push(currentTime.minus({ minutes: i }).toFormat('HH:mm'));
  }
  const thirtyDaysBeforeNow = currentTime.minus({ days: 30 });
  const updated_at = MoreThanOrEqual(thirtyDaysBeforeNow.toISO());
  const users = await CronJobDataSource.manager.find(User, {
    where: [
      { utc_startup_time: timeStamp, language, updated_at },
      { utc_startup_time: timeStampPlusMinute, language, updated_at },
      ...timeStrings.map((ts) => ({ utc_startup_time: ts, language, updated_at })),
    ],
    select: ['id', 'language', 'routine_notification_times'],
  });
  console.log({ USERS_FETCHED_FOR_STARTUP: users.length });
  const usersToReceiveNotification = users.filter((user) => {
    const lastMorningRoutineNotification = DateTime.fromJSDate(
      new Date(user.routine_notification_times.last_time_notified_of_morning_routine),
    );
    const hasReceivedNotificationToday = lastMorningRoutineNotification.hasSame(currentTime, 'day');
    return !hasReceivedNotificationToday;
  });
  const usersMatchingMorningTimestamp = users.map((user) => user.id);
  const usersThatDidNotReceiveMorningNotificationToday = usersToReceiveNotification.map((user) => user.id);
  console.log({ usersMatchingMorningTimestamp, usersThatDidNotReceiveMorningNotificationToday });
  return usersToReceiveNotification;
}

async function getUsersForShutdown(language: string) {
  const currentTime = DateTime.local();
  const oneMinuteAfterNow = currentTime.plus({ minute: 1 });
  const timeStamp = currentTime.toFormat('HH:mm');
  const timeStampPlusMinute = oneMinuteAfterNow.toFormat('HH:mm');
  const timeStrings: string[] = [];
  for (let i = 0; i <= 30; i++) {
    timeStrings.push(currentTime.minus({ minutes: i }).toFormat('HH:mm'));
  }
  const thirtyDaysBeforeNow = currentTime.minus({ days: 30 });
  const updated_at = MoreThanOrEqual(thirtyDaysBeforeNow.toISO());
  const users = await CronJobDataSource.manager.find(User, {
    where: [
      { utc_shutdown_time: timeStamp, language, updated_at },
      { utc_shutdown_time: timeStampPlusMinute, language, updated_at },
      ...timeStrings.map((ts) => ({ utc_shutdown_time: ts, language, updated_at })),
    ],
    select: ['id', 'language', 'routine_notification_times'],
  });
  console.log({ USERS_FETCHED_FOR_SHUTDOWN: users.length });

  const usersToReceiveNotification = users.filter((user) => {
    const lastEveningRoutineNotification = DateTime.fromJSDate(
      new Date(user.routine_notification_times.last_time_notified_of_evening_routine),
    );
    const hasReceivedNotificationToday = lastEveningRoutineNotification.hasSame(currentTime, 'day');
    return !hasReceivedNotificationToday;
  });
  const usersMatchingEveningTimestamp = users.map((user) => user.id);
  const usersThatDidNotReceiveEveningNotificationToday = usersToReceiveNotification.map((user) => user.id);
  console.log({ usersMatchingEveningTimestamp, usersThatDidNotReceiveEveningNotificationToday });
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

async function publishToUsersByLanguage(
  users: User[],
  language: string,
  routine: string,
  translationData: TranslationDataType,
) {
  const userIDs = users.map((user) => user.id);
  if (userIDs.length === 0) return;

  const { title, message } = translationData[language][routine];
  const publishRequest = new BeamsPublishRequest({
    apns: { aps: { alert: { title, body: message } } },
    fcm: { notification: { title, body: message } },
  });
  console.log('USER-IDS:', userIDs, 'LANGUAGE:', language);
  const chunkSize = 500;
  for (let i = 0; i < userIDs.length; i += chunkSize) {
    await beamsClient.publishToUsers(userIDs.slice(i, i + chunkSize), publishRequest);
  }
}

function createFileName(routine: string, language: string) {
  return `${routine}-message-${language}.json`;
}

async function runRoutineNotificationsCronJob() {
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
    const startupUsers = await getUsersForStartup(language);
    const shutdownUsers = await getUsersForShutdown(language);

    await publishToUsersByLanguage(startupUsers, language, ActivityType.morning, translationData);
    await publishToUsersByLanguage(shutdownUsers, language, ActivityType.evening, translationData);

    await Promise.all([
      updateUsersMorningRoutineNotification(startupUsers),
      updateUsersEveningRoutineNotification(shutdownUsers),
    ]);
  }
  process.exit();
}

if (require.main === module) {
  withSentry(() => withTimeout(runRoutineNotificationsCronJob(), CRON_JOB_TIMEOUT_MS));
}
