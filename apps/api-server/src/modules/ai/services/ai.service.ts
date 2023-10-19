/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, ValidationError } from '@nestjs/common';
import internal, { Stream } from 'stream';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import { FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { createActivityFunction, createFocusModeFunction } from '../../../shared/utils/constants';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CreateFocusModeDto } from '../../focus-mode/dto/create-focus-mode.dto';
import { FunctionCallParametersDto } from '../dto/function-call-parameters.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly userSettingsService: UserSettingsService,
    private readonly focusModeService: FocusModeService,
  ) {}

  async createActivity(userId: string, data: FunctionCallParametersDto) {
    await this.userSettingsService.addActivityToRoutine(userId, data);
  }

  async validateFunctionCallParameters(functionCallParams: FunctionCallParametersDto) {
    const dto = plainToClass(FunctionCallParametersDto, functionCallParams);
    let validationErrors: ValidationError[] = [];
    validationErrors = await validate(dto, {
      validationError: { target: true, value: true },
    });
    if (validationErrors.length > 0) {
      throw new BadRequestException({ validationErrors });
    }
  }

  async createFocusMode(userId: string, data: FunctionCallParametersDto) {
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
            await this.handleStreamEnd(stream, functionName, functionCall, isFunctionCallMode, user_id, openai);
          });
        };

        const response = await openai.createChatCompletion(
          {
            model: 'gpt-3.5-turbo',
            messages: chatHistory,
            temperature: 0.2,
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

  async handleStreamEnd(
    stream: internal.PassThrough,
    functionName: string,
    functionCall: string,
    isFunctionCallMode: boolean,
    user_id: string,
    openai: OpenAIApi,
  ) {
    if (isFunctionCallMode && functionName) {
      const functionParameters = JSON.parse(functionCall);
      // call function to save activity or focus mode
      await this.validateFunctionCallParameters(functionParameters);
      await this[functionName](user_id, functionParameters);

      const responseTwo: any = await openai.createChatCompletion(
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getPostFunctionCallPrompt(functionName, functionParameters),
            },
          ],
          temperature: 0.2,
          n: 1,
          stream: true,
        },
        { responseType: 'stream' },
      );

      responseTwo.data.on('data', (chunk: any) => {
        stream.write(chunk.toString());
      });

      responseTwo.data.on('end', () => {
        stream.end();
      });
    } else if (!isFunctionCallMode) {
      stream.end();
    }
  }

  getChatHistory(messages: ChatCompletionRequestMessage[], language: string): ChatCompletionRequestMessage[] {
    const defaultChat: ChatCompletionRequestMessage = {
      role: 'system',
      content: `
      You are a ${language}-speaking assistant named Focus Bear. 
      Your purpose is to help users improve productivity and establish good habits. 
      Within an app, users can block distracting apps and websites and practice daily routines they've set. 
      Your discussions should center on productivity and habits. Responses should be under 100 words. 
      Please begin with a brief greeting. If a function call misses any required arguments, ask for the missing information without repeating phrases. 
      Do not assume defaults on your own.`,
    };
    return [defaultChat, ...messages];
  }

  getPostFunctionCallPrompt(functionName: string, { name, routine }: { name: string; routine?: string }) {
    const createActivityPrompt = `Send the user a message saying their activity named ${name} has been saved to their ${routine} routine.`;
    const createFocusModePrompt = `Send the user a message saying their focus mode named ${name} has been saved.`;
    return functionName === 'createActivity' ? createActivityPrompt : createFocusModePrompt;
  }
}
