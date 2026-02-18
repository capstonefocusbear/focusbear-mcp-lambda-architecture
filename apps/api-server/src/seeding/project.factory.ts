import { setSeederFactory } from 'typeorm-extension';
import { Faker } from '@faker-js/faker';
import { Project } from '../modules/project/entities/project.entity';
import { DEFAULT_PROJECT_STATUSES } from '../modules/project/domain/project-status.model';

export const ProjectFactory = setSeederFactory(Project, (faker: Faker) => {
  const project = new Project(
    {
      name: faker.helpers.arrayElement([
        'Web Application',
        'Mobile App',
        'API Development',
        'Data Analytics',
        'Machine Learning',
        'DevOps Pipeline',
        'UI/UX Design',
        'Content Management',
        'E-commerce Platform',
        'Social Media App',
      ]),
      description: faker.datatype.boolean() ? faker.lorem.paragraph() : undefined,
      custom_statuses: faker.datatype.boolean({ probability: 0.3 })
        ? [
            { id: 'custom-backlog', label: 'Backlog', color: '#9CA3AF', order: 0, should_complete_task: false },
            { id: 'custom-todo', label: 'To Do', color: '#6B7280', order: 1, should_complete_task: false },
            { id: 'custom-in-progress', label: 'In Progress', color: '#3B82F6', order: 2, should_complete_task: false },
            { id: 'custom-review', label: 'In Review', color: '#F59E0B', order: 3, should_complete_task: false },
            { id: 'custom-done', label: 'Done', color: '#10B981', order: 4, should_complete_task: true },
          ]
        : DEFAULT_PROJECT_STATUSES,
    },
    { generateId: true },
  );

  return project;
});
