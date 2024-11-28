import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';

interface QueryParams {
  app_platform: string;
  feedback_message: string;
  app_version: string;
}

export interface FileUploadRequest extends FastifyRequest {
  file: () => Promise<MultipartFile>;
  query: QueryParams;
}
