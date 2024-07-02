import { IsNotEmpty, IsString } from 'class-validator';

export class ConvertBrainDump {
  @IsNotEmpty()
  @IsString()
  contents: string;
}
