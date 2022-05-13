import { ModuleMetadata, Type } from '@nestjs/common';

export interface IModuleOptionsFactory<T> {
  createModuleOptions(): Promise<T> | T;
}

export interface IModuleAsyncOptions<T> extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<IModuleOptionsFactory<T>>;
  useClass?: Type<IModuleOptionsFactory<T>>;
  useFactory?: (...args: any[]) => Promise<T> | T;
  inject?: any[];
}
