export interface IAuth0Options {
  management: {
    clientId: string;
    clientSecret: string;
  };
  domain: string;
  connection: string;
  identifier: string;
  actionSecret?: string;
}
