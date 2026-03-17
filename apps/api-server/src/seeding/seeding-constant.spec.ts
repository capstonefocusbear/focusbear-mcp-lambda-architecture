import { getTestUserAuth0Id, LEGACY_TEST_USER_AUTH0_ID } from './seeding-constant';

describe('seeding constants', () => {
  const originalAuth0TestUserId = process.env.AUTH0_TEST_USER_ID;

  afterEach(() => {
    if (typeof originalAuth0TestUserId === 'undefined') {
      delete process.env.AUTH0_TEST_USER_ID;
      return;
    }

    process.env.AUTH0_TEST_USER_ID = originalAuth0TestUserId;
  });

  it('uses AUTH0_TEST_USER_ID when it is configured', () => {
    process.env.AUTH0_TEST_USER_ID = 'auth0|configured-test-user';

    expect(getTestUserAuth0Id()).toBe('auth0|configured-test-user');
  });

  it('falls back to the legacy seeded auth0_id when AUTH0_TEST_USER_ID is missing', () => {
    delete process.env.AUTH0_TEST_USER_ID;

    expect(getTestUserAuth0Id()).toBe(LEGACY_TEST_USER_AUTH0_ID);
  });

  it('falls back to the legacy seeded auth0_id when AUTH0_TEST_USER_ID is blank', () => {
    process.env.AUTH0_TEST_USER_ID = '   ';

    expect(getTestUserAuth0Id()).toBe(LEGACY_TEST_USER_AUTH0_ID);
  });
});
