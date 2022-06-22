import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { auth0UserDummy, userDummy } from '../../../../../test/dummies ';
import { Auth0ManagementService } from '../../../../../../../libs/auth0/src';
import { Auth0ManagementServiceMock, UserRepositoryMock } from '../../../../../test/mocks';
import { SyncUserAccountDto } from '../../dto/sync-user-account.dto';
import { UserRepository } from '../../repositories/user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, UserService, Auth0ManagementService],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(Auth0ManagementService)
      .useValue(Auth0ManagementServiceMock)
      .compile();

    userService = moduleRef.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('syncUserAccount', () => {
    const syncAccountDto: SyncUserAccountDto = {
      auth0_id: 'dcidejd348ryhjeckwx3',
      email: 'some@gmail.com',
    };

    it('negative: if user account does not exist in Auth, throw the NotFoundException', async () => {
      Auth0ManagementServiceMock.getUser.mockResolvedValueOnce(undefined);
      const errorMessage = 'User does not exit in Auth0!';
      let exception: any;

      try {
        await userService.syncUserAccount(syncAccountDto);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: usert should be called', async () => {
      Auth0ManagementServiceMock.getUser.mockResolvedValueOnce(auth0UserDummy);
      UserRepositoryMock.upsert.mockResolvedValueOnce(userDummy);

      const result = await userService.syncUserAccount(syncAccountDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).toBeString();
    });
  });

  describe('getUserDetails', () => {
    const id = randomUUID();

    it('positive: getUserDetails should be called', async () => {
      try {
        await userService.getUserDetails(id);
      } catch (err) {
        console.log(err);
      }

      expect(UserRepositoryMock.getUserDetails).toBeCalledWith(id);
    });

    it('negative: if user account does not exist, throw the NotFoundException', async () => {
      UserRepositoryMock.getUserDetails.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${id} does not exit!`;
      let exception: any;

      try {
        await userService.getUserDetails(id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });
  });
});
