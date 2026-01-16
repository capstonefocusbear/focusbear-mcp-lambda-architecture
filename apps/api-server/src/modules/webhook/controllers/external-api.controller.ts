import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { ApiKeyUser, ApiKeyUserContext } from '../decorators/api-key-user.decorator';
import { ToDoService } from '../../to-do/services/to-do.service';
import { UserDailyStatsService } from '../../user/services/user-daily-stats/user-daily-stats.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { CreateToDoDto } from '../../to-do/dto/create-to-do.dto';
import { GetToDosQueryDto } from '../../to-do/dto/get-to-dos-query.dto';

@Controller('external/v1')
@UseGuards(ApiKeyAuthGuard)
@ApiTags('External API (Zapier/n8n)')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API key for authentication',
  required: true,
})
export class ExternalApiController {
  constructor(
    private readonly toDoService: ToDoService,
    private readonly userDailyStatsService: UserDailyStatsService,
    private readonly userRepository: UserRepository,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  async getCurrentUser(@ApiKeyUser() user: ApiKeyUserContext) {
    const userData = await this.userRepository.orm.findOne({
      where: { id: user.id },
      select: [
        'id',
        'username',
        'timezone',
        'morning_routines_streak',
        'evening_routines_streak',
        'focus_modes_streak',
        'micro_breaks_streak',
        'created_at',
      ],
    });

    return {
      id: userData.id,
      username: userData.username,
      timezone: userData.timezone,
      streaks: {
        morning_routines: userData.morning_routines_streak,
        evening_routines: userData.evening_routines_streak,
        focus_modes: userData.focus_modes_streak,
        micro_breaks: userData.micro_breaks_streak,
      },
      created_at: userData.created_at,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user daily stats' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
  async getUserStats(@ApiKeyUser() user: ApiKeyUserContext, @Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const userData = await this.userRepository.orm.findOne({
      where: { id: user.id },
      select: ['timezone'],
    });

    const stats = await this.userDailyStatsService.getDailyStats(user.id, targetDate, userData.timezone);

    return stats;
  }

  @Get('todos')
  @ApiOperation({ summary: 'Get user todos' })
  @ApiResponse({ status: 200, description: 'Todos retrieved successfully' })
  async getTodos(@ApiKeyUser() user: ApiKeyUserContext, @Query() query: GetToDosQueryDto) {
    return this.toDoService.getToDos(user.id, query);
  }

  @Post('todos')
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiResponse({ status: 201, description: 'Todo created successfully' })
  async createTodo(@ApiKeyUser() user: ApiKeyUserContext, @Body() createToDoDto: CreateToDoDto) {
    return this.toDoService.upsertToDo(user.id, createToDoDto);
  }

  @Get('streaks')
  @ApiOperation({ summary: 'Get user streaks' })
  @ApiResponse({ status: 200, description: 'Streaks retrieved successfully' })
  async getStreaks(@ApiKeyUser() user: ApiKeyUserContext) {
    const userData = await this.userRepository.orm.findOne({
      where: { id: user.id },
      select: ['morning_routines_streak', 'evening_routines_streak', 'focus_modes_streak', 'micro_breaks_streak'],
    });

    return {
      morning_routines: userData.morning_routines_streak,
      evening_routines: userData.evening_routines_streak,
      focus_modes: userData.focus_modes_streak,
      micro_breaks: userData.micro_breaks_streak,
    };
  }
}
