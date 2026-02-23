import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { TaskReactionController } from './task-reaction.controller';
import { ToDoModule } from '../to-do.module';

describe('TaskReactionController route registration', () => {
  it('registers the controller on the reactions route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TaskReactionController)).toBe('to-do/:task_id/reactions');
  });

  it('registers create/get/delete handlers on the expected HTTP methods', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TaskReactionController.prototype.createReaction)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, TaskReactionController.prototype.createReaction)).toBe(
      RequestMethod.POST,
    );

    expect(Reflect.getMetadata(PATH_METADATA, TaskReactionController.prototype.getReactions)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, TaskReactionController.prototype.getReactions)).toBe(RequestMethod.GET);

    expect(Reflect.getMetadata(PATH_METADATA, TaskReactionController.prototype.deleteReaction)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, TaskReactionController.prototype.deleteReaction)).toBe(
      RequestMethod.DELETE,
    );
  });

  it('includes TaskReactionController in ToDoModule controllers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ToDoModule) as unknown[];

    expect(controllers).toContain(TaskReactionController);
  });
});
