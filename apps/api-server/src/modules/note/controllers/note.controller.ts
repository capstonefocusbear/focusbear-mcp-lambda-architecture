import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { NoteService } from '../services/note.service';
import { CreateNoteDto } from '../dto/create-note.dto';
import { GetNotesQueryDto } from '../dto/get-notes-query.dto';
import { DeleteNoteQueryDto } from '../dto/delete-note-query.dto';
import { SearchNotesDto } from '../dto/search-notes.dto';

@Controller('note')
@ApiTags('note')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Put()
  @ApiOperation({ summary: 'Create or update a note' })
  async upsertNote(@Body() createNoteDto: CreateNoteDto, @AuthContext() { user }: Passport) {
    return this.noteService.upsertNote(user.id, createNoteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated notes for the current user' })
  async getUserNotes(@Query() queryDto: GetNotesQueryDto, @AuthContext() { user }: Passport) {
    return this.noteService.getNotes(user.id, queryDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search notes for the current user' })
  async searchNotes(@Query() searchDto: SearchNotesDto, @AuthContext() { user }: Passport) {
    return this.noteService.searchNotes(user.id, searchDto);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all note tags for the current user' })
  async getUserTags(@AuthContext() { user }: Passport) {
    return this.noteService.getUserTags(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a note by id for the current user' })
  async getNoteById(@Param('id') noteId: string, @AuthContext() { user }: Passport) {
    return this.noteService.getNoteById(user.id, noteId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a note for the current user' })
  async deleteNote(@Query() query: DeleteNoteQueryDto, @AuthContext() { user }: Passport) {
    return this.noteService.deleteNote(user.id, query.note_id);
  }
}
