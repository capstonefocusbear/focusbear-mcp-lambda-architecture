// Test constants representing IDs for a user, activity sequences, individual activities, and a device,
// used in unit or integration tests to simulate real data scenarios.
export const TEST_USER_ID = '2636a216-f363-493e-aeb8-d275a0a9016d';
export const LEGACY_TEST_USER_AUTH0_ID = 'auth0|643ca25c983376898fcd5028';
export const TEST_MORNING_ACTIVITY_SEQUENCE_ID = '114100c9-5326-4ff6-b18f-39b4a7c7f4ef';
export const TEST_EVENING_ACTIVITY_SEQUENCE_ID = 'd73a5642-e1b0-4782-a53d-5e8f65d618bd';
export const TEST_MORNING_ACTIVITY_ID = 'f3c02045-12ed-4029-b6c7-1ffa16c14fa9';
export const TEST_EVENING_ACTIVITY_ID = '15b87c8a-6a21-4a64-898e-def533eabcb9';
export const TEST_DEVICE_ID = '65cbbc6c-4f77-49c4-b761-f79e2608775e';
export const TEST_COMPLETED_ACTIVITY_ID = 'a7e6f2e9-d783-4443-864e-22071b853700';
export const TEST_Tags = ['Build healthy habits', 'Stay focused at work', 'Sleep better'];

export const getTestUserAuth0Id = (): string => {
  const auth0TestUserId = process.env.AUTH0_TEST_USER_ID?.trim();
  return auth0TestUserId || LEGACY_TEST_USER_AUTH0_ID;
};
