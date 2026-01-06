import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UserGoalDto, UserGoalInput } from './user-goal.dto';

export type GetRoutineSuggestionsInput = Omit<GetRoutineSuggestionsDto, 'user_goals'> & {
  user_goals: UserGoalInput[];
};

export class GetRoutineSuggestionsDto {
  @Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return { goal: item.trim(), isCustom: false };
        }
        if (item && typeof item === 'object') {
          return {
            goal: typeof (item as any).goal === 'string' ? String((item as any).goal).trim() : '',
            isCustom: (item as any).isCustom === true,
          };
        }
        return { goal: '', isCustom: false };
      })
      .filter((item) => item.goal.length > 0);
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserGoalDto)
  user_goals: UserGoalDto[];

  @IsNotEmpty()
  @IsNumber()
  routine_duration: number;

  @IsOptional()
  @IsString()
  routine?: string;

  @IsOptional()
  @IsBoolean()
  groupByGoals?: boolean;
}
