/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import * as sendGrid from '@sendgrid/mail';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import { NestFactory } from '@nestjs/core';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS } from '../../apps/api-server/src/shared/utils/constants';
import { captureErrorWithContext, withSentry } from '../sentry';
import { AppModule } from '../../apps/api-server/src/app.module';
import { ZohoService } from '../../apps/api-server/src/modules/zoho/services/zoho.service';

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

export async function getUserDetails(
  userId: string,
): Promise<{ email: string | null; language: string; name?: string; phoneNumber?: string }> {
  try {
    // Find the StudyParticipant by userId to get the name, phone_number, and whatsapp_opt_in
    const participant = await CronJobDataSource.manager.findOne(StudyParticipant, {
      where: { userId },
    });
    const name = participant?.name;
    const phoneNumber = participant?.phoneNumber;

    const user = await CronJobDataSource.manager.findOne(User, {
      where: { id: userId },
    });
    if (!user) return { email: null, language: 'en', name, phoneNumber };

    const { data: auth0User } = await auth0.users.get({ id: user.auth0_id });
    return {
      email: auth0User.email,
      language: user.language || 'en',
      name,
      phoneNumber,
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

// The following function is intentionally unused in this file but kept for reference and potential future use.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Move the UNICAES-specific logic to a new function
async function sendUnicaesDataSyncEmail(email: string, name?: string, language: 'en' | 'es' = 'es') {
  const imageUrl = 'https://i.ibb.co/S4jnpt3m/unicaes-email-header.jpg';

  const content = {
    es: {
      subject: '¡No olvides sincronizar tus datos esta semana! 🐻⏳',
      html: `
        <div>
          <img src="${imageUrl}" alt="Header" style="width:100%;max-width:600px;margin-bottom:24px;" />
          <p>${name ? `Hola <b>${name}</b>,` : 'Hola,'}</p>
          <p>¡Tu progreso importa! 🌟<br>
          Recuerda subir <b>captura de pantalla de tu Screen Time de esta semana</b> a Focus Bear como parte de tu participación en el curso.</p>
          <p>👉 <b>Haz clic aquí para subirla fácilmente: settings &gt; UNICAES study</b></p>
          <p>📷 ¿Necesitás ayuda? Mira este breve tutorial: <a href="https://www.youtube.com/shorts/qLH5htwin8o?feature=share">Clic aquí</a></p>
          <p>Sincronizar tus datos cada semana nos ayuda a entender mejor tus avances, adaptar el curso y, lo más importante, ¡celebrar tu compromiso con una vida más enfocada y equilibrada! 🎯🧠</p>
          <p>Gracias por seguir dando lo mejor de ti.<br>
          —Equipo de Investigación Focus Bear + UNICAES</p>
        </div>
      `,
    },
    en: {
      subject: "Don't forget to sync your data this week! 🐻⏳",
      html: `
        <div>
          <img src="${imageUrl}" alt="Header" style="width:100%;max-width:600px;margin-bottom:24px;" />
          <p>${name ? `Hi <b>${name}</b>,` : 'Hi,'}</p>
          <p>Your progress matters! 🌟<br>
          Remember to upload a <b>screenshot of your Screen Time for this week</b> to Focus Bear as part of your course participation.</p>
          <p>👉 <b>Click here to upload it easily: settings &gt; UNICAES study</b></p>
          <p>📷 Need help? Watch this short tutorial: <a href="https://www.youtube.com/shorts/qLH5htwin8o?feature=share">Click here</a></p>
          <p>Syncing your data each week helps us better understand your progress, adapt the course, and most importantly, celebrate your commitment to a more focused and balanced life! 🎯🧠</p>
          <p>Thank you for continuing to give your best.<br>
          —Focus Bear + UNICAES Research Team</p>
        </div>
      `,
    },
  };

  const langContent = content[language] || content.es;

  const msg = {
    to: email,
    from: FOCUS_BEAR_EMAILS.SUPPORT,
    subject: langContent.subject,
    html: langContent.html,
  };

  try {
    await sendGrid.send(msg);
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'sendUnicaesDataSyncEmail',
      cronJob: 'data-sync-notification',
      extra: {
        email,
        name,
        language,
      },
    });
  }
}

async function sendUnicaesDataSyncWhatsapp(
  zohoService: ZohoService,
  phoneNumber: string,
  name: string,
  language: 'en' | 'es',
  participantCode: string,
) {
  try {
    const whatsappMessage =
      language === 'es'
        ? `Hola ${
            name || 'participante'
          }, recuerda sincronizar tus datos de Screen Time esta semana en Focus Bear. 📱✨`
        : `Hi ${name || 'participant'}, remember to sync your Screen Time data this week in Focus Bear. 📱✨`;

    const cannedMessageIdEn = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_EN, 10);
    const cannedMessageIdEs = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_ES, 10);

    const cannedMessageId = language === 'es' ? cannedMessageIdEs : cannedMessageIdEn;

    await zohoService.initiateWhatsAppSession(phoneNumber, language, cannedMessageId, whatsappMessage);

    console.log(`WhatsApp notification sent to participant ${participantCode}`);
  } catch (error) {
    // Log error but don't prevent email from being sent
    console.error(`Failed to send WhatsApp notification to participant ${participantCode}:`, error);
    captureErrorWithContext(error, {
      operation: 'sendWhatsAppNotification',
      cronJob: 'data-sync-notification',
      extra: {
        participantCode,
      },
    });
  }
}

export async function runDataSyncCronJob() {
  await CronJobDataSource.initialize();

  // Bootstrap NestJS application context to access ZohoService
  const app = await NestFactory.createApplicationContext(AppModule);
  const zohoService = app.get(ZohoService);

  const participants = await getUsersWithOutdatedData();
  console.log(`Found ${participants.length} participants with outdated usage data`);

  for (const participant of participants) {
    const { email, name, language, phoneNumber } = await getUserDetails(participant.userId);

    if (phoneNumber) {
      await sendUnicaesDataSyncWhatsapp(
        zohoService,
        phoneNumber,
        name,
        language as 'en' | 'es',
        participant.participantCode,
      );
    }

    if (email) {
      await sendUnicaesDataSyncEmail(email, name, language as 'en' | 'es');
    }
  }

  // Close the NestJS application context
  await app.close();

  console.log('Usage data sync notification cronjob completed successfully');
  process.exit();
}

if (require.main === module) {
  withSentry(runDataSyncCronJob);
}
