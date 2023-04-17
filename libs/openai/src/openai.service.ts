/* eslint-disable no-await-in-loop */
import { Inject, Injectable } from '@nestjs/common';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, OpenAIApi, Configuration } from 'openai';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { Observable } from 'rxjs';
import { Stream } from 'stream';
import { FastifyReply } from 'fastify';
import { IsUrlSafeDto } from '../../../apps/api-server/src/modules/user/dto/is-url-safe.dto';
import { HabitOption, IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';

@Injectable()
export class OpenAIService {
  constructor(
    @Inject(OPENAI_MODULE_OPTIONS) private options: IOpenAIOptions,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

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
    const config = new Configuration({ ...this.options });
    const openai = new OpenAIApi(config);
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `Please advise whether the following website is safe to visit given the user's current focus and intention. Bear in mind that the user may have ADHD (highly confidential) and can get distracted by sites that are unrelated to their current intention even if the site is generically productive. Don't mention that the user has ADHD.

      - URL: ${isUrlSafeDto.url}
      - Tab Title: ${isUrlSafeDto.tab_title}
      - Meta Description: ${isUrlSafeDto.meta_description}
      - Focus Mode: ${isUrlSafeDto.focus_mode}
      - Intention: ${isUrlSafeDto.intention}
      
      Respond in JSON format with the following properties (allowed_probability should be between 0 and 1) the response should include only the JSON output and no additional explanation and the "reason" value should be in ${isUrlSafeDto.language}:
      
      {
        "allowed_probability": number,
        "reason": "Short explanation (15 words max) in second person on why the website should be blocked/allowed. Don't give them advice"
      }`,
    };
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const completions = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [defaultChat],
          temperature: 0.7,
          n: 1,
        });
        const newMessage = completions.data.choices[0].message;
        return JSON.parse(newMessage.content);
      } catch (error) {
        retryCount++;
      }
    }
  }
}
