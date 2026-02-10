import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { UserModule } from '../user/user.module';

@Module({
  providers: [ProjectService, ProjectRepository, ProjectMemberRepository],
  exports: [ProjectService, ProjectRepository, ProjectMemberRepository],
  imports: [forwardRef(() => UserModule)],
  controllers: [ProjectController],
})
export class ProjectModule {}
