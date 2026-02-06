export const BaseRepositoryMock = {
  orm: {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    findOneBy: jest.fn(),
    insert: jest.fn(),
    create: jest.fn(),
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
  getUserSummary: jest.fn(),
  getUsersList: jest.fn(),
  getUserCurrentActivityProps: jest.fn(),
  consistentlyUpdateUserSettings: jest.fn(),
  getUserForAdmin: jest.fn(),
  getLeaderboardRankingsByStreakType: jest.fn(),
  getUserLeaderboardRank: jest.fn(),
};

export const UserConsentRepositoryMock = {
  ...BaseRepositoryMock,
};

export const SavedWebsiteRepositoryMock = {
  ...BaseRepositoryMock,
};

export const PlatformIntegrationsRepositoryMock = {
  ...BaseRepositoryMock,
};

export const ActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByTypeForUser: jest.fn(),
  findOneByIdForUser: jest.fn(),
};

export const GeofenceRepositoryMock = {
  ...BaseRepositoryMock,
  findByUserId: jest.fn(),
  findByIdAndUserId: jest.fn(),
};

export const ActivityTemplateRepositoryMock = {
  ...BaseRepositoryMock,
  getActivityTemplateIds: jest.fn(),
  consistentlyUpdateLibraryActivities: jest.fn(),
  getActivityTemplatesWithGoalsMatched: jest.fn(),
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
  getWeekSummary: jest.fn(),
  getNotes: jest.fn(),
  upsertActivity: jest.fn(),
};

export const DeviceRepositoryMock = {
  ...BaseRepositoryMock,
  syncDevicesFromAuth0: jest.fn(),
};

export const ActivityRepositoryMock = {
  ...BaseRepositoryMock,
  getActivitiesForAdmin: jest.fn(),
};

export const LogQuantityAnswersRepositoryMock = {
  ...BaseRepositoryMock,
  getAggregatedQuantityLogsPerDay: jest.fn(),
  getAnswersByQuestionIdsInTimeRange: jest.fn(),
};

export const LogQuantityQuestionsRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CompletedActivitySequenceRepositoryMock = {
  ...BaseRepositoryMock,
  getMostRecentCompletedTime: jest.fn(),
  getAggregatedDurationLogsPerDay: jest.fn(),
  getUncompletedSequenceLog: jest.fn(),
  getSequenceLogByDate: jest.fn(),
  getTodayCompletedSequences: jest.fn(),
  getTodaySequences: jest.fn(),
};

export const AdminAccessRequestRepositoryMock = {
  ...BaseRepositoryMock,
};

export const FocusModeRepositoryMock = {
  ...BaseRepositoryMock,
  findOneByIdForUser: jest.fn(),
};

export const InstalledFocusModeTemplatesRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CompletedFocusBlockRepositoryMock = {
  ...BaseRepositoryMock,
  getLogsByUserInTimeRange: jest.fn(),
  getFocusBlockLogsForTimeRange: jest.fn(),
};

export const TeamRepositoryMock = {
  ...BaseRepositoryMock,
  getTeamMembers: jest.fn(),
  getTeamIncludingUnregistered: jest.fn(),
  getTeamMembersIncludingUnregistered: jest.fn(),
};

export const TeamToMemberRepositoryMock = {
  ...BaseRepositoryMock,
};

export const TeamToAdminRepositoryMock = {
  ...BaseRepositoryMock,
  getTeamAdmins: jest.fn(),
};

export const TeamJoinCodeRepositoryMock = {
  ...BaseRepositoryMock,
};

