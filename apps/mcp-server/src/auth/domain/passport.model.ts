// The exact shape of the user object returned by your JwtStrategy
export interface PassportUser {
  id: string; // The Auth0 User ID (e.g., 'auth0|123456789')
  email?: string;
}

// The wrapper that the @AuthContext decorator returns
export interface Passport {
  user: PassportUser;
}