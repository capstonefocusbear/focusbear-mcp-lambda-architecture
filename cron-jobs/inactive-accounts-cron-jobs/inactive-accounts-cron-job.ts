/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import * as sendGrid from '@sendgrid/mail';
import axios from 'axios';
import Stripe from 'stripe';
import * as i18next from 'i18next';
import { CronJobDataSource } from '../data-source';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { FOCUS_BEAR_EMAILS, STRIPE_API_VERSION } from '../../apps/api-server/src/shared/utils/constants';

i18next.init({
  lng: 'en',
  debug: true,
  resources: {
    en: {
      translation: {
        inactivity_warning_email_content:
          "Hi there! We've noticed that you haven't used Focus Bear in a while. Please note that your profile will be deleted if use is not resumed within the next 30 days to ensure adherence to privacy laws and minimize the risk of personal data breaches. Log in and resume your healthy habits at https://dashboard.focusbear.io to retain your Focus Bear profile.",
        inactivity_email_subject: 'Inactive Account',
        no_progress_email_subject: 'Need a little nudge?',
        no_progress_email_content:
          "You've signed up but haven't made any progress yet. We believe in you! Start building your streak today at https://dashboard.focusbear.io.",
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
        no_progress_email_subject: '¿Necesitas un pequeño empujón?',
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

// Get users who haven't updated for 5 months
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

// Send emails to inactive users (after 5 months)
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

// Send motivational email if no progress made
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

// Send progress emails (based on user preference: daily or weekly)
async function sendProgressEmails(users: { email: string; user: User }[]) {
  for await (const user of users) {
    if (user.user.email_frequency === 'weekly') {
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

// Update users after sending inactivity warning
async function updateUsersInactivityWarningFields(users: { user: User }[]) {
  const updatedUsers = users.map((userData) => {
    const updatedUser = { ...userData.user };
    updatedUser.has_received_inactivity_warning = true;
    return updatedUser;
  });
  await CronJobDataSource.manager.save(User, updatedUsers);
}

// Log inactive users (for audit/debugging)
function logInactiveUsers(users: { user: User }[]) {
  console.log('Users that have been inactive for 5 months or longer:');
  for (const user of users) {
    console.log({ id: user.user.id, updated_at: user.user.updated_at });
  }
}

// Get users to delete (after 6 months of inactivity)
async function getUsersToDelete() {
  const currentDate = DateTime.now();
  const sixMonthsAgo = currentDate.minus({ months: 6 });
  return CronJobDataSource.manager.find(User, {
    where: { updated_at: LessThan(sixMonthsAgo.toString()), has_received_inactivity_warning: true },
  });
}

// Delete user from RevenueCat
async function deleteUserFromRevenueCat(user_id: string) {
  const callUrl = `https://api.revenuecat.com/v1/subscribers/${user_id}`;
  const Authorization = `Bearer ${process.env.REVENUE_CAT_SECRET_KEY}`;
  const headers = { Authorization, accept: 'application/json', 'Content-Type': 'application/json' };
  await axios.delete(callUrl, { headers });
}

// Delete user from all platforms
async function deleteUsers(users: User[]) {
  for await (const user of users) {
    const auth0Promise = auth0.users.delete({ id: user.auth0_id });
    const revenueCatPromise = deleteUserFromRevenueCat(user.id);
    const stripePromise = stripe.customers.del(user.stripe_customer_id);
    const userRepositoryPromise = CronJobDataSource.manager.delete(User, user.id);
    await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise]);
  }
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    // const usersToDelete = await getUsersToDelete();
    // await deleteUsers(usersToDelete);

    const inactiveUsers = await getInactiveUsers();
    // await sendInactivityWarningEmails(inactiveUsers);
    // await updateUsersInactivityWarningFields(inactiveUsers);
    // await sendProgressEmails(inactiveUsers);
    // await sendNoProgressEmails(inactiveUsers); // If no progress

    logInactiveUsers(inactiveUsers);
    process.exit();
  } catch (error) {
    console.error('Error in inactivity cron job:', error);
  }
})();
