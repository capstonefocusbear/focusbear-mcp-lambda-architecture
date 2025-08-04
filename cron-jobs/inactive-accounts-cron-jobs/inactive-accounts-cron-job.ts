/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { DateTime } from 'luxon';
import { LessThan, MoreThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import * as sendGrid from '@sendgrid/mail';
import axios from 'axios';
import Stripe from 'stripe';
import * as i18next from 'i18next';
import { CronJobDataSource } from '../data-source';
import { User, EmailFrequency } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS, STRIPE_API_VERSION } from '../../apps/api-server/src/shared/utils/constants';
import { withSentry, captureErrorWithContext } from '../sentry';
import { withTimeout } from '../../apps/api-server/src/shared/utils/helpers';
import { CRON_JOB_TIMEOUT_MS } from '../../apps/api-server/src/shared/utils/constants';

i18next.init({
  lng: 'en',
  debug: true,
  resources: {
    en: {
      translation: {
        inactivity_warning_email_content:
          'We’ve missed you at Focus Bear! It looks like you haven’t logged in for a while. Just a heads-up to stay aligned with privacy laws and keep your data safe, we’ll need to delete inactive profiles after 30 days of no activity. We’d love to have you back, simply log in at https://dashboard.focusbear.io to keep your account active and pick up where you left off on your healthy habits!',
        inactivity_email_subject: 'Inactive Account',
        no_progress_email_subject: 'Focus Bear is raring to go! Just need you to do one thing',
        no_progress_email_content: `If you’re feeling stuck, we’re here to help. Whether it’s setting up your first habit or figuring out how to block distractions, you’ve got this — and we’ve got your back.<br/><br/>
  You can get the app from <a href="https://focusbear.io">focusbear.io</a>. If you need help, reply back to this email :)`,

        progress_email_subject: 'Your Weekly Progress Report 🐻',
        progress_email_content:
          'Hey there! Here’s a quick look at how you’ve been doing this week. Keep up the great work! Want to change how often you get these emails? You can manage your preferences here: https://dashboard.focusbear.io/preferences',
      },
    },
    es: {
      translation: {
        inactivity_warning_email_content:
          '¡Hola! Hemos notado que hace tiempo que no utilizas Focus Bear. Por favor, ten en cuenta que tu perfil será eliminado si no se reanuda su uso en los próximos 30 días para garantizar el cumplimiento de las leyes de privacidad y minimizar el riesgo de vulneración de datos personales. Inicia sesión y reanuda tus hábitos saludables en https://dashboard.focusbear.io para conservar tu perfil de Focus Bear.',
        inactivity_email_subject: 'Cuenta inactiva',
        no_progress_email_subject: '¿Te sientes atascado? ¡Estamos aquí para ayudarte!',
        no_progress_email_content:
          'Te has registrado, pero aún no has comenzado. ¡Creemos en ti! Comienza hoy en https://dashboard.focusbear.io.',
        progress_email_subject: 'Tu informe semanal de progreso 🐻',
        progress_email_content:
          '¡Hola! Aquí tienes un resumen de tu progreso esta semana. ¡Sigue así! ¿Quieres cambiar la frecuencia de estos correos? Gestiona tus preferencias aquí: https://dashboard.focusbear.io/preferences',
      },
    },
  },
});

sendGrid.setApiKey(process.env.SENDGRID_KEY);

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });

async function getInactiveUsers() {
  const currentDate = DateTime.now();
  const fiveMonthsAgo = currentDate.minus({ months: 5 });
  const inactiveUsers = await CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(fiveMonthsAgo.toString()) },
  });
  console.log(inactiveUsers);
  const userInfoPromise = inactiveUsers.map(async (user) => {
    try {
      const auth0User = (await auth0.users.get({ id: user.auth0_id })) as { email?: string };
      return { email: auth0User.email || null, user };
    } catch (error) {
      return null;
    }
  });
  const userInfo = await Promise.all(userInfoPromise);
  return userInfo.filter((user) => user.email);
}

async function getActiveUsers() {
  const currentDate = DateTime.now();
  const sevenDaysAgo = currentDate.minus({ days: 7 });
  const activeUsers = await CronJobDataSource.manager.find(User, {
    where: { updated_at: MoreThan(sevenDaysAgo.toString()) },
  });
  console.log(activeUsers);
  const userInfoPromise = activeUsers.map(async (user) => {
    try {
      const auth0User = (await auth0.users.get({ id: user.auth0_id })) as { email?: string };
      return { email: auth0User.email || null, user };
    } catch (error) {
      captureErrorWithContext(error, {
        operation: 'getInactiveUsers.getUserEmail',
        cronJob: 'inactive-accounts',
        userId: user.id,
        extra: {
          auth0Id: user.auth0_id,
        },
      });
      return null;
    }
  });
  const userInfo = await Promise.all(userInfoPromise);
  return userInfo.filter((user) => user.email);
}

async function sendInactivityWarningEmails(users: { email: string; user: User }[]) {
  for await (const user of users) {
    const t = i18next.getFixedT(user.user.language);
    const message = {
      to: user.email,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      subject: t('inactivity_email_subject'),
      text: t('inactivity_warning_email_content'),
    };
    await sendGrid.send(message);
  }
}

