export const AuthServiceMock = {
  authenticate: jest.fn(),
};

export const Auth0AuthenticationServiceMock = {
  validateAccessToken: jest.fn(),
};

export const ActivityParserServiceMock = {
  serialize: jest.fn(),
  deserialize: jest.fn(),
};

export const ConfigServiceMock = {
  get: jest.fn(),
};

export const Auth0ManagementServiceMock = {
  getUser: jest.fn(),
};

export const DeviceServiceMock = {
  markAsLeader: jest.fn(),
};

export const CompletedActivitySequenceServiceMock = {
  completeActivitySequence: jest.fn(),
};
