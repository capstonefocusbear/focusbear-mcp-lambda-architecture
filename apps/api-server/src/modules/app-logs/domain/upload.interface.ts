import { FastifyRequest } from 'fastify';

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  file: any;
  filename: string;
  mimetype: string;
}

interface QueryParams {
  app_platform: string;
  feedback_message: string;
  app_version: string;
}

export interface FileUploadRequest extends FastifyRequest {
  file: () => Promise<MultipartFile>;
  query: QueryParams;
}
