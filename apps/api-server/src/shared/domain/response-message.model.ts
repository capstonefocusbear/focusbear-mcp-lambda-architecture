import { ApiProperty } from '@nestjs/swagger';

export class ResponseMessage {
  constructor(message: string, success?: boolean) {
    this.message = message;
    this.success = success || true;
    this.timestamp = new Date();
  }

  @ApiProperty()
  message: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty()
  timestamp: Date;
}
