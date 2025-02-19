import { URLSafePrompt } from './prompt';
import type { UnifiedConfig } from 'promptfoo';
const config: UnifiedConfig = {
  description: "Evaluate whether the following website aligns with the user's Focus Mode and provide a JSON response.",
  prompts: [
    {
      raw: '',
      label: 'Is url safe prompt',
      function: URLSafePrompt,
    },
  ],
  providers: ['openai:gpt-4o'],
  tests: [
    {
      vars: {
        url: 'https://www.example.com',
        tabTitle: 'Example',
        focusmode: 'Studying',
        intention: 'Studying for exam',
        justificationForThisUrl: 'This is a test',
        lastFiveJustfications: ['test'],
      },
      assert: [{ type: 'is-json', value: { required: ['allowed_probability', 'reason'] } }],
    },
  ],
};

export default config;
