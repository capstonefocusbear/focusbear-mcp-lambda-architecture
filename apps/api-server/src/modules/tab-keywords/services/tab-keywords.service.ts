import { Injectable } from '@nestjs/common';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';

@Injectable()
export class TabKeywordsService {
  constructor(@InjectSentry() private readonly sentryService: SentryService) {}

  async getTabTitlesKeywords(user_id: string, titles: string[]): Promise<string[]> {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Getting tab title keywords',
        data: {
          user_id,
        },
      });
      const phraseFrequency = {};
      const IGNORE_WORDS = [
        'a',
        'an',
        'the',
        'and',
        'or',
        'in',
        'on',
        'at',
        'for',
        'to',
        'with',
        'of',
        'from',
        'how',
        '-',
        'how to',
        'how to use',
        'what',
        'what is',
        'is',
      ];
      titles.forEach((title) => {
        const words = title.split(' ');
        for (let j = 0; j < words.length; j++) {
          // Ignore common words
          if (IGNORE_WORDS.includes(words[j].toLowerCase())) {
            // eslint-disable-next-line no-continue
            continue;
          }
          // Loop through each subsequent word up to 5 words long
          for (let k = 1; k <= 5 && j + k <= words.length; k++) {
            const phrase = words.slice(j, j + k).join(' ');
            if (phrase in phraseFrequency) {
              phraseFrequency[phrase]++;
            } else {
              phraseFrequency[phrase] = 1;
            }
          }
        }
      });
      // Convert the frequency object to an array of [phrase, frequency] pairs
      const phraseFrequencyArray: [string, number][] = Object.entries(phraseFrequency);

      phraseFrequencyArray.sort((precedingPhrase, followingPhrase) => followingPhrase[1] - precedingPhrase[1]);

      // only include phrases that are used multiple times
      const topPhrasesAndFrequencies = phraseFrequencyArray.slice(0, 5).filter(([, frequency]) => frequency > 1);
      const topPhrases = topPhrasesAndFrequencies.map(([phrase]) => phrase);
      return topPhrases;
    } catch (error) {
      this.sentryService.instance().captureException(JSON.stringify(error), { level: 'error' });
      throw error;
    }
  }
}
