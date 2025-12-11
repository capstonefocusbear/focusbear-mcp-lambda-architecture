import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { userDummy } from '../../../../test/dummies';
import { SentryServiceMock, UserRepositoryMock } from '../../../../test/mocks';
import { UserRepository } from '../../user/repositories/user.repository';
import { TabKeywordsService } from './tab-keywords.service';

describe('TabKeywordsService', () => {
  let service: TabKeywordsService;

  beforeAll(async () => {
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
    it('positive: should return top phrases from tab titles', async () => {
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const keywords = await service.getTabTitlesKeywords(userDummy.id, titles);

      expect(keywords).toEqual(['React', 'Native', 'React Native', 'Development', 'Best']);
    });

    it('Another example with screentime related keywords', async () => {
      const titles = [
        'IOS Screen Time API integration wi… | Apple Developer Forums',
        'How can i access active screen time of IOS in react native? - Stack Overflow',
        'javascript - How can I track screen time of user when a user navigate to specific screen in react native? - Stack Overflow',
        'React Native : How to find Screen awake time between Sleeps - Stack Overflow',
      ];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const keywords = await service.getTabTitlesKeywords(userDummy.id, titles);

      expect(keywords).toEqual(['screen', 'time', 'Stack', 'Stack Overflow', 'Overflow']);
    });

    it('should exclude keywords with only one match', async () => {
      const titles = ['IOS Screen Time API integration wi… | Apple Developer Forums'];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const keywords = await service.getTabTitlesKeywords(userDummy.id, titles);

      expect(keywords).toEqual([]);
    });
  });
});
