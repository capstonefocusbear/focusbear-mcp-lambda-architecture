import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ActivityChoiceType } from './activity-choice-type.enum';
import { ActivityPriority } from './activity-priority.enum';
import { TakeNotesOptions } from './take-notes-options.enum';

export class ActivityData {
  constructor(data: Partial<ActivityData> = {}) {
    this.name = data.name;
    this.is_office_friendly = data?.is_office_friendly;
    this.allowed_focus_mode_id = data?.allowed_focus_mode_id;
    this.video_urls = data?.video_urls;
    this.allowed_apps = data?.allowed_apps;
    this.include_in_every_break = data?.include_in_every_break;
    this.log_quantity_question = data?.log_quantity_question;
    this.choice_type = data?.choice_type;
    this.allowed_urls = data?.allowed_urls;
    this.take_notes = data?.take_notes;
    this.category = data?.category;
    this.text_instructions = data?.text_instructions;
    this.image_urls = data?.image_urls;
    this.activity_priority = data?.activity_priority;
  }

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  is_office_friendly?: boolean;

  @IsEnum(TakeNotesOptions)
  @IsOptional()
  @ApiProperty({ enum: TakeNotesOptions })
  take_notes?: TakeNotesOptions;

  @IsEnum(ActivityPriority)
  @IsOptional()
  @ApiProperty({ enum: ActivityPriority })
  activity_priority?: ActivityPriority;

  @IsUUID('4')
  @IsOptional()
  @ApiProperty()
  allowed_focus_mode_id?: string;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.video_urls?.length > 0)
  @IsString({ each: true })
  // @IsUrl({}, { each: true })
  @ApiProperty()
  video_urls?: string[];

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  include_in_every_break?: boolean;

  @IsString()
  @IsOptional()
  // @ValidateIf((o) => !!o.log_quantity)
  // @IsNotEmpty()
  @ApiProperty()
  log_quantity_question?: string;

  @IsEnum(ActivityChoiceType)
  @IsIn(Object.values(ActivityChoiceType))
  @IsOptional()
  @ApiProperty({ enum: ActivityChoiceType })
  choice_type?: ActivityChoiceType;

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_apps?.length > 0)
  @IsString({ each: true })
  @ApiProperty()
  allowed_apps?: string[];

  @IsArray()
  @IsOptional()
  @ValidateIf((o) => o.allowed_urls?.length > 0)
  @IsString({ each: true })
  // @IsUrl({}, { each: true })
  @ApiProperty()
  allowed_urls?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  text_instructions?: string;

  @IsOptional()
  @IsArray()
  image_urls?: string[];
}
