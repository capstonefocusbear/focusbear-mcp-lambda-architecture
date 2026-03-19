// biome-ignore-all lint/performance/noAwaitInLoops: await in loops is required in this script
// biome-ignore-all lint/suspicious/noConsole: script logging
import 'dotenv/config';
import { In } from 'typeorm';
import { AppDataSource } from '../ormconfig';
import { ActivitySequence } from '../src/modules/activity/entities/activity-sequence.entity';
import { Activity } from '../src/modules/activity/entities/activity.entity';

// Utility script: repopulates encrypted activity_ids arrays by reordering activities
// for a specific user, fixing data imported without the original JSON payloads.
// Run this with npx ts-node -r tsconfig-paths/register --project tsconfig.json apps/api-server/scripts/repopulate.ts

const TARGET_USER = '4f319539-4fc9-4e09-82c2-addf53cfdecc'; // Replace with target user

(async () => {
  await AppDataSource.initialize();
  const sequenceRepo = AppDataSource.getRepository(ActivitySequence);
  const activityRepo = AppDataSource.getRepository(Activity);

  const sequences = await sequenceRepo.find({
    where: { user_id: TARGET_USER, type: In(['morning', 'evening', 'breaking', 'standalone']) },
    select: ['id', 'type'], // keep it light
  });

  for (const sequence of sequences) {
    const activities = await activityRepo.find({
      where: { activity_sequence_id: sequence.id },
      order: { created_at: 'ASC' }, // or whatever ordering you prefer
      select: ['id'],
    });

    const orderedIds = activities.map((activity) => activity.id);
    await sequenceRepo.update(sequence.id, { activity_ids: orderedIds });
    console.log(`Updated ${sequence.type} sequence ${sequence.id} with ${orderedIds.length} ids`);
  }

  await AppDataSource.destroy();
})();
