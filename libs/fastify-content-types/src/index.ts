import { FastifyAdapter } from '@nestjs/platform-fastify';

function axceptJsonTextContentType(fastifyAdapter: FastifyAdapter): void {
  const fastifyInstance = fastifyAdapter.getInstance();
  const contentType = 'text/json';
  const parser = fastifyInstance.getDefaultJsonParser('ignore', 'ignore');
  fastifyInstance.addContentTypeParser(contentType, { parseAs: 'string' }, parser);
}

const axceptContentTypeStrategy = Object.freeze({
  'text/json': (fastify: FastifyAdapter) => axceptJsonTextContentType(fastify),
  'application/json': () => Object(null), // supported by default
  'text/plain': () => Object(null), // supported by default
});

function validateContentTypes(types: string[]): string[] {
  const supportedTypes = Object.keys(axceptContentTypeStrategy);
  const unsupportedTypes = types.filter((type) => !supportedTypes.includes(type));
  const hasUnsupportedTypes = Boolean(unsupportedTypes.length > 0);
  const supportedTypesString = supportedTypes.join(', ');
  const unsupportedTypesString = unsupportedTypes.join(', ');
  const errorMsg = `Server supports content types: ${supportedTypesString}, you try to axcept: ${unsupportedTypesString}!`;
  if (hasUnsupportedTypes) throw new Error(errorMsg);
  return types;
}

export function fastifyAxceptContentTypes(types: string[], fastifyAdapter: FastifyAdapter): void {
  const validContentTypes = validateContentTypes(types);
  const setContentTypeIterator = (type: string) => axceptContentTypeStrategy[type](fastifyAdapter);
  validContentTypes.forEach(setContentTypeIterator);
}
