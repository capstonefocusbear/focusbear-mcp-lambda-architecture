/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import * as sendGrid from '@sendgrid/mail';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS } from '../../apps/api-server/src/shared/utils/constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const i18next = require('i18next');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// Initialize Auth0 Management Client
const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
});

// Load translation files
const enTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../apps/api-server/src/shared/i18n/en/common.json'), 'utf8'),
);
const esTranslations = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../apps/api-server/src/shared/i18n/es/common.json'), 'utf8'),
);

// Initialize i18next with translations
i18next.init({
  lng: 'en', // default language
  fallbackLng: 'en',
  resources: {
    en: {
      translation: enTranslations,
    },
    es: {
      translation: esTranslations,
    },
  },
});

sendGrid.setApiKey(process.env.SENDGRID_KEY);

export async function getUsersWithOutdatedData() {
  const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();
  const participants = await CronJobDataSource.manager.find(StudyParticipant, {
    where: { usageDataLastReceived: LessThan(threeDaysAgo) },
  });
  return participants.filter((participant) => participant.userId);
}

async function getUserDetails(userId: string): Promise<{ email: string | null; language: string }> {
  try {
    const user = await CronJobDataSource.manager.findOne(User, {
      where: { id: userId },
    });
    if (!user) return { email: null, language: 'en' };

    const { data: auth0User } = await auth0.users.get({ id: user.auth0_id });
    return {
      email: auth0User.email,
      language: user.language || 'en',
    };
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'getUserDetails',
      cronJob: 'data-sync-notification',
      userId,
    });
    return { email: null, language: 'en' };
  }
}

async function sendEmail(email: string, language: string) {
  const msg = {
    to: email,
    from: FOCUS_BEAR_EMAILS.SUPPORT,
    subject: i18next.t('usage_data_sync_subject', { lng: language }),
    text: i18next.t('usage_data_sync_message', { lng: language }),
  };

  try {
    await sendGrid.send(msg);
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'sendEmail',
      cronJob: 'data-sync-notification',
      extra: {
        email,
        language,
      },
    });
  }
}

export async function runDataSyncCronJob() {
  await CronJobDataSource.initialize();
  const participants = await getUsersWithOutdatedData();
  console.log(`Found ${participants.length} participants with outdated usage data`);
  for (const participant of participants) {
    const { email, language } = await getUserDetails(participant.userId);
    if (email) {
      await sendEmail(email, language);
    }
  }
  console.log('Usage data sync notification cronjob completed successfully');
  process.exit();
}

if (require.main === module) {
  withSentry(() => withTimeout(runDataSyncCronJob(), CRON_JOB_TIMEOUT_MS));
}
