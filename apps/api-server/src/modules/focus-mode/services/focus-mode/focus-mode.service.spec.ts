import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { userDummy } from '../../../../../test/dummies ';
import { FocusModeRepositoryMock } from '../../../../../test/mocks';
import { CreateFocusModeDto } from '../../dto/create-focus-mode.dto';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { FocusModeService } from './focus-mode.service';

describe('FocusModeService', () => {
  let focusModeService: FocusModeService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [FocusModeService, FocusModeRepository],
    })
      .overrideProvider(FocusModeRepository)
      .useValue(FocusModeRepositoryMock)
      .compile();

    focusModeService = moduleRef.get<FocusModeService>(FocusModeService);
  });

  it('should be defined', () => {
    expect(focusModeService).toBeDefined();
  });

  describe('create', () => {
    const createFocusModeDto: CreateFocusModeDto = {
      id: randomUUID(),
      name: 'some string',
    };
    const user_id = userDummy.id;

    it('positive: repository create should be called', async () => {
      await focusModeService.create({ ...createFocusModeDto, user_id });

      expect(FocusModeRepositoryMock.create).toBeCalledWith({
        user_id,
        ...createFocusModeDto,
      });
    });
  });

  describe('update', () => {
    const updateFocusModeDto: UpdateFocusModeDto = {
      name: 'some string',
    };
    const id = randomUUID();

    it('positive: repository update should be called', async () => {
      await focusModeService.update(id, updateFocusModeDto);

      expect(FocusModeRepositoryMock.update).toBeCalledWith(id, updateFocusModeDto);
    });
  });

  describe('delete', () => {
    const id = randomUUID();

    it('positive: repository delete should be called', async () => {
      await focusModeService.delete(id);

      expect(FocusModeRepositoryMock.orm.delete).toBeCalledWith(id);
    });
  });
});
