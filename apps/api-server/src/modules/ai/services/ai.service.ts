/* eslint-disable no-await-in-loop */
import { BadRequestException, Injectable, ValidationError } from '@nestjs/common';
import internal, { Stream } from 'stream';
import OpenAI from 'openai';
import { FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources';
import { ConfigService } from '@nestjs/config';
import { GPT_4_1_MINI, createActivityFunction, createFocusModeFunction } from '../../../shared/utils/constants';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { CreateFocusModeDto } from '../../focus-mode/dto/create-focus-mode.dto';
import { FunctionCallParametersDto } from '../dto/function-call-parameters.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly userSettingsService: UserSettingsService,
    private readonly focusModeService: FocusModeService,
    protected readonly configService: ConfigService,
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
    messages: ChatCompletionMessageParam[],
    language = 'English',
  ) {
    const openai = new OpenAI({ apiKey: this.configService.get('openai.general.apiKey') });

    const chatHistory = this.getChatHistory(messages, language);
    let retryCount = 0;

    while (retryCount < 3) {
      try {
        const stream = new Stream.PassThrough();
        let isFunctionCallMode = false;
        let functionName = '';
        let functionCall = '';

        const processResponse = async (response: any) => {
          try {
            const { choices }: ChatCompletionChunk = response;
            const {
              finish_reason,
              delta: { content, function_call },
            } = choices[0];
            let isFunctionCall = false;
            if (!finish_reason) {
              isFunctionCall = !!function_call;
              if (isFunctionCall) {
                isFunctionCallMode = true;
                functionName += function_call?.name || '';
                functionCall += function_call?.arguments || '';
              }
            }
            if (!isFunctionCall && !isFunctionCallMode) {
              stream.write(`data: ${content ?? '[DONE]'}\n\n`);
            }

            if (finish_reason) {
              await this.handleStreamEnd(stream, functionName, functionCall, isFunctionCallMode, user_id, openai);
            }
          } catch (getStreamResponseError) {
            console.error('Error reading stream response: ', getStreamResponseError);
            throw getStreamResponseError;
          }
        };

        const chatCompletionStream = await openai.chat.completions.create({
          model: GPT_4_1_MINI,
          messages: chatHistory,
          temperature: 0.2,
          n: 1,
          function_call: 'auto',
          functions: [createActivityFunction, createFocusModeFunction],
          stream: true,
        });

        for await (const part of chatCompletionStream) {
          processResponse(part);
        }

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
    openai: OpenAI,
  ) {
    if (isFunctionCallMode && functionName) {
      const functionParameters = JSON.parse(functionCall);
      // call function to save activity or focus mode
      await this.validateFunctionCallParameters(functionParameters);
      await this[functionName](user_id, functionParameters);

      const chatCompletionStreamTwo = await openai.chat.completions.create(
        {
          model: GPT_4_1_MINI,
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
        { stream: true },
      );

      for await (const part of chatCompletionStreamTwo) {
        const { choices } = part;
        const {
          finish_reason,
          delta: { content },
        } = choices[0];
        stream.write(`data: ${!finish_reason ? content : '[DONE]'}\n\n`);
        if (finish_reason) {
          stream.end();
        }
      }
    } else if (!isFunctionCallMode) {
      stream.end();
    }
  }

  getChatHistory(messages: ChatCompletionMessageParam[], language: string): ChatCompletionMessageParam[] {
    const defaultChat: ChatCompletionMessageParam = {
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
