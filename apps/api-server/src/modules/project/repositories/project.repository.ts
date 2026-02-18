import { Injectable } from '@nestjs/common';
import { Brackets, DataSource, IsNull } from 'typeorm';
import { BaseRepository } from '../../../shared/repositories/base-repository.repository';
import { Project } from '../entities/project.entity';
import { GetProjectsQueryDto } from '../dto/get-projects-query.dto';
import { PageOrder } from '../../../shared/domain/page-order.enum';
import { ProjectMember } from '../entities/project-member.entity';
import { ProjectMemberInvitationStatus } from '../domain/project-member-invitation-status.enum';

@Injectable()
export class ProjectRepository extends BaseRepository<Project> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource, Project);
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .where(
        new Brackets((qb) => {
          qb.where('project.owner_id = :userId', { userId }).orWhere(
            new Brackets((sqb) => {
              sqb
                .where('members.user_id = :userId', { userId })
                .andWhere('members.invitation_status = :status', { status: 'accepted' });
            }),
          );
        }),
      )
      .andWhere('project.deleted_at IS NULL')
      .orderBy('project.created_at', 'DESC')
      .getMany();
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    return this.orm.findOne({
      where: { id: projectId, deleted_at: IsNull() },
      relations: ['members', 'members.user', 'owner'],
    });
  }

  async getProjectWithTaskCount(projectId: string): Promise<(Project & { task_count: number }) | null> {
    const result = await this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('project.owner', 'owner')
      .loadRelationCountAndMap('project.task_count', 'project.tasks')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.deleted_at IS NULL')
      .getOne();

    return result as (Project & { task_count: number }) | null;
  }

  async softDelete(projectId: string): Promise<void> {
    await this.orm.update(projectId, { deleted_at: new Date() });
  }

  async getProjectsUserIsMemberOf(userId: string): Promise<Project[]> {
    return this.orm
      .createQueryBuilder('project')
      .innerJoin('project.members', 'members')
      .leftJoinAndSelect('project.members', 'allMembers')
      .where('members.user_id = :userId', { userId })
      .andWhere('members.invitation_status = :status', { status: 'accepted' })
      .andWhere('project.deleted_at IS NULL')
      .orderBy('project.created_at', 'DESC')
      .getMany();
  }

  async getProjectsUserOwns(userId: string): Promise<Project[]> {
    return this.orm.find({
      where: { owner_id: userId, deleted_at: IsNull() },
      relations: ['members'],
      order: { created_at: 'DESC' },
    });
  }

  async getAllUserProjects(userId: string, { order, take, skip }: GetProjectsQueryDto): Promise<[Project[], number]> {
    const query = this.orm
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'members')
      .where(
        new Brackets((qb) => {
          qb.where('project.owner_id = :userId', { userId }).orWhere((subQueryBuilder) => {
            const acceptedMembershipSubQuery = subQueryBuilder
              .subQuery()
              .select('1')
              .from(ProjectMember, 'project_member')
              .where('project_member.project_id = project.id')
              .andWhere('project_member.user_id = :userId')
              .andWhere('project_member.invitation_status = :acceptedStatus')
              .getQuery();

            return `EXISTS ${acceptedMembershipSubQuery}`;
          });
        }),
      )
      .andWhere('project.deleted_at IS NULL')
      .take(take)
      .skip(skip)
      .orderBy('project.created_at', order === PageOrder.ASC ? 'ASC' : 'DESC')
      .setParameter('acceptedStatus', ProjectMemberInvitationStatus.ACCEPTED);

    const [projects, total] = await query.getManyAndCount();
    return [projects, total];
  }
}
