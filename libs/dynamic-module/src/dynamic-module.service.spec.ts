/* eslint-disable max-classes-per-file */
import { DynamicModuleFactory } from '.';

describe('DynamicModuleFactory', () => {
  describe('register', () => {
    it('positive: method should be defined', () => {
      class TestModule extends DynamicModuleFactory<any>('') {}
      expect(TestModule.register).toBeDefined();
    });
  });
  describe('registerAsync', () => {
    it('positive: method should be defined', () => {
      class TestModule extends DynamicModuleFactory<any>('') {}
      expect(TestModule.registerAsync).toBeDefined();
    });
  });
});
