import { Logger } from '@nestjs/common';
import { Auth0ManagementService, IAuth0Options } from '@app/auth0';
import { QueryRunner, Repository } from 'typeorm';
import { AppDataSource } from '../ormconfig';
import { TeamToMember } from '../src/modules/team/entities/team-to-member.entity';
import { User } from '../src/modules/user/entities/user.entity';

const BATCH_SIZE = 10;
const DELAY_MS = 100; // ~10 requests/second to stay within Auth0 Management API rate limits

type MemberBackfillRow = {
  id: string;
  member_id: string;
  auth0_id: string | null;
};

type BatchOutcome = 'success' | 'skipped' | 'error';

type BatchCounts = {
  successCount: number;
  skipCount: number;
  errorCount: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function buildAuth0Options(): IAuth0Options {
  return {
    clientId: getRequiredEnv('AUTH0_MANAGEMENT_CLIENT_ID'),
    clientSecret: getRequiredEnv('AUTH0_MANAGEMENT_CLIENT_SECRET'),
    domain: getRequiredEnv('AUTH0_DOMAIN'),
    connection: process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
    identifier: process.env.AUTH0_IDENTIFIER || '',
    actionSecret: process.env.AUTH0_ACTION_SECRET,
  };
}

function buildBatches(rows: MemberBackfillRow[]): MemberBackfillRow[][] {
  const batches: MemberBackfillRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }
  return batches;
}

class BackfillTeamMemberEmailNameScript {
  private readonly logger = new Logger(BackfillTeamMemberEmailNameScript.name);

  constructor(private readonly auth0Service: Auth0ManagementService) {}

  async run(queryRunner: QueryRunner): Promise<void> {
    const teamToMemberTable = queryRunner.manager.getRepository(TeamToMember).metadata.tableName;
    const usersTable = queryRunner.manager.getRepository(User).metadata.tableName;

    const incompleteMembers: MemberBackfillRow[] = await queryRunner.query(`
      SELECT ttm.id, ttm.member_id, u.auth0_id
      FROM ${teamToMemberTable} ttm
      JOIN ${usersTable} u ON u.id = ttm.member_id
      WHERE (ttm.email IS NULL OR ttm.first_name IS NULL OR ttm.last_name IS NULL)
        AND ttm.member_id IS NOT NULL
    `);

    if (incompleteMembers.length === 0) {
      this.logger.log('[BackfillTeamMemberEmailName] No incomplete team member records found. Nothing to do.');
      return;
    }

    this.logger.log(
      `[BackfillTeamMemberEmailName] Found ${incompleteMembers.length} team member(s) with missing email/name. Starting backfill...`,
    );

    const teamToMemberRepository = queryRunner.manager.getRepository(TeamToMember);
    const batches = buildBatches(incompleteMembers);
    const counts: BatchCounts = { successCount: 0, skipCount: 0, errorCount: 0 };

    for (const [batchIndex, batch] of batches.entries()) {
      const batchCounts = await this.processBatch(batch, teamToMemberRepository);
      counts.successCount += batchCounts.successCount;
      counts.skipCount += batchCounts.skipCount;
      counts.errorCount += batchCounts.errorCount;

      if (batchIndex < batches.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    this.logger.log(
      `[BackfillTeamMemberEmailName] Done. Success: ${counts.successCount}, Skipped: ${counts.skipCount}, Errors: ${counts.errorCount}`,
    );
  }

  private async processBatch(
    batch: MemberBackfillRow[],
    teamToMemberRepository: Repository<TeamToMember>,
  ): Promise<BatchCounts> {
    const results = await Promise.all(batch.map((member) => this.processMember(member, teamToMemberRepository)));

    return results.reduce(
      (counts, result) => {
        if (result === 'success') counts.successCount += 1;
        if (result === 'skipped') counts.skipCount += 1;
        if (result === 'error') counts.errorCount += 1;
        return counts;
      },
      { successCount: 0, skipCount: 0, errorCount: 0 },
    );
  }

  private async processMember(
    member: MemberBackfillRow,
    teamToMemberRepository: Repository<TeamToMember>,
  ): Promise<BatchOutcome> {
    try {
      if (!member.auth0_id) {
        this.logger.warn(
          `[BackfillTeamMemberEmailName] No auth0_id for member_id=${member.member_id} (team_to_member_id=${member.id}). Skipping.`,
        );
        return 'skipped';
      }

      const auth0User = await this.auth0Service.getAuth0User(member.auth0_id);
      if (!auth0User) {
        this.logger.warn(
          `[BackfillTeamMemberEmailName] Auth0 user not found for auth0_id=${member.auth0_id} (member_id=${member.member_id}). Skipping.`,
        );
        return 'skipped';
      }

      await teamToMemberRepository.save({
        id: member.id,
        email: auth0User.email ?? null,
        first_name: auth0User.given_name ?? null,
        last_name: auth0User.family_name ?? null,
      } as Partial<TeamToMember>);

      return 'success';
    } catch (error) {
      this.logger.error(
        `[BackfillTeamMemberEmailName] Failed to update member id=${member.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return 'error';
    }
  }
}

async function main(): Promise<void> {
  const auth0Service = new Auth0ManagementService(buildAuth0Options());

  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const script = new BackfillTeamMemberEmailNameScript(auth0Service);
    await script.run(queryRunner);
  } finally {
    await queryRunner.release();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  const logger = new Logger('BackfillTeamMemberEmailNameScript');
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Backfill failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
}
