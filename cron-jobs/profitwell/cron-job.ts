import { DateTime } from 'luxon';
import { IsNull, LessThan } from 'typeorm';
import axios from 'axios';
import { User } from '../../apps/api-server/src/modules/user/entities/user.entity';
import { CronJobDataSource } from '../data-source';
import { wait } from '../../apps/api-server/src/shared/utils/helpers';
import { Entitlement } from '../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { ONE_SECOND_AS_MILLIS, TRIAL_LENGTH_DAYS, TWENTY } from '../../apps/api-server/src/shared/utils/constants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

type TrialData = {
  registration_date: Date;
  stripe_customer_id: string;
};

async function getUsersWhoseTrialsExpired() {
  const currentDate = DateTime.local();
  const sevenDaysAgo = currentDate.minus({ days: 7 }).toJSDate();
  return CronJobDataSource.manager.find(User, {
    take: TWENTY,
    where: [
      { profitwell_registration_date: LessThan(sevenDaysAgo), revenue_cat_status: IsNull() },
      { profitwell_registration_date: LessThan(sevenDaysAgo), revenue_cat_status: Entitlement.trial },
    ],
  });
}

async function handleChurnedTrial(trialData: TrialData, attempts = 0) {
  const churnType = 'delinquent';
  const churnDate = new Date(trialData.registration_date);
  churnDate.setDate(churnDate.getDate() + TRIAL_LENGTH_DAYS);
  const churnTime = Math.floor(churnDate.getTime() / ONE_SECOND_AS_MILLIS);
  const CHURN_URL = `https://api.profitwell.com/v2/subscriptions/${trialData.stripe_customer_id}_pw_subscription/?effective_date=${churnTime}&churn_type=${churnType}`;

  try {
    await axios.delete(CHURN_URL, {
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

async function clearUserProfitWellRegistrationDate(userId: string) {
  return CronJobDataSource.manager.update(User, { id: userId }, { profitwell_registration_date: null });
}

(async () => {
  try {
    await CronJobDataSource.initialize();
    const usersWithExpiredTrials = await getUsersWhoseTrialsExpired();
    for await (const user of usersWithExpiredTrials) {
      if (user.stripe_customer_id) {
        await Promise.all([
          handleChurnedTrial({
            registration_date: user.profitwell_registration_date,
            stripe_customer_id: user.stripe_customer_id,
          }),
          clearUserProfitWellRegistrationDate(user.id),
        ]);
      }
    }

    process.exit();
  } catch (error) {
    console.error(error);
  }
})();
