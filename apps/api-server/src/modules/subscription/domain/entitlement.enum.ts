export enum Entitlement {
  trial = 'trial', // individual access, granted right after signup
  personal = 'personal', // individual access, purchased by user
  team_admin = 'team_admin',
  team_member = 'team_member', // individual access, granted by team owner and valid until the team subscription expired
  team_owner = 'team_owner', // team management (ownership) access, purchased by team owner
  team_size_5 = 'team_size_5', // purchased team size limit
  team_size_10 = 'team_size_10', // purchased team size limit
  team_size_15 = 'team_size_15', // purchased team size limit
}
