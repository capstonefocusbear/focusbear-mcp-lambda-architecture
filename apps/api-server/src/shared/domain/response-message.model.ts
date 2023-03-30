import { ApiProperty } from '@nestjs/swagger';

export class ResponseMessage {
  constructor(message: string, success?: boolean, statusCode?: number) {
    this.message = message;
    this.success = success || true;
    this.timestamp = new Date();
    this.statusCode = statusCode;
  }

  @ApiProperty()
  message: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  statusCode?: number;
}
