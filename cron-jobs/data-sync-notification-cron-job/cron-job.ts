/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import * as sendGrid from '@sendgrid/mail';
import { ManagementClient } from 'auth0';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as i18next from 'i18next';
import * as fs from 'fs';
import * as path from 'path';
import { CronJobDataSource } from '../data-source';
import { StudyParticipant } from '../../apps/api-server/src/modules/user/entities/study-participant.entity';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS } from '../../apps/api-server/src/shared/utils/constants';
import { captureErrorWithContext, withSentry } from '../sentry';
import { ZohoDeskService } from '../../apps/api-server/src/modules/zoho-desk/services/zoho-desk.service';
import { ZohoDeskModule } from '../../apps/api-server/src/modules/zoho-desk/zoho-desk.module';
import { zohoConfig } from '../../apps/api-server/src/config/zoho.config';

dotenv.config();

// --- Env validation helpers ---
function assertEnv(name: string) {
  if (!process.env[name] || String(process.env[name]).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateEnvForJob() {
  const required = [
    'POSTGRES_HOST',
    'POSTGRES_USERNAME',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'AUTH0_DOMAIN',
    'AUTH0_MANAGEMENT_CLIENT_ID',
    'AUTH0_MANAGEMENT_CLIENT_SECRET',
    'ZOHO_CANNED_MESSAGE_ID_IOS',
    'ZOHO_CANNED_MESSAGE_ID_ANDROID',
  ];
  required.forEach(assertEnv);
}

// --- Lazy Auth0 client init ---
let _auth0: ManagementClient | null = null;
function getAuth0(): ManagementClient {
  if (!_auth0) {
    _auth0 = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN!,
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
    });
  }
  return _auth0;
}

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

type ReservedParticipant = Pick<StudyParticipant, 'id' | 'participantCode' | 'userId'>;

// Reserve up to `limit` eligible participants for this run and return them.
// Uses SKIP LOCKED to avoid contention with overlapping runs.
export async function reserveParticipantsForDataSync(limit = 50): Promise<ReservedParticipant[]> {
  const rows = (await CronJobDataSource.manager.query(
    `
      WITH elig AS (
        SELECT id
        FROM study_participants
        WHERE
          opted_out = false
          AND user_id IS NOT NULL
          AND usage_data_last_received < (CURRENT_DATE - 7)
          AND last_data_sync_notified_at IS NULL
          AND (reserved_at IS NULL OR reserved_at < NOW() - INTERVAL '1 hour')
        ORDER BY usage_data_last_received ASC NULLS FIRST
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      )
      UPDATE study_participants sp
      SET reserved_at = NOW()
      FROM elig
      WHERE sp.id = elig.id
      RETURNING sp.id, sp.participant_code, sp.user_id;
    `,
    [limit],
  )) as Array<{ id: string; participant_code: string; user_id: string }>;

  return rows.map((r) => ({ id: r.id, participantCode: r.participant_code, userId: r.user_id }));
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

    const { data: auth0User } = await getAuth0().users.get({ id: user.auth0_id });
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
    // Preserve best-known context on failure
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
  language: string,
) {
  const whatsappMessage = `Hola ${
    name || 'participante'
  }, recuerda sincronizar tus datos de Screen Time esta semana en Focus Bear. Tu código de participante es: ${participantCode}. 📱✨`;

  const cannedMessageIdIos = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_IOS!, 10);
  const cannedMessageIdAndroid = parseInt(process.env.ZOHO_CANNED_MESSAGE_ID_ANDROID!, 10);
  const cannedMessageId = os === 'ios' ? cannedMessageIdIos : cannedMessageIdAndroid;

  if (!Number.isFinite(cannedMessageId)) {
    throw new Error(
      `Missing canned message id for ${os}. Set ZOHO_CANNED_MESSAGE_ID_${os.toUpperCase()} in environment.`,
    );
  }

  // Simple retry with exponential backoff for rate limiting
  const maxRetries = 3;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await zohoService.initiateWhatsAppSession(phoneNumber, language, cannedMessageId, whatsappMessage);
      // Avoid logging PII to stdout
      console.log('WhatsApp notification sent');
      return;
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      attempt += 1;
      const shouldRetry = attempt <= maxRetries && (status === 429 || (status >= 500 && status < 600));
      captureErrorWithContext(error, {
        operation: 'sendWhatsAppNotification',
        cronJob: 'data-sync-notification',
        extra: { status, attempt },
      });
      if (!shouldRetry) throw error;
      const backoffMs = 500 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

export async function processInBatches<T>(args: {
  items: T[];
  batchSize: number;
  cooldownMs: number;
  processItem: (item: T) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
}) {
  const { items, batchSize, cooldownMs, processItem } = args;
  const sleep = args.sleep || ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  if (!Array.isArray(items) || items.length === 0) return;
  const effectiveBatch = Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 50;
  const effectiveCooldown = Number.isFinite(cooldownMs) && cooldownMs >= 0 ? cooldownMs : 60_000;

  for (let start = 0; start < items.length; start += effectiveBatch) {
    const batch = items.slice(start, start + effectiveBatch);
    // sequential processing within batch
    // eslint-disable-next-line no-restricted-syntax
    for (const item of batch) {
      // eslint-disable-next-line no-await-in-loop
      await processItem(item);
    }
    const hasMore = start + effectiveBatch < items.length;
    if (hasMore && effectiveCooldown > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(effectiveCooldown);
    }
  }
}

export async function runDataSyncCronJob() {
  validateEnvForJob();

  if (!CronJobDataSource.isInitialized) {
    await CronJobDataSource.initialize();
  }

  // Bootstrap a minimal NestJS application context to access ZohoDeskService only
  @Module({
    imports: [ConfigModule.forRoot({ load: [zohoConfig] }), ZohoDeskModule],
  })
  class CronContextModule {}

  let app: any;
  try {
    app = await NestFactory.createApplicationContext(CronContextModule, { logger: false });
    const zohoService = app.get(ZohoDeskService);

    const reserved = await reserveParticipantsForDataSync(50);
    console.log(`Reserved ${reserved.length} participants for data-sync notifications`);

    // Process notifications in manageable batches with a cooldown to respect provider rate limits
    await processInBatches({
      items: reserved,
      batchSize: 30,
      cooldownMs: 60_000,
      processItem: async (participant) => {
        const { email, name, os, phoneNumber, language } = await getUserDetails(participant.userId);
        if (phoneNumber) {
          await sendUnicaesDataSyncWhatsapp(zohoService, phoneNumber, name, os, participant.participantCode, language);

          await CronJobDataSource.manager.query(
            `UPDATE study_participants SET last_data_sync_notified_at = NOW(), reserved_at = NULL WHERE id = $1`,
            [participant.id],
          );
        } else {
          await CronJobDataSource.manager.query(`UPDATE study_participants SET reserved_at = NULL WHERE id = $1`, [
            participant.id,
          ]);
          console.log('Skipping participant with no phone number; reservation cleared');
        }

        // Email path remains disabled
        // if (email) { await sendUnicaesDataSyncEmail(email, name, os); }
      },
    });

    console.log('Usage data sync notification cronjob completed successfully');
  } finally {
    try {
      if (app) await app.close();
    } catch (_) {}
    try {
      if (CronJobDataSource.isInitialized) await CronJobDataSource.destroy();
    } catch (_) {}
  }
}

if (require.main === module) {
  withSentry(runDataSyncCronJob);
}
