/* eslint-disable no-await-in-loop */
import { Inject, Injectable } from '@nestjs/common';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, OpenAIApi, Configuration } from 'openai';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Observable } from 'rxjs';
import { Stream } from 'stream';
import { FastifyReply } from 'fastify';
import { load } from 'cheerio';
import { join } from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import { MotivationalSummaryQueryDto } from '../../../apps/api-server/src/modules/user/dto/get-motivational-summary-query.dto';
import { DeviceType } from '../../../apps/api-server/src/modules/user/domain/device-type.enum';
import { IsUrlSafeDto } from '../../../apps/api-server/src/modules/user/dto/is-url-safe.dto';
import { HabitOption, IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';
import { AiToneOptions } from './domain/ai-tones.enum';

@Injectable()
export class OpenAIService {
  constructor(
    @Inject(OPENAI_MODULE_OPTIONS) private options: IOpenAIOptions,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  private cacheDir = join(__dirname, '../../../tmp/url-metadata-cache');

  constructMotivationalMessagePrompt(
    streaksData: HabitOption[],
    longTermGoals: string[],
    { language, tone, device_type = DeviceType.MOBILE }: MotivationalSummaryQueryDto,
  ) {
    const wordCount = device_type === DeviceType.DESKTOP ? '100' : '50';
    const longTermGoalsPhrase = longTermGoals?.length > 0 ? "and the user's long term goals" : '';
    const addedLongTermGoals = longTermGoals?.length > 0 ? `Long term goals: ${longTermGoals}` : '';
    const baseMessage = `Given the user's habits input below ${longTermGoalsPhrase}, generate a short motivational message (keep it below ${wordCount} words and add line breaks where appropriate) in a ${tone} tone to keep them motivated in their daily habits in ${language}\n\nHabits input: ${JSON.stringify(
      streaksData,
      null,
      2,
    )}\n\n${addedLongTermGoals}`;
    const futureSelfMessage = `Given the user's habits input below ${longTermGoalsPhrase}, generate a short motivational message (keep it below ${wordCount} words and add line breaks where appropriate) in a ${tone} tone as if you're a future self 20 years from now talking to the present user to encourage them to work hard for the future version of themselves, and don't use past tense. Do this in ${language}\n\nHabits input: ${JSON.stringify(
      streaksData,
      null,
      2,
    )}\n\n${addedLongTermGoals}\n\nDon't start with 'Dear...' just start with the message`;
    const factualMessage = `Given the user's habits input below ${longTermGoalsPhrase}, generate a short message (keep it below ${wordCount} words and add line breaks where appropriate) in a ${tone} tone, pretend you are talking to the user and give them a summary of their habits input streaks. Do this in ${language} and don't start with 'Based on your input,', just start with the message.\n\nHabits input: ${JSON.stringify(
      streaksData,
      null,
      2,
    )}\n\n${addedLongTermGoals}`;
    if (tone === AiToneOptions.FUTURE_SELF) {
      return futureSelfMessage;
    }
    if (tone === AiToneOptions.FACTUAL) {
      return factualMessage;
    }
    return baseMessage;
  }

  async createMotivationalSummary(
    response: FastifyReply,
    input: HabitOption[],
    longTermGoals: string[],
    { language, tone, device_type = DeviceType.MOBILE }: MotivationalSummaryQueryDto,
  ) {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Creating motivational summary using OpenAI API',
        data: {
          input,
          language,
        },
      });
      const prompt = this.constructMotivationalMessagePrompt(input, longTermGoals, { language, tone, device_type });
      // clear up prompt formatting to stream to client as string
      const promptWithoutNewLines = prompt.replace(/\n/g, ' ');
      const formattedPrompt = promptWithoutNewLines
        .split(' ')
        .filter((word) => word !== '')
        .join(' ');
      const messages: ChatCompletionRequestMessage[] = [
        {
          content: prompt,
          role: ChatCompletionRequestMessageRoleEnum.System,
        },
      ];
      const config = new Configuration({ ...this.options });
      const openai = new OpenAIApi(config);
      const stream = new Stream.PassThrough();
      const observable = new Observable((observer) => {
        openai
          .createChatCompletion(
            {
              model: 'gpt-3.5-turbo',
              messages,
              temperature: 0.7,
              n: 1,
              stream: true,
            },
            { responseType: 'stream' },
          )
          .then((res: any) => {
            res.data.on('data', (chunk: any) => {
              observer.next(chunk.toString());
            });
            res.data.on('end', () => {
              observer.complete();
            });
          })
          .catch((error) => {
            observer.error(error);
          });
      });

      observable.subscribe({
        next: (chunk: string) => {
          stream.write(chunk);
        },
        error: (error: any) => {
          response.status(500).send(`Error occurred while streaming data: ${JSON.stringify(error)}`);
        },
        complete: () => {
          stream.write(`data: PROMPT: ${formattedPrompt}\n\n`);
          stream.end();
        },
      });
      return await response.send(stream);
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async streamChatReply(res: FastifyReply, messages: ChatCompletionRequestMessage[], language = 'English') {
    const config = new Configuration({ ...this.options });
    const openai = new OpenAIApi(config);
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `You are a ${language} speaking chatbot(don't mention that you are a chatbot) 
      named Focus Bear helping people to be productive and achieve 
      the goals they set out to achieve. You are part of an app that has features 
      like allowing users to block apps and websites they find distracting and letting them 
       practice habits they set out to do as part of their daily routines. You are restricted to 
      talking about productivity and habits and should limit responses to 100 words. Please greet the user briefly.`,
    };
    const chatHistory: ChatCompletionRequestMessage[] = [defaultChat, ...messages];
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const stream = new Stream.PassThrough();
        const observable = new Observable((observer) => {
          openai
            .createChatCompletion(
              {
                model: 'gpt-3.5-turbo',
                messages: chatHistory,
                temperature: 0.7,
                n: 1,
                stream: true,
              },
              { responseType: 'stream' },
            )
            .then((response: any) => {
              response.data.on('data', (chunk: any) => {
                observer.next(chunk.toString());
              });
              response.data.on('end', () => {
                observer.complete();
              });
            })
            .catch((error) => {
              observer.error(error);
            });
        });

        observable.subscribe({
          next: (chunk: string) => {
            stream.write(chunk);
          },
          error: (error: any) => {
            res.status(500).send(`Error occurred while streaming data: ${JSON.stringify(error)}`);
          },
          complete: () => {
            stream.end();
          },
        });
        return await res.send(stream);
      } catch (error) {
        retryCount++;
      }
    }
  }

  async checkIfUrlIsSafeToUse(isUrlSafeDto: IsUrlSafeDto) {
    if (!isUrlSafeDto?.url || !this.isValidURL(isUrlSafeDto?.url)) {
      return null;
    }
    const config = new Configuration({ ...this.options });
    const openai = new OpenAIApi(config);
    let metaDescriptionToUse = isUrlSafeDto.meta_description;
    let titleToUse = isUrlSafeDto.tab_title;
    if (!metaDescriptionToUse || !titleToUse) {
      const { title, description } = await this.getMetadata(isUrlSafeDto.url);
      metaDescriptionToUse = description;
      titleToUse = title;
    }
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `Please provide a JSON response indicating whether the following website is related to the user's Focus Mode:
    JSON response format:
    { allowed_probability: number between 0 and 1, reason: the reason why the website and focus mode are related or unrelated }

    Website data:
      URL: ${isUrlSafeDto.url}
      Tab Title: ${titleToUse}
      Meta Description: ${metaDescriptionToUse}

    Focus Mode data:
      Focus Mode: ${isUrlSafeDto.focus_mode}
      Intention (what the user wants to focus on): ${isUrlSafeDto.intention}

    If the meta description or tab title are related to the Focus Mode Intention, allow it.
    If you are sure that the URL is related to the focus mode or intention, you can also allow the site.
       
    If the website is not directly related to the focus mode and intention, allowed_probability should have a low score (below 0.6), if the website data and focus mode are somewhat related allowed_probability should be from 0.6 to 0.8, and if the website and focus mode are definitely related, allowed_probability should be from 0.9 to 1.
      
    JSON Response:`,
    };
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const completions = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [defaultChat],
          temperature: 0,
          n: 1,
        });
        const newMessage = completions.data.choices[0].message;
        const { content } = newMessage;
        // extract JSON string from generated content to avoid having extra text
        const openingBracketIndex = content.indexOf('{');
        const closingBracketIndex = content.indexOf('}');
        const jsonString = content.substring(openingBracketIndex, closingBracketIndex + 1);
        return JSON.parse(jsonString);
      } catch (error) {
        retryCount++;
      }
    }
  }

  addHttpsProtocol(url: string): string {
    if (!url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  addHttpsProtocolAndWWW(url: string): string {
    let newUrl = this.addHttpsProtocol(url); // Ensures https:// is present
    const matchHttps = newUrl.match(/^https:\/\/([^/]+)/);
    if (matchHttps && !matchHttps[1].startsWith('www.')) {
      newUrl = newUrl.replace(/^https:\/\//, 'https://www.');
    }
    return newUrl;
  }

  async getMetadata(url: string): Promise<{ title: string | null; description: string | null }> {
    try {
      const cacheFile = join(this.cacheDir, `${encodeURIComponent(url)}.json`);
      try {
        const cachedMetadata = await fs.readFile(cacheFile, 'utf-8');
        return JSON.parse(cachedMetadata);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
      const urlWithProtocol = this.addHttpsProtocol(url);
      const urlWithProtocolAndSubdomain = this.addHttpsProtocolAndWWW(url);
      let response;
      try {
        response = await axios.get(urlWithProtocol);
      } catch (error) {
        try {
          response = await axios.get(urlWithProtocolAndSubdomain);
        } catch (nestedError) {
          return { title: '', description: '' };
        }
      }
      const html = response.data;
      const $ = load(html);

      const title = $('head title').text().trim() || null;

      let description = $('meta[name="description"]').attr('content');
      if (!description) {
        const textContent = $('body').text().replace(/\s+/g, ' ').trim();
        description = textContent.slice(0, 180) || null;
      }

      const metadata = { title, description };

      if (metadata.title || metadata.description) {
        await fs.mkdir(this.cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify(metadata), 'utf-8');
      }

      return metadata;
    } catch (error) {
      return { title: null, description: null };
    }
  }

  isValidURL(string: string) {
    const validUrl = new RegExp(
      '^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?',
    );
    const validUrlWithoutProtocol = new RegExp('^([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?');
    if (validUrl.test(string) || validUrlWithoutProtocol.test(string)) {
      return true;
    }
    return false;
  }

  async checkIfUsernameIsValid(username: string): Promise<{ allowed: boolean }> {
    const config = new Configuration({ ...this.options });
    const openai = new OpenAIApi(config);
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `Given the following username, determine whether it uses curse words or could be offensive to anyone, if it is deemed fine, return true, if offensive, return false.
      the output should be in the format:
      { allowed: boolean }
      username: ${username}
      JSON output:`,
    };
    const completions = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [defaultChat],
      temperature: 0,
      n: 1,
    });
    const newMessage = completions.data.choices[0].message;
    const { content } = newMessage;
    return JSON.parse(content);
  }
}
