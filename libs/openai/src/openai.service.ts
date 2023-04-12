/* eslint-disable no-await-in-loop */
import { Inject, Injectable } from '@nestjs/common';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, OpenAIApi, Configuration } from 'openai';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { HabitOption, IOpenAIOptions } from './interfaces';
import { OPENAI_MODULE_OPTIONS } from './openai.constants';

@Injectable()
export class OpenAIService {
  constructor(
    @Inject(OPENAI_MODULE_OPTIONS) private options: IOpenAIOptions,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async createMotivationalSummary(input: HabitOption[], language: string) {
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
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
      });
      const completionText = completion.data.choices[0].message.content;
      return completionText;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }

  async createChatReply(messages: ChatCompletionRequestMessage[], language = 'English') {
    try {
      this.sentryService.instance().addBreadcrumb({
        category: 'Service',
        level: 'debug',
        message: 'Generating a chat reply using OpenAI API',
        data: {
          messages,
          language,
        },
      });
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
      const chatHistory: ChatCompletionRequestMessage[] = [...messages];
      const hasExistingChat = Boolean(messages.length);
      if (!hasExistingChat) {
        chatHistory.push(defaultChat);
      }
      const fetchChatCompletion = async () => {
        let retryCount = 0;
        while (retryCount < 3) {
          try {
            const completions = await openai.createChatCompletion({
              model: 'gpt-3.5-turbo',
              messages: chatHistory,
              temperature: 0.7,
              n: 1,
            });
            const newMessage = completions.data.choices[0].message;
            return newMessage;
          } catch (error) {
            retryCount++;
          }
        }
      };
      const newMessage = await fetchChatCompletion();
      chatHistory.push(newMessage);
      return chatHistory;
    } catch (error) {
      this.sentryService.instance().captureMessage(JSON.stringify(error), 'error');
      throw error;
    }
  }
}
