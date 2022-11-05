export const BaseRepositoryMock = {
  orm: {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    // ... rest methods can be added on demand
  },
  create: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  upsertMany: jest.fn(),
};

export const UserRepositoryMock = {
  ...BaseRepositoryMock,
  getUserSettings: jest.fn(),
  getUserDetails: jest.fn(),
  getUsersList: jest.fn(),
  getUserCurrentActivityProps: jest.fn(),
  consistentlyUpdateUserSettings: jest.fn(),
};

export const ActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByTypeForUser: jest.fn(),
  findOneByIdForUser: jest.fn(),
};

export const ActivityTemplateRepositoryMock = {
  ...BaseRepositoryMock,
  getActivityTemplateIds: jest.fn(),
};

export const CompletedActivityRepositoryMock = {
  ...BaseRepositoryMock,
  getAggregatedQuantityLogsPerDay: jest.fn(),
  findInSequenceAfterTime: jest.fn(),
  getTotalDurationsPerTimeRange: jest.fn(),
  getLogsByActivityInTimeRange: jest.fn(),
  getDaySummaryAVG: jest.fn(),
  getDaySummarySUM: jest.fn(),
  getDaySummaryDuration: jest.fn(),
};

export const DeviceRepositoryMock = {
  ...BaseRepositoryMock,
};

export const ActivityRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CompletedActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  getMostRecentCompletedTime: jest.fn(),
  getAggregatedDurationLogsPerDay: jest.fn(),
  getUncompletedSequenceLog: jest.fn(),
};

export const FocusModeRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByIdForUser: jest.fn(),
};

export const CompletedFocusBlockRepositoryMock = {
  ...BaseRepositoryMock,
  getLogsByUserInTimeRange: jest.fn(),
};

export const TeamRepositoryMock = {
  ...BaseRepositoryMock,
  findActiveTeamWithMembersByOwnerId: jest.fn(),
};

export const HabitPackRepositoryMock = {
  ...BaseRepositoryMock,
  getHabitPack: jest.fn(),
  getApprovedHabitPacks: jest.fn(),
  consistentlyUpdateHabitPack: jest.fn(),
  consistentlyInstallStandaloneHabitPack: jest.fn(),
  getUserInstalledPacks: jest.fn(),
};

export const InstalledPackRepositoryMock = {
  ...BaseRepositoryMock,
  fetchUserInstalledPackIds: jest.fn(),
};

export const NotificationRepositoryMock = {
  ...BaseRepositoryMock,
};
