import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { IsAdmin } from './is-admin.guard';

describe('IsAdmin', () => {
  let isAdminGuard: IsAdmin;

  const accessTokenWithAdminRole =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkI1QjJuUm9CSTF4cUxnSHJIVHA3WCJ9.eyJodHRwczovL2FwaS5mb2N1c2JlYXIuaW8vcm9sZXMiOlsiQURNSU4iXSwiaHR0cHM6Ly9leXN0LWJhY2tlbmQtcHJvZC04dGgzLm9ucmVuZGVyLmNvbS91c2VyIjp7ImlkIjoiM2Y2YjVhNWEtYTQ1ZC00ODA2LWI0YWUtMmJmYWMzZTM4ZjE0Iiwic3RyaXBlQ3VzdG9tZXJJZCI6ImN1c19NTkRRQk9PVlJoSkwxSSIsInN1YnNjcmlwdGlvblN0YXR1cyI6eyJhY3RpdmVFbnRpdGxlbWVudHMiOlsicGVyc29uYWwiXSwiZXhwaXJhdGlvbnMiOnsicGVyc29uYWwiOnsiZGF5c19sZWZ0IjoyMywiZXhwaXJlc19kYXRlIjoiMjAyMy0wMS0wNlQwMjo1OTowMFoiLCJwdXJjaGFzZV9kYXRlIjoiMjAyMi0xMi0wNlQwMjo1OTowMFoifX0sImhhc0FjdGl2ZVN1YnNjcmlwdGlvbiI6dHJ1ZX19LCJpc3MiOiJodHRwczovL2F1dGguZm9jdXNiZWFyLmlvLyIsInN1YiI6ImF1dGgwfDYzMDViZDVlZjI0YjU5MTVlZGRiYzc5NyIsImF1ZCI6WyJodHRwczovL2F1dGguZm9jdXNiZWFyLmlvL2FwaS92Mi8iLCJodHRwczovL2Rldi0yaGlkcjhhZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNjcxMDIzODYwLCJleHAiOjE2NzEyODMwNjAsImF6cCI6InM3eGxvRWxjb252UlFCT25DZUJOZllHZm9XNFIxZGJWIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsInBlcm1pc3Npb25zIjpbXX0.X0gnyliZThxY3z42wohCze9st8ZKiIUZTU9Ls3cHXzVHhlE4G_ZsklaB-pXvH7Jc7Jhy232V-rgkejsEtyNFoszd9QA07QcfX-RCb1ZahPNopKnWSnPHeXNkdcQ88etduVhzgHE6v1HCdgpHaXHuaN7zewlb7dHPdyJZVJDaY-fg8g2ba92fKrYX6bgyKqfisCqorA9b-kvwJhPV3PEFg8pvIi43C4zmf9mWdbAgI5yWYieDZVTsmyNDMgF5cf7pR7VoInKNBunh36ni6hPdG3zvfnV0YBrvtTuXDPAOLl3NaQfQ1FUFTN4hEimBAN8Ej8WmPyzxzuXrXXKh3xcegA';
  const accessTokenWithoutAdminRole =
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkI1QjJuUm9CSTF4cUxnSHJIVHA3WCJ9.eyJodHRwczovL2FwaS5mb2N1c2JlYXIuaW8vcm9sZXMiOltdLCJodHRwczovL2V5c3QtYmFja2VuZC1wcm9kLTh0aDMub25yZW5kZXIuY29tL3VzZXIiOnsiaWQiOiIwNTgwOTU1Mi1mYmZmLTRkZWEtYWNhMC05M2Y1ZDcwN2FjMjIiLCJzdHJpcGVDdXN0b21lcklkIjoiY3VzX011ekYyejhqUlRMclR3Iiwic3Vic2NyaXB0aW9uU3RhdHVzIjp7ImFjdGl2ZUVudGl0bGVtZW50cyI6WyJ0cmlhbCJdLCJleHBpcmF0aW9ucyI6eyJ0cmlhbCI6eyJkYXlzX2xlZnQiOjIxLCJleHBpcmVzX2RhdGUiOiIyMDIzLTAxLTA0VDAzOjU0OjE2WiIsInB1cmNoYXNlX2RhdGUiOiIyMDIyLTEyLTA0VDAzOjU0OjE2WiJ9fSwiaGFzQWN0aXZlU3Vic2NyaXB0aW9uIjp0cnVlfX0sImlzcyI6Imh0dHBzOi8vYXV0aC5mb2N1c2JlYXIuaW8vIiwic3ViIjoiYXV0aDB8NjM4YzE5ZTVkMDM3NTVjMzgzNTMwNTk2IiwiYXVkIjpbImh0dHBzOi8vYXV0aC5mb2N1c2JlYXIuaW8vYXBpL3YyLyIsImh0dHBzOi8vZGV2LTJoaWRyOGFkLnVzLmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE2NzEwMjYyMTAsImV4cCI6MTY3MTI4NTQxMCwiYXpwIjoiczd4bG9FbGNvbnZSUUJPbkNlQk5mWUdmb1c0UjFkYlYiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG9mZmxpbmVfYWNjZXNzIiwicGVybWlzc2lvbnMiOltdfQ.aY7zmxHfmJXnpC_Ot_QIgwMf2J3eg8X2-Y-3qjO6t4hTVVaad7kQ2Qdjt6aIKDGdCD0vVKHqho7_Nan69D7hwLKuIj8tQGqQMiqMPYkyjGweLEfH4P2YkGH3vSq6MstHoalC0Y3Z-LXgv5IqI9DJp7tF023B6EcF42w-__EpiwceLvwToHRzlnV2hwy1OLiVQvp8pI7O3Tms9zcB_AYcMf2oHw5SJsCWvWHMD1jShNhHsizE_w3zisFO2A10Hb2MAXrpnhXrCbf4xsSG5mYkzizVqtYJfS3PBXSCbtEddGikdc0OBv-2FqpbtdQsOCMt-R-57D0KRG1n71pgKWxUmg';
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [IsAdmin],
    }).compile();

    isAdminGuard = moduleRef.get<IsAdmin>(IsAdmin);
  });

  it('should be defined', () => {
    expect(isAdminGuard).toBeDefined();
  });

  describe('canActivate', () => {
    it('negative: should return false value if the user does not have admin role', async () => {
      const request = {
        headers: {
          authorization: `Bearer ${accessTokenWithoutAdminRole}`,
        },
        raw: {
          passport: {
            isAuth: true,
          },
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      };

      const result = isAdminGuard.canActivate(context as unknown as ExecutionContext);

      expect(result).toBeFalse();
    });

    it('positive: should return true value if the user had admin role', async () => {
      const request = {
        headers: {
          authorization: `Bearer ${accessTokenWithAdminRole}`,
        },
        raw: {
          passport: {
            isAuth: true,
          },
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      };

      const result = isAdminGuard.canActivate(context as unknown as ExecutionContext);

      expect(result).toBeTrue();
    });

    it('negative: should throw UnauthorizedException when user is not authenticated', async () => {
      const request = {
        headers: {
          authorization: `Bearer ${accessTokenWithAdminRole}`,
        },
        raw: {
          passport: {
            isAuth: false,
          },
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      };

      expect(() => isAdminGuard.canActivate(context as unknown as ExecutionContext)).toThrow(
        'User must be authenticated before checking admin status',
      );
    });
  });
});
