/* eslint-disable max-classes-per-file */
export class OAuthError extends Error {
  constructor(message: string, public readonly details: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidRefreshTokenError extends OAuthError {
  readonly requiresReauth = true;

  readonly isRetryable = false;
}

export class InsufficientPermissionsError extends OAuthError {
  readonly requiresReauth = true;

  readonly isRetryable = false;
}

export class TransientNetworkError extends OAuthError {
  readonly requiresReauth = false;

  readonly isRetryable = true;
}

export class TokenRefreshError extends OAuthError {
  readonly requiresReauth = false;

  readonly isRetryable = false;
}

export class AuthenticationFailedError extends OAuthError {
  readonly requiresReauth = true;

  readonly isRetryable = false;
}

export class RateLimitError extends OAuthError {
  readonly requiresReauth = false;

  readonly isRetryable = true;

  readonly retryAfter?: number;

  constructor(message: string, details: Record<string, any>, retryAfter?: number) {
    super(message, details);
    this.retryAfter = retryAfter;
  }
}