async function sendNoProgressEmails(users: { email: string; user: User }[]) {
  for await (const user of users) {
    const t = i18next.getFixedT(user.user.language);
    const message = {
      to: user.email,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      subject: t('no_progress_email_subject'),
      text: t('no_progress_email_content'),
    };
    await sendGrid.send(message);
  }
}

// Sends localized progress emails to users who haven't unsubscribed
async function sendProgressEmails(users: { email: string; user: User }[]) {
  for await (const user of users) {
    if (user.user.email_frequency === EmailFrequency.WEEKLY) {
      // Translate email content based on user's preferred language
      const t = i18next.getFixedT(user.user.language);

      const message = {
        to: user.email,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        subject: t('progress_email_subject'),
        text: t('progress_email_content'),
      };

      await sendGrid.send(message);
    }
  }
}

async function updateUsersInactivityWarningFields(users: { user: User }[]) {
  const updatedUsers = users.map((userData) => {
    const updatedUser = { ...userData.user };
    updatedUser.has_received_inactivity_warning = true;
    return updatedUser;
  });
  await CronJobDataSource.manager.save(User, updatedUsers);
}

function logInactiveUsers(users: { user: User }[]) {
  console.log('Users that have been inactive for 5 months or longer:');
  for (const user of users) {
    console.log({ id: user.user.id, updated_at: user.user.updated_at });
  }
}

async function getUsersToDelete() {
  const currentDate = DateTime.now();
  const sixMonthsAgo = currentDate.minus({ months: 6 });
  return CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(sixMonthsAgo.toString()), has_received_inactivity_warning: true },
  });
}

async function deleteUserFromRevenueCat(user_id: string) {
  const callUrl = `https://api.revenuecat.com/v1/subscribers/${user_id}`;
  const Authorization = `Bearer ${process.env.REVENUE_CAT_SECRET_KEY}`;
  const headers = { Authorization, accept: 'application/json', 'Content-Type': 'application/json' };
  await axios.delete(callUrl, { headers });
}

async function deleteUsers(users: User[]) {
  for await (const user of users) {
    const auth0Promise = auth0.users.delete({ id: user.auth0_id });
    const revenueCatPromise = deleteUserFromRevenueCat(user.id);
    const stripePromise = stripe.customers.del(user.stripe_customer_id);
    const userRepositoryPromise = CronJobDataSource.manager.delete(User, user.id);
    await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise]);
  }
}

async function getInternalTestUsers() {
  const currentDate = DateTime.now();
  const sixMonthsAgo = currentDate.minus({ months: 6 });
  const inactiveUsers = await CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(sixMonthsAgo.toString()) },
  });

  if (inactiveUsers.length === 0) {
    return [];
  }

  // Construct a query to fetch all users by their Auth0 IDs
  const userIds = inactiveUsers.map((user) => user.auth0_id);
  const query = `user_id:(${userIds.join(' OR ')})`;

  try {
    // Fetch all Auth0 users at once
    const auth0Users = await auth0.users.getAll({ q: query, search_engine: 'v3' });

    // Create a map for quick lookups
    const auth0UsersMap = new Map(auth0Users.data.map((u) => [u.user_id, u]));

    const internalTestUsers = [];
    for (const user of inactiveUsers) {
      const auth0User = auth0UsersMap.get(user.auth0_id);
      if (auth0User?.email && auth0User.email.match(/^internaltest\+.*@focusbear\.io$/)) {
        internalTestUsers.push({ email: auth0User.email, user });
      }
    }
    return internalTestUsers;
  } catch (error) {
    console.error('Error fetching bulk Auth0 users:', error);
    return [];
  }
}

async function deleteInternalTestUsers() {
  try {
    console.log('Starting internal test user cleanup...');

    const internalTestUsers = await getInternalTestUsers();

    if (internalTestUsers.length === 0) {
      console.log('No internal test users found.');
      return;
    }

    // Log users that will be deleted for safety
    console.log(`Found ${internalTestUsers.length} internal test users to delete:`);
    for (const testUser of internalTestUsers) {
      console.log(`- User ID: ${testUser.user.id}, Email: ${testUser.email}`);
    }

    // Extract just the User objects for deletion
    const usersToDelete = internalTestUsers.map((userData) => userData.user);

    console.log('Deleting internal test users...');
    await deleteUsers(usersToDelete);

    console.log('Internal test users deleted successfully.');
  } catch (error) {
    console.error('Error deleting internal test users:', error);
    throw error;
  }
}

async function runInactiveAccountsCronJob() {
  await CronJobDataSource.initialize();
  // delete users who have been inactive for 6 months or longer and have been warned for inactivity
  // const usersToDelete = await getUsersToDelete();
  // await deleteUsers(usersToDelete);
  // email a notification to users who have been inactive for 5 months warning them that their account will
  // be deleted
  const inactiveUsers = await getInactiveUsers();
  // await sendInactivityWarningEmails(inactiveUsers);
  // temporarily not emailing users or updating has_received_inactivity_warning field
  // await updateUsersInactivityWarningFields(inactiveUsers);
  logInactiveUsers(inactiveUsers);
  process.exit();
}

if (require.main === module) {
  withSentry(() => withTimeout(runInactiveAccountsCronJob(), CRON_JOB_TIMEOUT_MS));
}
