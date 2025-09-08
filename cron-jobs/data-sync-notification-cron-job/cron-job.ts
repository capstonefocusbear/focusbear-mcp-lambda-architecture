/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { DateTime } from 'luxon';
import * as sendGrid from '@sendgrid/mail';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS } from '../../apps/api-server/src/shared/utils/constants';
import { captureErrorWithContext, withSentry } from '../sentry';
import { ZohoDeskService } from '../../apps/api-server/src/modules/zoho-desk/services/zoho-desk.service';
import { ZohoDeskModule } from '../../apps/api-server/src/modules/zoho-desk/zoho-desk.module';
import { zohoConfig } from '../../apps/api-server/src/config/zoho.config';

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

// Lazy init heavy dependencies to avoid import-time overhead
let i18nInitialized = false;
function ensureI18n() {
  if (i18nInitialized) return;
  try {
    const enTranslations = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../apps/api-server/src/shared/i18n/en/common.json'), 'utf8'),
    );
    const esTranslations = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../apps/api-server/src/shared/i18n/es/common.json'), 'utf8'),
    );
    i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: enTranslations },
        es: { translation: esTranslations },
      },
    });
    i18nInitialized = true;
  } catch (error) {
    captureErrorWithContext(error, { operation: 'ensureI18n', cronJob: 'data-sync-notification' });
  }
}

function ensureSendGrid() {
  try {
    if (process.env.SENDGRID_KEY) sendGrid.setApiKey(process.env.SENDGRID_KEY);
  } catch (error) {
    captureErrorWithContext(error, { operation: 'ensureSendGrid', cronJob: 'data-sync-notification' });
  }
}

export async function getUsersWithOutdatedData() {
  const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();
  const participants = await CronJobDataSource.manager.find(StudyParticipant, {
    where: { usageDataLastReceived: LessThan(threeDaysAgo) },
  });
  return participants.filter((participant) => participant.userId);
}

export async function getUserDetails(
  userId: string,
): Promise<{ email: string | null; os: 'ios' | 'android'; language: string; name?: string; phoneNumber?: string }> {
  try {
    // Find the StudyParticipant by userId to get the name, phone_number, and whatsapp_opt_in
    const participant = await CronJobDataSource.manager.findOne(StudyParticipant, {
      where: { userId },
    });
    const name = participant?.name;
    const phoneNumber = participant?.phoneNumber;
    const os = (participant.metadata?.mobileOS as 'ios' | 'android') || 'ios';

    const user = await CronJobDataSource.manager.findOne(User, {
      where: { id: userId },
    });
    if (!user) return { email: null, os, language: 'en', name, phoneNumber };

    const { data: auth0User } = await auth0.users.get({ id: user.auth0_id });
    return {
      email: auth0User.email,
      language: user.language || 'en',
      os,
      name,
      phoneNumber,
    };
  } catch (error) {
    captureErrorWithContext(error, {
      operation: 'getUserDetails',
      cronJob: 'data-sync-notification',
      userId,
    });
    return { email: null, os: 'ios', language: 'en' };
  }
}

// The following function is intentionally unused in this file but kept for reference and potential future use.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function sendEmail(email: string, language: string) {
  ensureI18n();
  ensureSendGrid();
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
async function sendUnicaesDataSyncEmail(email: string, name?: string, os: 'ios' | 'android' = 'ios') {
  ensureSendGrid();
  const imageUrl = 'https://images.focusbear.io/unicaes-email-header.png';

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
          ${
            os === 'ios'
              ? '<p>📷 ¿Necesitás ayuda? Mira este breve tutorial: <a href="https://youtube.com/shorts/mcKNmPJYC1s?si=tREtRWhEA7SsPPDl">Clic aquí</a></p>'
              : ''
          }
          <p>Sincronizar tus datos cada semana nos ayuda a entender mejor tus avances, adaptar el curso y, lo más importante, ¡celebrar tu compromiso con una vida más enfocada y equilibrada! 🎯🧠</p>
          <p>Gracias por seguir dando lo mejor de ti.<br>
          —Equipo de Investigación Focus Bear + UNICAES</p>
        </div>
      `,
    },
  };

  const langContent = content.es;

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
        os,
      },
    });
  }
}

async function sendUnicaesDataSyncWhatsapp(
  zohoService: ZohoDeskService,
  phoneNumber: string,
  name: string,
  os: 'ios' | 'android',
  participantCode: string,
) {
  try {
    const whatsappMessage = `Hola ${
      name || 'participante'
    }, recuerda sincronizar tus datos de Screen Time esta semana en Focus Bear. 📱✨`;

    const cannedMessageIdIos = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_IOS, 10);
    const cannedMessageIdAndroid = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_ANDROID, 10);

    const cannedMessageId = os === 'ios' ? cannedMessageIdIos : cannedMessageIdAndroid;

    await zohoService.initiateWhatsAppSession(phoneNumber, os, cannedMessageId, whatsappMessage);

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

  // Bootstrap a minimal NestJS application context to access ZohoDeskService only
  @Module({
    imports: [ConfigModule.forRoot({ load: [zohoConfig] }), ZohoDeskModule],
  })
  class CronContextModule {}

  const app = await NestFactory.createApplicationContext(CronContextModule, { logger: false });
  const zohoService = app.get(ZohoDeskService);

  const participants = await getUsersWithOutdatedData();
  console.log(`Found ${participants.length} participants with outdated usage data`);

  for (const participant of participants) {
    const { email, name, os, phoneNumber } = await getUserDetails(participant.userId);

    if (phoneNumber) {
      await sendUnicaesDataSyncWhatsapp(zohoService, phoneNumber, name, os, participant.participantCode);
    }

    // Temporarily disabled: rely on WhatsApp only (issue #1274)
    // if (email) {
    //   await sendUnicaesDataSyncEmail(email, name, os);
    // }
  }

  // Close the NestJS application context
  await app.close();

  console.log('Usage data sync notification cronjob completed successfully');
  process.exit();
}

if (require.main === module) {
  withSentry(runDataSyncCronJob);
}
