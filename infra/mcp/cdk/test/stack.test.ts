import { test } from 'node:test';
import assert from 'node:assert/strict';
import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { McpStack } from '../src/stack';

test('production container stack bounds work, enables regional WAF and safe monitoring', () => {
  const template = Template.fromStack(new McpStack(new App(), 'Prod', { local: false }));
  template.hasResourceProperties('AWS::Lambda::Function', {
    PackageType: 'Image',
    MemorySize: 512,
    Timeout: 15,
    ReservedConcurrentExecutions: 10,
    Environment: { Variables: Match.objectLike({ NODE_ENV: 'production', MCP_ALLOW_LOCAL_HTTP: 'false' }) },
  });
  const functions = Object.values(template.findResources('AWS::Lambda::Function')) as any[];
  assert.equal(functions[0].Properties.VpcConfig, undefined);
  template.hasResourceProperties('AWS::ApiGateway::RestApi', { EndpointConfiguration: { Types: ['REGIONAL'] } });
  template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1);
  template.hasResourceProperties('AWS::Logs::LogGroup', { RetentionInDays: 30 });
  template.hasResourceProperties('AWS::ApiGateway::Stage', {
    MethodSettings: Match.arrayWith([
      Match.objectLike({ ThrottlingRateLimit: 5, ThrottlingBurstLimit: 10, DataTraceEnabled: false }),
    ]),
  });
  template.resourceCountIs('AWS::CloudWatch::Alarm', 5);
  template.hasResourceProperties('AWS::CloudWatch::Alarm', { MetricName: 'Latency', ExtendedStatistic: 'p95' });
  template.hasResourceProperties('AWS::Logs::MetricFilter', { FilterPattern: '{ $.backend_status >= 500 }' });
  const raw = JSON.stringify(template.toJSON());
  assert.ok(!raw.includes('secretsmanager:'));
  assert.ok(!raw.includes('SIGNING_PRIVATE_KEY'));
  assert.ok(!raw.includes('$context.identity.userAgent'));
});

test('local profile keeps same image contract and permits Docker backend only explicitly', () => {
  const template = Template.fromStack(new McpStack(new App(), 'Local', { local: true }));
  template.hasResourceProperties('AWS::Lambda::Function', {
    PackageType: 'Image',
    Environment: {
      Variables: Match.objectLike({
        API_SERVER_URL: 'http://api-server:4000',
        MCP_ALLOW_LOCAL_HTTP: 'true',
        NODE_ENV: 'development',
      }),
    },
  });
  template.resourceCountIs('AWS::WAFv2::WebACL', 0);
  template.resourceCountIs('AWS::ApiGateway::DomainName', 0);
});

test('production domain, WAF, exact env contract and retained logs are reviewable', () => {
  const template = Template.fromStack(new McpStack(new App(), 'DeploymentContract', { local: false }));
  template.hasResourceProperties('AWS::ApiGateway::DomainName', {
    EndpointConfiguration: { Types: ['REGIONAL'] },
    SecurityPolicy: 'TLS_1_2',
  });
  template.hasResourceProperties('AWS::WAFv2::WebACL', {
    Scope: 'REGIONAL',
    VisibilityConfig: Match.objectLike({ SampledRequestsEnabled: false }),
    Rules: Match.arrayWith([
      Match.objectLike({ Statement: { RateBasedStatement: { AggregateKeyType: 'IP', Limit: 300 } } }),
    ]),
  });
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: Match.objectLike({
        MCP_MAX_TOKEN_LIFETIME_SECONDS: '900',
        MCP_TOKEN_PROFILE: { Ref: 'McpTokenProfile' },
        OAUTH_ISSUER: { Ref: 'OAuthIssuer' },
        OAUTH_JWKS_URL: { Ref: 'OAuthJwksUrl' },
        MCP_RESOURCE_URL: { Ref: 'McpResourceUrl' },
        MCP_ALLOWED_CLIENT_IDS: { Ref: 'McpAllowedClientIds' },
        AWS_LWA_INVOKE_MODE: 'buffered',
        MCP_TRUSTED_INTERNAL_HOSTS: '127.0.0.1:5039',
      }),
    },
  });
  for (const log of Object.values(template.findResources('AWS::Logs::LogGroup')) as any[]) {
    assert.equal(log.Properties.RetentionInDays, 30);
    assert.equal(log.DeletionPolicy, 'Retain');
  }
  const raw = template.toJSON();
  assert.equal(raw.Parameters.ImageDigest.AllowedPattern, 'sha256:[a-f0-9]{64}');
  assert.equal(raw.Parameters.ApiServerUrl.AllowedPattern, '^https://[^/?#]+/?$');
  const association = Object.values(template.findResources('AWS::WAFv2::WebACLAssociation'))[0] as any;
  assert.ok(association.DependsOn.some((id: string) => id.startsWith('GatewayDeploymentStage')));
});
