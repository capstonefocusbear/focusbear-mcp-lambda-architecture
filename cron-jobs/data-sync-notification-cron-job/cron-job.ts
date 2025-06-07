/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import * as sendGrid from '@sendgrid/mail';
import { LessThan } from 'typeorm';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { FOCUS_BEAR_EMAILS } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const EMAIL_SUBJECTS = {
  en: 'Usage Data Sync Reminder',
  es: 'Recordatorio de sincronización de datos de uso',
};

const EMAIL_MESSAGES = {
  en: {
    usage:
      "We noticed you haven't synced your usage data in the last 3 days. Please sync your data to continue participating in the study.",
  },
  es: {
    usage:
      'Hemos notado que no ha sincronizado sus datos de uso en los últimos 3 días. Por favor, sincronice sus datos para continuar participando en el estudio.',
  },
};

sendGrid.setApiKey(process.env.SENDGRID_KEY);

async function getUsersWithOutdatedData() {
  const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();
  const participants = await CronJobDataSource.manager.find(StudyParticipant, {
    where: { usageDataLastReceived: LessThan(threeDaysAgo) },
    relations: ['user'],
  });
  return participants.filter((participant) => participant.userId);
}

async function sendEmail(email: string, language: string, message: string) {
  const msg = {
    to: email,
    from: FOCUS_BEAR_EMAILS.SUPPORT,
    subject: EMAIL_SUBJECTS[language],
    text: message,
  };

  try {
    await sendGrid.send(msg);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const participants = await getUsersWithOutdatedData();
    console.log(`Found ${participants.length} participants with outdated usage data`);
    for (const participant of participants) {
      const language = (participant as any).user?.language || 'en';
      const email = (participant as any).user?.email;
      if (email) {
        await sendEmail(email, language, EMAIL_MESSAGES[language].usage);
      }
    }
    console.log('Usage data sync notification cronjob completed successfully');
    process.exit();
  } catch (error) {
    console.error('Error in usage data sync notification cronjob:', error);
    process.exit(1);
  }
})();
