import { IntegrationPlatforms } from 'apps/api-server/src/modules/platform-integrations/domain/integration-platforms.enum';
import { deserializedStandaloneActivitiesDummy } from '../dummies/habit-packs.dummies';

export const AuthServiceMock = {
  authenticate: jest.fn(),
};

export const EventsServiceMock = {
  getLastFiftyEvents: jest.fn(),
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
  getAuth0UsersWithEmail: jest.fn(),
  deleteAuth0User: jest.fn(),
  getDeviceCredentials: jest.fn(),
  resendEmailVerification: jest.fn(),
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
  updateDeviceAppVersion: jest.fn(),
  parseDeviceFromAuth0Client: jest.fn(),
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
  getRoutinesProgress: jest.fn(),
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
  deleteUserFromRevenueCat: jest.fn(),
  getSubscriberFromRevenueCat: jest.fn(),
  updateEntitlementExpiry: jest.fn(),
};

export const UserSettingsServiceMock = {
  getOrCreateSubscriber: jest.fn(),
  updateSettings: jest.fn(),
  getSettings: jest.fn(),
  updateUserTimezoneAndLanguage: jest.fn(),
  addActivityToRoutine: jest.fn(),
};

export const JwtServiceMock = {
  asyncSign: jest.fn(),
  asyncVerify: jest.fn(),
  sign: jest.fn(),
  signAsync: jest.fn(),
  verify: jest.fn(),
  verifyAsync: jest.fn(),
};

export const SendGridServiceMock = {
  sendEmail: jest.fn(),
};

export const StripeServiceMock = {
  registerNewCustomer: jest.fn(),
  getStripeCustomerId: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  deleteStripeCustomer: jest.fn(),
  subscriptions: {
    list: jest.fn(),
  },
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
  deleteContactFromBrevo: jest.fn(),
};

export const SentryServiceMock = {
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  instance: () => SentryServiceMock,
  captureEvent: jest.fn(),
};

export const FocusModeServiceMock = {
  create: jest.fn(),
  saveFocusModeTags: jest.fn(),
  createFocusMode: jest.fn(),
};

export const R2ServiceMock = {
  getPresignedUrl: jest.fn(),
  getJsonFromBucket: jest.fn(),
  addObjectToBucket: jest.fn(),
};

export const UserDailyStatsServiceMock = {
  updateUserOnboardingProgress: jest.fn(),
  updateDailyStatsFocusModesCompleted: jest.fn(),
  updateDailyStatsRoutineCompletion: jest.fn(),
  updateDistractionBlockCount: jest.fn(),
  updateTimeSpentInBreaks: jest.fn(),
  getLastNDaysDailyStats: jest.fn(),
};

export const OpenAIServiceMock = {
  createChatReply: jest.fn(),
  createMotivationalSummary: jest.fn(),
  streamChatReply: jest.fn(),
  checkIfUsernameIsValid: jest.fn(),
  convertBrainDumpToTasks: jest.fn(),
  checkIfUrlIsSafeToUse: jest.fn(),
  checkIfAppIsSafeToUse: jest.fn(),
  generateEmojiForActivity: jest.fn(),
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

export const ServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const IntegrationFactoryMock = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: jest.fn((platform: IntegrationPlatforms) => ServiceMock),
};

export const MondayAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  getMondayLoginUrl: jest.fn(),
};

export const MondayServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const AsanaAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  getMondayLoginUrl: jest.fn(),
  handleUnauthorizedError: jest.fn(),
};

export const AsanaServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const ClickUpAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  getLoginUrl: jest.fn(),
  handleUnauthorizedError: jest.fn(),
};

export const ClickUpServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(() => {}),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const JiraAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  getMondayLoginUrl: jest.fn(),
  handleUnauthorizedError: jest.fn(),
};

export const JiraServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const TrelloAuthServiceMock = {
  getUser: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  getMondayLoginUrl: jest.fn(),
};

export const TrelloServiceMock = {
  syncUserProjectsAndTasks: jest.fn(),
  getAllUserTasks: jest.fn(),
  getAllUserProjects: jest.fn(),
  syncProjectAndChildTasks: jest.fn(),
};

export const PlatformIntegrationsServiceMock = {
  getPlatformIntegrationData: jest.fn(),
  updatePlatformIntegration: jest.fn(),
  getUserSyncedPlatforms: jest.fn(),
  getAssigneeStatus: jest.fn(),
  updateAssigneeStatus: jest.fn(),
};

export const ToDoServiceMock = {
  logToDosTime: jest.fn(),
};

export const GoogleCalendarServiceMock = {
  getEvents: jest.fn(),
  getEvent: jest.fn(),
  updateEvents: jest.fn(),
  getAccounts: jest.fn(),
};

export const MicrosoftCalendarServiceMock = {
  getEvents: jest.fn(),
  getEvent: jest.fn(),
  updateEvents: jest.fn(),
  getAccounts: jest.fn(),
};

export const NotificationServiceMock = {
  updateOrCreateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn(),
};

export const CalendarServiceMock = {
  getCalendars: jest.fn(),
  updateCalendar: jest.fn(),
  updateCalendarStatus: jest.fn(),
  deleteCalendar: jest.fn(),
  getCalendarExcludedKeywords: jest.fn(),
  updateCalendarExcludedKeyword: jest.fn(),
  deleteCalendarExcludedKeyword: jest.fn(),
  getCalendarDatas: jest.fn(),
};

export const GoogleAuthServiceMock = {
  refreshToken: jest.fn(),
};

export const UserOnboardingServiceMock = {
  createOnboardingData: jest.fn(),
  getOnboardingProgress: jest.fn(),
};