export const HabitPackRepositoryMock = {
  ...BaseRepositoryMock,
  getHabitPack: jest.fn(),
  fetchPacksByFilter: jest.fn(),
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

export const VideoMetadataRepositoryMock = {
  ...BaseRepositoryMock,
  fetchVideoIds: jest.fn(),
};

export const TracksRepositoryMock = {
  ...BaseRepositoryMock,
};

export const ToDoRepositoryMock = {
  ...BaseRepositoryMock,
  getUserToDos: jest.fn(),
  searchUserToDos: jest.fn(),
  getUserRecentToDos: jest.fn(),
  addCachedStatusesToToDos: jest.fn(),
  addProjectStatusesToToDos: jest.fn(),
};

export const TaskTimeLogsRepositoryMock = {
  ...BaseRepositoryMock,
};

export const FocusModeTemplatesRepositoryMock = {
  ...BaseRepositoryMock,
  fetchTemplatesByFilter: jest.fn(),
};

export const CoursesRepositoryMock = {
  getAllAuthorCourses: jest.fn(),
  getAllEnrolledCourses: jest.fn(),
  getRatings: jest.fn(),
  createCourseContent: jest.fn(),
  createRatingContent: jest.fn(),
  createEnrolmentContent: jest.fn(),
  updateCourseContent: jest.fn(),
  updateCourseDeleted: jest.fn(),
  updateCourseHidden: jest.fn(),
  updateEnrolmentStatus: jest.fn(),
  findUserById: jest.fn(),
  findCourseById: jest.fn(),
  findEnrolmentByUserAndCourse: jest.fn(),
  findRatingByUserAndCourse: jest.fn(),
  getAllCourses: jest.fn(),
  getUserNotEnrolledCourses: jest.fn(),
  getUserCreatedTutorials: jest.fn(),
  getCourseDetails: jest.fn(),
  getPlatformCourses: jest.fn(),
};

export const LessonsRepositoryMock = {
  getCourseLessons: jest.fn(),
  getLessonRatings: jest.fn(),
  createCourseLessons: jest.fn(),
  createLessonRating: jest.fn(),
  createLessonCompletion: jest.fn(),
  updateCourseLessons: jest.fn(),
  checkForeignKeyCourseIdExist: jest.fn(),
  checkForeignKeyLessonIdExist: jest.fn(),
  checkUserCourseEnrolment: jest.fn(),
  upsertCourseLessons: jest.fn(),
  deleteCourseLesson: jest.fn(),
};

export const DailyStatsRepositoryMock = {
  ...BaseRepositoryMock,
  getUserDailyStats: jest.fn(),
};

export const FocusModeTagRepositoryMock = {
  ...BaseRepositoryMock,
};

export const EventsRepositoryMock = {
  ...BaseRepositoryMock,
};

export const TrackEventRepositoryMock = {
  ...BaseRepositoryMock,
};

export const UserFeedbackRepositoryMock = {
  ...BaseRepositoryMock,
};

export const SyncedProjectsRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CalendarRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CalendarExcluededKeywordRepositoryMock = {
  ...BaseRepositoryMock,
};

export const CalendarServiceFactoryMock = {
  get: jest.fn(),
};

export const SurveyRepositoryMock = {
  ...BaseRepositoryMock,
  createSurvey: jest.fn(),
  getUserSurvey: jest.fn(),
  getSurvey: jest.fn(),
  updateSurvey: jest.fn(),
  getUserUnansweredSurveys: jest.fn(),
  getUserSurveys: jest.fn(),
  getSurveys: jest.fn(),
};

export const SurveyAnswerRepositoryMock = {
  ...BaseRepositoryMock,
  createSurveyAnswer: jest.fn(),
  getSurveyAnswer: jest.fn(),
  updateSurveyAnswerCompletion: jest.fn(),
};

export const SurveyAnswerMetadataRepositoryMock = {
  ...BaseRepositoryMock,
  createSurveyAnswerMetadata: jest.fn(),
};

export const CustomRoutineRepositoryMock = {
  ...BaseRepositoryMock,
  getUserCustomRoutines: jest.fn(),
  getCustomRoutine: jest.fn(),
};

export const UserOnboardingRepositoryMock = {
  ...BaseRepositoryMock,
  findByUserIdAndOs: jest.fn(),
};
export const AppVersionsRepositoryMock = {
  ...BaseRepositoryMock,
  findLatest: jest.fn(),
  findMinSupported: jest.fn(),
  findAllByOS: jest.fn(),
  createVersion: jest.fn(),
};

export const AnnouncementsRepositoryMock = {
  ...BaseRepositoryMock,
  findById: jest.fn(),
  findActiveAnnouncements: jest.fn(),
};

export const AnnouncementViewsRepositoryMock = {
  ...BaseRepositoryMock,
  recordView: jest.fn(),
  findViewedAnnouncementIds: jest.fn(),
};
