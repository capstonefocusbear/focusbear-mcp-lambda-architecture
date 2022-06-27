export const BaseRepositoryMock = {
  orm: {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
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
};

export const ActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByTypeForUser: jest.fn(),
  findOneByIdForUser: jest.fn(),
};

export const CompletedActivityRepositoryMock = {
  ...BaseRepositoryMock,
  getAggregatedQuantityLogsPerDay: jest.fn(),
  findInSequenceAfterTime: jest.fn(),
  getTotalDurationsPerTimeRange: jest.fn(),
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
};

export const FocusModeRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByIdForUser: jest.fn(),
};

export const CompletedFocusBlockRepositoryMock = {
  ...BaseRepositoryMock,
};
