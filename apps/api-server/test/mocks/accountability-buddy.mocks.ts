import { BaseRepositoryMock } from './repositories.mock';

export const AccountabilityBuddyRepositoryMock = {
  ...BaseRepositoryMock,
  findBuddiesByUserId: jest.fn(),
  findBuddyById: jest.fn(),
  findUserBuddy: jest.fn(),
  findBuddiesPendingInvitations: jest.fn(),
  deleteBuddyById: jest.fn(),
};

export const UnlockRequestRepositoryMock = {
  ...BaseRepositoryMock,
  findPendingByUserId: jest.fn(),
  findMostRecentByUserId: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findById: jest.fn(),
  findByIdAndUserId: jest.fn(),
  findByAccountabilityBuddyIds: jest.fn(),
  findByUserId: jest.fn(),
  findApprovedByUserId: jest.fn(),
};

export const AccountabilityTokenServiceMock = {
  generateInvitationToken: jest.fn(),
  verifyInvitationToken: jest.fn(),
  generateApprovalToken: jest.fn(),
  verifyApprovalToken: jest.fn(),
};

export const AccountabilityEmailServiceMock = {
  sendBuddyInvitationEmail: jest.fn(),
  sendUnlockRequestEmail: jest.fn(),
  sendUnlockRequestApprovedEmail: jest.fn(),
  getFrontendBaseUrl: jest.fn(),
};

export const AccountabilityNotificationServiceMock = {
  createBuddyInvitationNotification: jest.fn(),
  createInvitationAcceptedNotification: jest.fn(),
  createUnlockRequestNotification: jest.fn(),
  createUnlockRequestApprovedNotification: jest.fn(),
  createUnlockRequestRejectedNotification: jest.fn(),
};

export const AccountabilityBuddyServiceMock = {
  linkPendingInvitationsForNewUser: jest.fn(),
};
