import { FastifyRequest } from 'fastify';

interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  file: any;
  filename: string;
  mimetype: string;
}

export interface FileUploadRequest extends FastifyRequest {
  file: () => Promise<MultipartFile>;
}
