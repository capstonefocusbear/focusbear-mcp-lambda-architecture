import {
  CfnOutput,
  CfnParameter,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  aws_certificatemanager as acm,
  aws_apigateway as apigw,
  aws_cloudwatch as cw,
  aws_cloudwatch_actions as actions,
  aws_ecr as ecr,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_sns as sns,
  aws_wafv2 as waf,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/** Portable integration source. Focus Bear must integrate/review in aws-infra before production use. */
export class McpStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { local: boolean }) {
    super(scope, id, props);
    const local = props.local;
    const param = (name: string, pattern: string, defaultValue?: string) =>
      new CfnParameter(this, name, {
        type: 'String',
        allowedPattern: pattern,
        ...(defaultValue === undefined ? {} : { default: defaultValue }),
      }).valueAsString;
    const repositoryName = param('ImageRepository', '[a-z0-9][a-z0-9/_.-]+', 'focusbear-mcp');
    const imageDigest = param('ImageDigest', 'sha256:[a-f0-9]{64}');
    const issuer = param('OAuthIssuer', '^https://[^/?#]+/+$');
    const jwks = param('OAuthJwksUrl', '^https://[^?#]+$');
    // Local audience remains a stable canonical URI even when invoking a stage URL.
    const resource = param('McpResourceUrl', local ? '^https?://[^/?#]+/mcp$' : '^https://[^/?#]+/mcp$');
    const clients = param('McpAllowedClientIds', '^[A-Za-z0-9_-]+(,[A-Za-z0-9_-]+)*$');
    const profile = new CfnParameter(this, 'McpTokenProfile', {
      type: 'String',
      default: 'auth0',
      allowedValues: ['auth0', 'rfc9068'],
    }).valueAsString;
    const backend = local ? 'http://api-server:4000' : param('ApiServerUrl', '^https://[^/?#]+/?$');
    const applicationLogs = new logs.LogGroup(this, 'ApplicationLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const fn = new lambda.DockerImageFunction(this, 'Adapter', {
      code: lambda.DockerImageCode.fromEcr(ecr.Repository.fromRepositoryName(this, 'Image', repositoryName), {
        tagOrDigest: imageDigest,
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 512,
      timeout: Duration.seconds(15),
      reservedConcurrentExecutions: 10,
      logGroup: applicationLogs,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_ENV: local ? 'development' : 'production',
        MCP_ALLOW_LOCAL_HTTP: String(local),
        OAUTH_ISSUER: issuer,
        OAUTH_JWKS_URL: jwks,
        MCP_RESOURCE_URL: resource,
        MCP_ALLOWED_CLIENT_IDS: clients,
        MCP_TOKEN_PROFILE: profile,
        MCP_MAX_TOKEN_LIFETIME_SECONDS: '900',
        API_SERVER_URL: backend,
        // Web Adapter targets this fixed loopback authority; forwarded Host is never trusted.
        MCP_TRUSTED_INTERNAL_HOSTS: '127.0.0.1:5039',
        MCP_BIND_HOST: '0.0.0.0',
        MCP_PORT: '5039',
        AWS_LWA_PORT: '5039',
        AWS_LWA_INVOKE_MODE: 'buffered',
        AWS_LWA_READINESS_CHECK_PATH: '/.well-known/oauth-protected-resource',
      },
    });
    const accessLogs = new logs.LogGroup(this, 'AccessLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const api = new apigw.RestApi(this, 'Gateway', {
      endpointTypes: [apigw.EndpointType.REGIONAL],
      deployOptions: {
        stageName: local ? 'local' : 'prod',
        throttlingRateLimit: 5,
        throttlingBurstLimit: 10,
        tracingEnabled: true,
        dataTraceEnabled: false,
        metricsEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        // Deliberately no request headers, bodies, identities, or error messages.
        accessLogFormat: apigw.AccessLogFormat.custom(
          JSON.stringify({
            request_id: '$context.requestId',
            extended_request_id: '$context.extendedRequestId',
            method: '$context.httpMethod',
            resource: '$context.resourcePath',
            status: '$context.status',
            latency_ms: '$context.responseLatency',
            integration_latency_ms: '$context.integrationLatency',
          }),
        ),
      },
    });
    const integration = new apigw.LambdaIntegration(fn, { proxy: true, timeout: Duration.seconds(15) });
    api.root.addResource('mcp').addMethod('ANY', integration);
    const discovery = api.root.addResource('.well-known').addResource('oauth-protected-resource');
    discovery.addMethod('GET', integration);
    discovery.addResource('mcp').addMethod('GET', integration);
    if (!local) {
      const hostname = param('DomainName', '^[a-z0-9.-]+\\.aws\\.focusbear\\.io$');
      const certificate = param('CertificateArn', '^arn:aws:acm:[a-z0-9-]+:[0-9]{12}:certificate/[a-zA-Z0-9-]+$');
      api.addDomainName('Domain', {
        domainName: hostname,
        certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', certificate),
        endpointType: apigw.EndpointType.REGIONAL,
        securityPolicy: apigw.SecurityPolicy.TLS_1_2,
      });
      const acl = new waf.CfnWebACL(this, 'WebAcl', {
        scope: 'REGIONAL',
        defaultAction: { allow: {} },
        visibilityConfig: { cloudWatchMetricsEnabled: true, sampledRequestsEnabled: false, metricName: 'McpEdge' },
        rules: [
          {
            name: 'IpAbuseLimit',
            priority: 1,
            action: { block: {} },
            statement: { rateBasedStatement: { aggregateKeyType: 'IP', limit: 300 } },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              sampledRequestsEnabled: false,
              metricName: 'McpIpRate',
            },
          },
        ],
      });
      const association = new waf.CfnWebACLAssociation(this, 'WebAclAssociation', {
        resourceArn: api.deploymentStage.stageArn,
        webAclArn: acl.attrArn,
      });
      association.node.addDependency(api.deploymentStage);
      new CfnOutput(this, 'DomainTarget', { value: api.domainName!.domainNameAliasDomainName });
    }
    const period = Duration.minutes(5);
    const alarms: cw.Alarm[] = [];
    const alarm = (name: string, metric: cw.IMetric, threshold: number) => {
      const value = new cw.Alarm(this, name, {
        metric,
        threshold,
        evaluationPeriods: 1,
        treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      alarms.push(value);
    };
    alarm(
      'LambdaErrorRate',
      new cw.MathExpression({
        expression: 'IF(calls > 0, 100 * errors / calls, 0)',
        period,
        usingMetrics: { calls: fn.metricInvocations({ period }), errors: fn.metricErrors({ period }) },
      }),
      5,
    );
    // HTTP failures generally return normally from Lambda; monitor gateway 5xx independently.
    alarm(
      'GatewayErrorRate',
      new cw.MathExpression({
        expression: 'IF(calls > 0, 100 * errors / calls, 0)',
        period,
        usingMetrics: {
          calls: api.metricCount({ period }),
          errors: api.metricServerError({ period, statistic: 'Sum' }),
        },
      }),
      5,
    );
    alarm('EndToEndP95', api.metricLatency({ period, statistic: 'p95' }), 3000);
    alarm('LambdaThrottles', fn.metricThrottles({ period }), 0);
    const backendFailures = new logs.MetricFilter(this, 'BackendFailures', {
      logGroup: applicationLogs,
      filterPattern: logs.FilterPattern.literal('{ $.backend_status >= 500 }'),
      metricNamespace: 'FocusBear/Mcp',
      metricName: 'BackendFailures',
      metricValue: '1',
      defaultValue: 0,
    });
    alarm('BackendFailureIncrease', backendFailures.metric({ period, statistic: 'Sum' }), 5);
    if (!local) {
      const topic = new sns.Topic(this, 'Alarms');
      for (const value of alarms) value.addAlarmAction(new actions.SnsAction(topic));
      new CfnOutput(this, 'AlarmTopicArn', {
        value: topic.topicArn,
        description: 'Operators must subscribe and confirm incident destination before release.',
      });
    }
    new CfnOutput(this, 'GatewayUrl', { value: api.urlForPath('/mcp') });
    new CfnOutput(this, 'FunctionName', { value: fn.functionName });
    new CfnOutput(this, 'ImageDigestOutput', { value: imageDigest });
  }
}
