export const BaseRepositoryMock = {
  orm: {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
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
};

export const ActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByTypeForUser: jest.fn(),
};

export const CompletedActivityRepositoryMock = {
  ...BaseRepositoryMock,
  getAggregatedQuantityLogsPerDay: jest.fn(),
};

export const DeviceRepositoryMock = {
  ...BaseRepositoryMock,
};

export const ActivityRepositoryMock = {
  ...BaseRepositoryMock,
};
