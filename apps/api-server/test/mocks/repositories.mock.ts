export const BaseRepositoryMock = {
  orm: {
    find: jest.fn(),
    findOne: jest.fn(),
    // ... rest methods can be added on demand
  },
  create: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  upsertMany: jest.fn(),
};

export const UserRepositoryMock = { ...BaseRepositoryMock };

export const ActivitySequenceRepositoryMock = {
  findOneByTypeForUser: jest.fn(),
  ...BaseRepositoryMock,
};
