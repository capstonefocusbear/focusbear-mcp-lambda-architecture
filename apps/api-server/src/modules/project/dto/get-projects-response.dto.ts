import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/pagination/index.dto';
import { PaginationMetaDto } from '../../../shared/pagination/pagination-meta.dto';
import { ProjectResponseDto } from './project-response.dto';

export class GetProjectsResponseDto extends PaginationDto<ProjectResponseDto> {
  @ApiProperty({
    type: [ProjectResponseDto],
    deprecated: true,
    description: 'Deprecated alias for data',
  })
  readonly projects: ProjectResponseDto[];

  @ApiProperty({
    deprecated: true,
    description: 'Deprecated alias for meta.itemCount',
  })
  readonly total_count: number;

  constructor(data: ProjectResponseDto[], meta: PaginationMetaDto) {
    super(data, meta);
    this.projects = data;
    this.total_count = meta.itemCount;
  }
}
