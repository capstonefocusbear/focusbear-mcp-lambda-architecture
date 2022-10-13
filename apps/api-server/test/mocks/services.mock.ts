export const AuthServiceMock = {
  authenticate: jest.fn(),
};

export const Auth0AuthenticationServiceMock = {
  validateAccessToken: jest.fn(),
};

export const PusherBeamsAuthServiceMock = {
  getPusherBeamsToken: jest.fn(),
  unsubscribeFromBeams: jest.fn(),
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
  getOrCreateCompletingSequenceLog: jest.fn(),
};

export const PusherServiceMock = {
  trigger: jest.fn(),
};

export const PusherBeamsServiceMock = {
  generateToken: jest.fn(),
  deleteUser: jest.fn(),
  publishToUsers: jest.fn(),
  createBeamsPublishRequest: jest.fn(),
};

export const RevenueCatServiceMock = {
  getOrCreateSubscriber: jest.fn(),
  grantTeamMembershipe: jest.fn(),
  revokeTeamMembershipe: jest.fn(),
  grantTrialAccess: jest.fn(),
  checkSubscriptionStatus: jest.fn(),
};

export const UserSettingsServiceMock = {
  getOrCreateSubscriber: jest.fn(),
  updateSettings: jest.fn(),
};

export const JwtServiceMock = {
  asyncSign: jest.fn(),
  asyncVerify: jest.fn(),
};

export const SendGridServiceMock = {
  sendEmail: jest.fn(),
};

export const StripeServiceMock = {
  registerNewCustomer: jest.fn(),
};
