/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { ManagementClient } from 'auth0';
import * as sendGrid from '@sendgrid/mail';
import * as axios from 'axios';
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
          "Hi there! We've noticed that you haven't used Focus Bear in a while. Please note that your profile will be deleted if use is not resumed within the next 30 days to ensure adherence to privacy laws and minimize the risk of personal data breaches.Log in and resume your healthy habits at https://dashboard.focusbear.io to retain your Focus Bear profile.",
        inactivity_email_subject: 'Inactive Account',
      },
    },
    es: {
      translation: {
        inactivity_warning_email_content:
          '¡Hola! Hemos notado que hace tiempo que no utilizas Focus Bear. Por favor, ten en cuenta que tu perfil será eliminado si no se reanuda su uso en los próximos 30 días para garantizar el cumplimiento de las leyes de privacidad y minimizar el riesgo de vulneración de datos personales. Inicia sesión y reanuda tus hábitos saludables en https://dashboard.focusbear.io para conservar tu perfil de Focus Bear.',
        inactivity_email_subject: 'Cuenta inactiva',
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
      const auth0User = await auth0.getUser({ id: user.auth0_id });
      return { email: auth0User.email, user };
    } catch (error) {
      return null;
    }
  });
  const userInfo = await Promise.all(userInfoPromise);
  return userInfo.filter((user) => user.email);
}

async function sendInactivityWarningEmails(users: { email: string; user: User }[]) {
  for await (const user of users) {
    i18next.changeLanguage(user.user.language);
    const message = {
      to: user.email,
      from: FOCUS_BEAR_EMAILS.TEAM,
      subject: i18next.t('inactivity_email_subject'),
      text: i18next.t('inactivity_warning_email_content'),
    };
    await sendGrid.send(message);
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
  await axios.default.delete(callUrl, { headers });
}

async function deleteUsers(users: User[]) {
  for await (const user of users) {
    const auth0Promise = auth0.deleteUser({ id: user.auth0_id });
    const revenueCatPromise = deleteUserFromRevenueCat(user.id);
    const stripePromise = stripe.customers.del(user.stripe_customer_id);
    const userRepositoryPromise = CronJobDataSource.manager.delete(User, user.id);
    await Promise.all([auth0Promise, revenueCatPromise, stripePromise, userRepositoryPromise]);
  }
}

(async () => {
  try {
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
  } catch (error) {
    console.error('Error in inactivity cron job:', error);
  }
})();
