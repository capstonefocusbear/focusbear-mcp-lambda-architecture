import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { UpsertTrackDto } from '../dto/upsert-track.dto';
import { Track } from '../entities/track.entity';
import { TracksService } from '../services/tracks.service';

@Controller('tracks')
@ApiTags('tracks')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  async getAllTracks(): Promise<Track[]> {
    return this.tracksService.getAllTracks();
  }

  @Put()
  @UseGuards(IsAdmin)
  async upsertTrack(@Body() track: UpsertTrackDto): Promise<Track> {
    return this.tracksService.upsertTrack(track);
  }
}
