import { FastifyAdapter } from '@nestjs/platform-fastify';
import { fastifyAxceptContentTypes } from '.';

describe('FastifyContentTypes', () => {
  let fastifyAdapter: FastifyAdapter;
  const supportedContentTypes = ['text/json', 'application/json', 'text/plain']; // this list may be extended by lid growth

  beforeEach(() => {
    fastifyAdapter = new FastifyAdapter();
  });
  it('positive: method should be defined', () => {
    expect(fastifyAxceptContentTypes).toBeDefined();
  });
  it('positive: should return void', () => {
    let exception: Error;
    try {
      fastifyAxceptContentTypes(supportedContentTypes, fastifyAdapter);
    } catch (error) {
      exception = error;
    }
    expect(exception).toBeUndefined();
  });
  it('negative: should throw an error if add unsupported content type', () => {
    let exception: Error;
    const unsupportedContentTypes = ['blabla/json', 'blabla/text'];
    try {
      fastifyAxceptContentTypes(unsupportedContentTypes, fastifyAdapter);
    } catch (error) {
      exception = error;
    }
    expect(exception).toBeDefined();
  });
});
