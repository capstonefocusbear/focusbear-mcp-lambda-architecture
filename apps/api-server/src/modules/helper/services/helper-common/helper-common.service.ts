import { Injectable } from '@nestjs/common';

@Injectable()
export class HelperCommonService {
  deepFreezeObject<T>(object: any): Readonly<T> {
    const keys: string[] = Object.keys(object);
    const isObject = (key) => Boolean(typeof object[key] === 'object');
    const isMutable = (key) => Boolean(!Object.isFrozen(object[key]));
    const isMutableObject = (key) => Boolean(isObject(key) && isMutable(key));
    const iterator = (key) => (isMutableObject(key) ? this.deepFreezeObject(object[key]) : null);
    keys.forEach(iterator);
    return Object.freeze(object);
  }
}
