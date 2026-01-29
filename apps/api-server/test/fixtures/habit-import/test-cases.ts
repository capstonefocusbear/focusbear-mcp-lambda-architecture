/**
 * Habit Import E2E Test Cases
 *
 * These test cases define the expected behavior for the habit import pipeline.
 * Each test case includes:
 * - A hosted image or audio URL
 * - Expected habits to be extracted (fuzzy matched)
 * - Minimum number of habits that should be matched against the library (RAG)
 *
 * After running tests, review console output to see actual matches and adjust minMatched accordingly.
 */

export interface HabitImportTestCase {
  description: string;
  url: string;
  mediaType: 'image' | 'audio';
  routineType?: 'morning' | 'evening' | 'break';
  routineDurationMinutes?: number;
  expectedHabits: string[]; // Habit names that should be extracted (fuzzy match)
  minExtracted: number; // Minimum number of habits to extract
  minMatched: number; // Minimum number of habits that should match library templates
}

/**
 * Test result interface for CSV output
 */
export interface TestResult {
  description: string;
  url: string;
  routineType?: string;
  passed: boolean;
  minExtracted: number;
  minMatched: number;
  expectedHabits: string[];
  expectedMatchedHabits: string[];
  expectedMatchedCount: number;
  expectedUnmatchedHabits: string[];
  extractedHabits: string[];
  extractedCount: number;
  matchedHabits: Array<{ extracted: string; matched: string; score: number }>;
  matchedCount: number;
  unmatchedHabits: string[];
  latency: {
    imageFetchMs: number;
    extractionMs: number;
    ragMatchingMs: number;
    // Detailed RAG breakdown:
    embeddingMs: number;
    vectorSearchMs: number;
    templateFetchMs: number;
    llmRerankMs: number;
    totalMs: number;
  };
  errors: string[];
}

/**
 * Image test cases
 */
export const imageTestCases: HabitImportTestCase[] = [
  {
    description: 'Input 1 - Goals and productivity habits',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%201%20.png',
    mediaType: 'image',
    expectedHabits: ['Review goals 5 minutes', 'Save or invest money', 'Tidy up 5 minutes', 'Check email and messages'],
    minExtracted: 3,
    minMatched: 0,
  },
  {
    description: 'Input 2 - Single hydration habit',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%202.png',
    mediaType: 'image',
    expectedHabits: ['Drink 2L Water'],
    minExtracted: 1,
    minMatched: 0,
  },
  {
    description: 'Input 3 - Evening/health habits',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%203.png',
    mediaType: 'image',
    expectedHabits: [
      'No screen time before bed',
      'Deep breathing 3 minutes',
      'No coffee after 2 PM',
      'Eat a healthy snack',
    ],
    minExtracted: 3,
    minMatched: 0,
  },
  {
    description: 'Input 4 - Daily wellness routine',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%204.jpg',
    mediaType: 'image',
    expectedHabits: [
      'Hydrate / Drink water',
      'Walk or exercise for 30 minutes',
      'Complete hardest task at noon',
      'Avoid all screens one hour before bed time',
      'Note on win before sleeping at night',
    ],
    minExtracted: 4,
    minMatched: 0,
  },
  {
    description: 'Input 5 - Evening productivity habits',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%205.jpg',
    mediaType: 'image',
    expectedHabits: [
      'No social media after 9 PM',
      'Study 1 hour',
      'Practice coding 30 mins',
      'Plan for tomorrow at night 5 mins',
    ],
    minExtracted: 3,
    minMatched: 0,
  },
  {
    description: 'Input 6 - Single reading habit',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input%206.jpg',
    mediaType: 'image',
    expectedHabits: ['Read 10 mins daily'],
    minExtracted: 1,
    minMatched: 0,
  },
  {
    description: 'Input 7 - Comprehensive daily habits',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input_7.jpg',
    mediaType: 'image',
    expectedHabits: [
      'Drink 2L water daily',
      'Read 10 minutes daily',
      'Walk 20 minutes daily',
      'Meditate 5 minutes daily',
      'Exercise 30 minutes (morning)',
      'Journal 5 minutes daily',
      'Stretch 10 minutes daily',
      'Sleep by 11:00 PM daily',
      'Wake up at 6:30 AM daily',
      'No social media after 9 PM',
      'Study 1 hour daily',
      'Take vitamins after breakfast',
      'Practice coding 30 minutes daily',
      'Plan tomorrow (5 min) at night',
      'Deep breathing 3 minutes daily',
    ],
    minExtracted: 10,
    minMatched: 0,
  },
  {
    description: 'Input 8 - Basic daily habits',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input_8.jpg',
    mediaType: 'image',
    expectedHabits: ['Drink 2L water daily', 'Read 10 minutes daily', 'Walk 20 minutes daily'],
    minExtracted: 3,
    minMatched: 0,
  },
  {
    description: 'Input 9 - Morning routine',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input_9.png',
    mediaType: 'image',
    routineType: 'morning',
    expectedHabits: [
      'Journal + daily fire',
      'Eat breakfast',
      'Deep breathing',
      'Take a walk outside',
      'Drink water',
      'Make your bed',
    ],
    minExtracted: 5,
    minMatched: 0,
  },
  {
    description: 'Input 11 - Morning self-care routine',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input_11.jpeg',
    mediaType: 'image',
    routineType: 'morning',
    expectedHabits: [
      'Hydrate',
      'Detox',
      '10 minute stretch',
      'Self care',
      'Healthy breakfast',
      '5 minute journal',
      'Go screen free for 30 minutes',
      'Top priority to do list',
      'Go out for fresh air',
    ],
    minExtracted: 7,
    minMatched: 0,
  },
  {
    description: 'Input 12 - Wellness habits list',
    url: 'https://pub-a692a9744d1041b59020087ffebbcc04.r2.dev/images/input_12.jpeg',
    mediaType: 'image',
    expectedHabits: [
      'Waking up early (even just 30 mins)',
      'Reading 10 pages a day',
      'Journaling every morning',
      'Planning my day the night before',
      'Drink 2 glass of water after waking up',
      'Drink herbal tea in the evening',
      '20 minutes of movement',
      'Writing a 1 line gratitude note at night',
      'No phone for the first hour',
      'Talking kindly to myself',
    ],
    minExtracted: 8,
    minMatched: 0,
  },
];

/**
 * Audio test cases (empty for now)
 */
export const audioTestCases: HabitImportTestCase[] = [];
