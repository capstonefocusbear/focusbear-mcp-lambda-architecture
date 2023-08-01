import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import * as axios from 'axios';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { CronJobDataSource } from '../data-source';
import { wait } from '../../apps/api-server/src/shared/utils/helpers';

type TrialData = {
  registration_date: Date;
  stripe_customer_id: string;
};

async function getUsersWhosTrialsExpired() {
  const currentDate = DateTime.local();
  const sevenDaysAgo = currentDate.minus({ days: 7 }).toJSDate();
  return CronJobDataSource.manager.find(User, {
    where: { profitwell_registration_date: LessThan(sevenDaysAgo) },
  });
}

async function handleChurnedTrial(trialData: TrialData, attempts = 0) {
  const churnType = 'delinquent';
  const churnDate = new Date(trialData.registration_date);
  churnDate.setDate(churnDate.getDate() + 15);
  const churnTime = Math.floor(churnDate.getTime() / 1000);
  const CHURN_URL = `https://api.profitwell.com/v2/subscriptions/${trialData.stripe_customer_id}_trial/?effective_date=${churnTime}&churn_type=${churnType}`;

  try {
    await axios.default.delete(CHURN_URL, {
      headers: {
        Authorization: process.env.PROFITWELL_API_KEY,
      },
    });
  } catch (e) {
    if (e.response?.status === 404) {
      return;
    }
    if (e.response?.data?.non_field_errors?.[0].includes('already scheduled to churn')) {
      return;
    }
    if (!e.response?.data?.non_field_errors?.[0].includes('already scheduled to churn') && attempts > 3) {
      console.error('uh oh churned trial', CHURN_URL);
      console.error('trialData', trialData);
      console.error('resp', e.response?.data);
      return;
    }

    await wait((attempts + 1) * 15);
    await handleChurnedTrial(trialData);
  }
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const usersWithExpiredTrials = await getUsersWhosTrialsExpired();
    for await (const user of usersWithExpiredTrials) {
      await handleChurnedTrial({
        registration_date: user.profitwell_registration_date,
        stripe_customer_id: user.stripe_customer_id,
      });
    }

    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
