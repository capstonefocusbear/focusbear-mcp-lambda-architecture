import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { ToDo } from '../modules/to-do/entities/to-do.entity';
import { TEST_USER_ID } from './seeding-constant';
import { ONE_DAY_MILLISECONDS } from '../shared/utils/constants';

export class ToDoSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    const toDoFactory = factoryManager.get(ToDo);
    const toDoRepository = dataSource.getRepository(ToDo);

    const now = new Date();
    const dateOffset = (daysOffset: number) => new Date(now.getTime() + daysOffset * ONE_DAY_MILLISECONDS);
    const dateOffsetIso = (daysOffset: number) => dateOffset(daysOffset).toISOString();

    const overdueHighPriority = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Task from 7 days ago',
      // Old task, recently overdue + very high impact → high SMART priority
      due_date: dateOffset(-1),
      outcome: 9,
      perspiration_level: 9,
      created_at: dateOffsetIso(-7),
      updated_at: dateOffsetIso(-7),
    });

    const dueTodayMedium = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Task from 5 days ago',
      // Due today, medium importance
      due_date: dateOffset(0),
      outcome: 5,
      perspiration_level: 5,
      created_at: dateOffsetIso(-5),
      updated_at: dateOffsetIso(-5),
    });

    const futureLowPriority = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Task from 3 days ago',
      // Far in future, low effort/impact → low SMART priority
      due_date: dateOffset(15),
      outcome: 2,
      perspiration_level: 2,
      created_at: dateOffsetIso(-3),
      updated_at: dateOffsetIso(-3),
    });

    const noDueDateHighOutcome = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'No due date task from 2 days ago',
      due_date: null,
      outcome: 8,
      perspiration_level: 4,
      created_at: dateOffsetIso(-2),
      updated_at: dateOffsetIso(-2),
    });

    const noDueDateLowOutcome = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'No due date task from yesterday',
      due_date: null,
      outcome: 1,
      perspiration_level: 2,
      created_at: dateOffsetIso(-1),
      updated_at: dateOffsetIso(-1),
    });

    const overdueLowOutcome = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Task from today',
      // Slightly overdue, modest impact
      due_date: dateOffset(-2),
      outcome: 4,
      perspiration_level: 3,
      created_at: dateOffsetIso(0),
      updated_at: dateOffsetIso(0),
    });

    const farFutureHighOutcome = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Task from tomorrow',
      // Very far future, high outcome but low urgency
      due_date: dateOffset(60),
      outcome: 7,
      perspiration_level: 6,
      created_at: dateOffsetIso(1),
      updated_at: dateOffsetIso(1),
    });

    const completedTask = await toDoFactory.save({
      user_id: TEST_USER_ID,
      title: 'Completed task from 10 days ago',
      due_date: dateOffset(-10),
      outcome: 7,
      perspiration_level: 5,
      status: 'COMPLETED',
      created_at: dateOffsetIso(-10),
      updated_at: dateOffsetIso(-10),
    });

    const todos = [
      overdueHighPriority,
      dueTodayMedium,
      futureLowPriority,
      noDueDateHighOutcome,
      noDueDateLowOutcome,
      overdueLowOutcome,
      farFutureHighOutcome,
      completedTask,
    ];

    await toDoRepository.save(todos);

    await Promise.all([
      toDoRepository.update(overdueHighPriority.id, {
        created_at: dateOffsetIso(-7),
        updated_at: dateOffsetIso(-7),
      }),
      toDoRepository.update(dueTodayMedium.id, {
        created_at: dateOffsetIso(-5),
        updated_at: dateOffsetIso(-5),
      }),
      toDoRepository.update(futureLowPriority.id, {
        created_at: dateOffsetIso(-3),
        updated_at: dateOffsetIso(-3),
      }),
      toDoRepository.update(noDueDateHighOutcome.id, {
        created_at: dateOffsetIso(-2),
        updated_at: dateOffsetIso(-2),
      }),
      toDoRepository.update(noDueDateLowOutcome.id, {
        created_at: dateOffsetIso(-1),
        updated_at: dateOffsetIso(-1),
      }),
      toDoRepository.update(overdueLowOutcome.id, {
        created_at: dateOffsetIso(0),
        updated_at: dateOffsetIso(0),
      }),
      toDoRepository.update(farFutureHighOutcome.id, {
        created_at: dateOffsetIso(1),
        updated_at: dateOffsetIso(1),
      }),
      toDoRepository.update(completedTask.id, {
        created_at: dateOffsetIso(-10),
        updated_at: dateOffsetIso(-10),
      }),
    ]);
  }
}
