export interface IAuth0Options {
  domain: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  connection: string;
  nonInteractiveClientId: string;
  nonInteractiveClientSecret: string;
  identifier: string;
}
