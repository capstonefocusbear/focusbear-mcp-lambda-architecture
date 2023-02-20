import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { userDummy } from '../../../../test/dummies';
import { SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { TabKeywordsService } from './tab-keywords.service';

describe('TabKeywordsService', () => {
  let service: TabKeywordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TabKeywordsService,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .compile();

    service = module.get<TabKeywordsService>(TabKeywordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTabTitlesKeywords', () => {
    const titles = [
      '10 Reasons Why React Native is the Best Choice for Mobile App Development',
      "Getting Started with React Native: A Beginner's Guide",
      'The Pros and Cons of Using React Native for Cross-Platform App Development',
      'Advanced Techniques for Creating Stunning UIs with React Native',
      'React Native vs. Native Development: Which One to Choose?',
      'How to Optimize Performance in React Native Apps',
      'Creating Animations in React Native: Tips and Best Practices',
      'Building Your First React Native App: A Step-by-Step Guide',
      'Exploring the Latest Features in React Native 0.64',
      'Debugging and Troubleshooting Common Issues in React Native Development',
    ];
    it('positive: should return top phrases from tab titles', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const keywords = await service.getTabTitlesKeywords(userDummy.id, titles);

      expect(keywords).toEqual(['React', 'Native', 'React Native', 'Development', 'Best']);
    });
  });
});
