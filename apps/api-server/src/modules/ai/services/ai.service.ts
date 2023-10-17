/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/return-await */
import { Injectable } from '@nestjs/common';
import { Stream } from 'stream';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { createActivityFunction, createFocusModeFunction } from '../../../shared/utils/constants';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CreateFocusModeDto } from '../../focus-mode/dto/create-focus-mode.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly userSettingsService: UserSettingsService,
    private readonly focusModeService: FocusModeService,
  ) {}

  async createActivity(userId: string, data: any) {
    await this.userSettingsService.addActivityToRoutine(userId, data);
  }

  async createFocusMode(userId: string, data: any) {
    const focusMode: CreateFocusModeDto = {
      id: randomUUID(),
      name: data?.name,
      allowed_apps: data?.allowed_apps ?? [],
      allowed_urls: data?.allowed_urls ?? [],
    };
    await this.focusModeService.createFocusMode(userId, focusMode);
  }

  async streamChatReply(
    fastifyResponse: FastifyReply,
    user_id: string,
    messages: ChatCompletionRequestMessage[],
    language = 'English',
  ) {
    const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(config);
    const chatHistory = this.getChatHistory(messages, language);
    let retryCount = 0;

    const handleError = (error: any) => {
      fastifyResponse.status(500).send(`Error occurred while streaming data: ${JSON.stringify(error)}`);
    };

    while (retryCount < 3) {
      try {
        const stream = new Stream.PassThrough();
        let isFunctionCallMode = false;
        let functionName = '';
        let functionCall = '';

        const processResponse = async (response: any) => {
          response.data.on('data', (chunk: any) => {
            const lines = chunk
              .toString()
              .split('\n')
              .filter((line: string) => line.trim() !== '');
            for (const line of lines) {
              const message = line.replace(/^data: /, '');
              if (message !== '[DONE]') {
                const parsedMessage = JSON.parse(message);
                const isFunctionCall = !!parsedMessage.choices[0]?.delta?.function_call;
                if (isFunctionCall) {
                  isFunctionCallMode = true;
                  functionName += parsedMessage.choices[0]?.delta?.function_call?.name || '';
                  functionCall += parsedMessage.choices[0]?.delta?.function_call?.arguments || '';
                } else if (!isFunctionCall && !isFunctionCallMode) {
                  stream.write(chunk.toString());
                }
              }
            }
          });

          response.data.on('end', async () => {
            if (isFunctionCallMode && functionName) {
              const generatedFunctionCall = JSON.parse(functionCall);
              const functionParameters = generatedFunctionCall;
              await this[functionName](user_id, functionParameters);

              const postSavePrompt = `Send the user a message saying their ${functionName} has been saved.`;

              openai
                .createChatCompletion(
                  {
                    model: 'gpt-3.5-turbo',
                    messages: [
                      {
                        role: 'system',
                        content: postSavePrompt,
                      },
                    ],
                    temperature: 0.7,
                    n: 1,
                    stream: true,
                  },
                  { responseType: 'stream' },
                )
                .then((responseTwo: any) => {
                  responseTwo.data.on('data', (chunk: any) => {
                    stream.write(chunk.toString());
                  });
                  responseTwo.data.on('end', () => {
                    stream.end();
                  });
                })
                .catch(handleError);
            } else if (!isFunctionCallMode) {
              stream.end();
            }
          });
        };

        const response = await openai.createChatCompletion(
          {
            model: 'gpt-3.5-turbo',
            messages: chatHistory,
            temperature: 0.5,
            n: 1,
            function_call: 'auto',
            functions: [createActivityFunction, createFocusModeFunction],
            stream: true,
          },
          { responseType: 'stream' },
        );

        processResponse(response);
        return await fastifyResponse.send(stream);
      } catch (error) {
        retryCount++;
      }
    }
  }

  getChatHistory(messages: ChatCompletionRequestMessage[], language: string): ChatCompletionRequestMessage[] {
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `You are a ${language} speaking chatbot(don't mention that you are a chatbot) 
      named Focus Bear helping people to be productive and achieve 
      the goals they set out to achieve. You are part of an app that has features 
      like allowing users to block apps and websites they find distracting and letting them 
       practice habits they set out to do as part of their daily routines. You are restricted to 
      talking about productivity and habits and should limit responses to 100 words. Please greet the user briefly.
      For function calls, if any required arguments aren't received, ask the user for the missing arguments, don't pick defaults by yourself`,
    };
    return [defaultChat, ...messages];
  }
}
