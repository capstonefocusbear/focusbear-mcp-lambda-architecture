import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { ToDo } from '../modules/to-do/entities/to-do.entity';
import { ToDoStatus } from '../modules/to-do/domain/to-do-status.enum';

export const ToDoFactory = setSeederFactory(ToDo, (faker: Faker) => {
  const todo = new ToDo({}, { generateId: true });

  todo.title = faker.lorem.sentence(3);
  todo.details = faker.lorem.sentences(2);
  todo.objective = faker.lorem.sentence();
  todo.due_date = faker.helpers.maybe(() => faker.date.soon({ days: 14 }), { probability: 0.7 }) || null;
  todo.eisenhower_quadrant = faker.number.int({ min: 1, max: 4 });
  todo.outcome = faker.number.int({ min: 1, max: 9 });
  todo.perspiration_level = faker.number.int({ min: 1, max: 10 });
  todo.status = faker.helpers.arrayElement(Object.values(ToDoStatus));
  todo.duration = faker.number.int({ min: 5, max: 240 });
  todo.icon = null;

  return todo;
});
