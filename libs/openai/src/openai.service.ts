/* eslint-disable no-await-in-loop */
import { Inject, Injectable } from '@nestjs/common';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, OpenAIApi, Configuration } from 'openai';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Observable } from 'rxjs';
import { Stream } from 'stream';
import { FastifyReply } from 'fastify';
import cheerio from 'cheerio';
import { join } from 'path';
import { promises as fs } from 'fs';
import * as axios from 'axios';
import { IsUrlSafeDto } from '../../../apps/api-server/src/modules/user/dto/is-url-safe.dto';
import { HabitOption, IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';

@Injectable()
export class OpenAIService {
  constructor(
    @Inject(OPENAI_MODULE_OPTIONS) private options: IOpenAIOptions,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  private cacheDir = join(__dirname, '../../../tmp/url-metadata-cache');

  async createMotivationalSummary(response: FastifyReply, input: HabitOption[], language: string) {
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
      const config = new Configuration({ ...this.options });
      const openai = new OpenAIApi(config);
      const messages: ChatCompletionRequestMessage[] = [
        {
          content: `Given the input below, generate a short motivational message to keep someone motivated in their daily habits in ${language}\n\n${JSON.stringify(
            input,
            null,
            2,
          )}`,
          role: ChatCompletionRequestMessageRoleEnum.System,
        },
      ];
      let retryCount = 0;
      while (retryCount < 3) {
        try {
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
              stream.end();
            },
          });
          return await response.send(stream);
        } catch (error) {
          retryCount++;
        }
      }
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
    if (!isUrlSafeDto?.url) {
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
      content: `Please provide a JSON response indicating whether the following website is safe for the user to visit.:
      - URL: ${isUrlSafeDto.url}
      - Tab Title: ${titleToUse}
      - Meta Description: ${metaDescriptionToUse}
      - Focus Mode: ${isUrlSafeDto.focus_mode}
      - Intention: ${isUrlSafeDto.intention}
       
      If the website not directly related to the focus mode and intention, the website should be considered as unsafe to visit and have a low score (below 0.8)
      Example of case where the website is safe for the user to visit (should have a score of 1):
      - URL: https://stackoverflow.com/
      - Tab Title: Stack Overflow
      - Meta Description: Stack Overflow is the largest, most trusted online community for developers to learn, share their programming knowledge, and build their careers.
      - Focus Mode: Programming Work
      - Intention: Finish dashboard website

      Example of case where the website is NOT safe for the user to visit (should have a score of 0.1):
      - URL: https://www.airbnb.com/
      - Tab Title: Vacation Homes & Condo Rentals - Airbnb - Airbnb
      - Meta Description: Find the perfect place to stay at an amazing price in 191 countries. Belong anywhere with Airbnb.
      - Focus Mode: Programming Work
      - Intention: Finish dashboard website

      The user may have ADHD and could get distracted by unrelated content, so please provide an "allowed_probability" value between 0 and 1 and a short explanation (15 words max) in second person on why the website should be allowed or blocked. The "reason" value should be in ${isUrlSafeDto.language} and there should be no other values in the JSON response other then reason and allowed_probability. 
      Please do not mention the user's ADHD in your response. The response should include the JSON output and no additional explanation!`,
    };
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const completions = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [defaultChat],
          temperature: 0.3,
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
      const response = await axios.default.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

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
}
