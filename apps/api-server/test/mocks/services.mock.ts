import { deserializedStandaloneActivitiesDummy } from '../dummies/habit-packs.dummies';

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

export const PusherBeamsServiceMock = {
  generateToken: jest.fn(),
  deleteUser: jest.fn(),
  publishToUsers: jest.fn(),
  createBeamsPublishRequest: jest.fn(),
};

export const ActivityParserServiceMock = {
  serialize: jest.fn(),
  deserialize: jest.fn(),
  calculateSequenceDuration: jest.fn(),
};

export const ConfigServiceMock = {
  get: jest.fn(),
};

export const Auth0ManagementServiceMock = {
  getUser: jest.fn(),
  getAuth0User: jest.fn(),
  getAuth0UserWithEmail: jest.fn(),
};

export const UserServiceMock = {
  getUserLocalDeviceSettings: jest.fn(),
  consistentlyUpdateUserSettings: jest.fn(),
  isVerboseLoggingAllowed: jest.fn(),
  // rest can be added if needed
};

export const DeviceServiceMock = {
  markAsLeader: jest.fn(),
  getUserInstalledDevices: jest.fn(),
};

export const ActivitySequenceServiceMock = {
  getUserRoutineDailyDurations: jest.fn(),
  sortActivityIdsByExecutionSequence: jest.fn(),
  filterActivitiesForCurrentDay: jest.fn(),
};

export const CompletedActivityServiceMock = {
  recalculateCurrentActivity: jest.fn(),
  getCurrentSequenceCompletedActivityIds: jest.fn(),
};

export const CompletedActivitySequenceServiceMock = {
  completeActivitySequence: jest.fn(),
  getOrCreateCompletingSequenceLog: jest.fn(),
  forceCompleteCurrentSequence: jest.fn(),
  getOrCreateCompletingSequenceLogForSyncing: jest.fn(),
  completeActivitySequenceByDate: jest.fn(),
  getUserTimes: jest.fn(),
  nullifyUserCurrentActivityProps: jest.fn(),
};

export const PusherServiceMock = {
  trigger: jest.fn(),
};

export const RevenueCatServiceMock = {
  getOrCreateSubscriber: jest.fn(),
  grantTeamMembership: jest.fn(),
  revokeTeamMembership: jest.fn(),
  grantTrialAccess: jest.fn(),
  checkSubscriptionStatus: jest.fn(),
};

export const UserSettingsServiceMock = {
  getOrCreateSubscriber: jest.fn(),
  updateSettings: jest.fn(),
  getSettings: jest.fn(),
  clearUserActivities: jest.fn(),
  updateUserTimezoneAndLanguage: jest.fn(),
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
  getStripeCustomerId: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
};

export const ActivityTemplateServiceMock = {
  bulkDeleteActivityTemplates: jest.fn(),
};

export const ActivityTemplateParserServiceMock = {
  deserializeStandaloneActivities: jest.fn(),
  deserializeRoutineActivities: jest.fn(),
  deserializeLibraryActivities: jest.fn(() => deserializedStandaloneActivitiesDummy[0]),
  createActivityTemplate: jest.fn(),
  deserializeActivityTemplateChoices: jest.fn(),
  serialize: jest.fn(),
  serializeLibraryActivities: jest.fn(),
};

export const HabitPackServiceMock = {
  deleteHabitPack: jest.fn(),
  upsertHabitPack: jest.fn(),
  getMultipleHabitPacks: jest.fn(),
  serializeHabitPack: jest.fn(),
  getHabitPack: jest.fn(),
  checkIfPackExists: jest.fn(),
};

export const HabitPackManagerServiceMock = {
  installHabitPack: jest.fn(),
  convertActivityTemplatesToUpdateActivityDtos: jest.fn(),
  uninstallHabitPack: jest.fn(),
};

export const InstalledPackServiceMock = {
  setPackAsInstalledForUser: jest.fn(),
  setPackAsUninstalledForUser: jest.fn(),
};

export const BrevoServiceMock = {
  registerBrevoEvent: jest.fn(),
};

const mockSentryInstance = {
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
};

export const SentryServiceMock = {
  instance: () => mockSentryInstance,
};

export const FocusModeServiceMock = {
  create: jest.fn(),
  saveFocusModeTags: jest.fn(),
};

export const R2ServiceMock = {
  getPresignedUrl: jest.fn(),
};

export const UserDailyStatsServiceMock = {
  updateUserOnboardingProgress: jest.fn(),
  updateDailyStatsFocusModesCompleted: jest.fn(),
  updateDailyStatsRoutineCompletion: jest.fn(),
  updateDistractionBlockCount: jest.fn(),
  updateTimeSpentInBreaks: jest.fn(),
};

export const OpenAIServiceMock = {
  createChatReply: jest.fn(),
  createMotivationalSummary: jest.fn(),
  streamChatReply: jest.fn(),
  checkIfUsernameIsValid: jest.fn(),
};

export const ZohoAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  refreshToken: jest.fn(),
  getZohoLoginUrl: jest.fn(),
};

export const ZohoServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const PlatformIntegrationsServiceMock = {
  getPlatformIntegrationData: jest.fn(),
  updatePlatformIntegration: jest.fn(),
  getUserSyncedPlatforms: jest.fn(),
};

export const ToDoServiceMock = {
  logToDosTime: jest.fn(),
};
