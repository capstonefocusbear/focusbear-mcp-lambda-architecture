import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { SentryServiceMock, ToDoRepositoryMock } from '../../../../test/mocks';
import { ToDoService } from './to-do.service';
import { ToDoRepository } from '../repositories/to-do.repository';

describe('toDoService', () => {
  let toDoService: ToDoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ToDoService,
        ToDoRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(ToDoRepository)
      .useValue(ToDoRepositoryMock)
      .compile();

    toDoService = moduleRef.get<ToDoService>(ToDoService);
  });

  it('should be defined', () => {
    expect(toDoService).toBeDefined();
  });
});
