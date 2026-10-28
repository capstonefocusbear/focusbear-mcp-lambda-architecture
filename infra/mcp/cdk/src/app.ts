import { App } from 'aws-cdk-lib';
import { McpStack } from './stack';
const app = new App();
const profile = app.node.tryGetContext('profile');
if (!['local', 'production'].includes(profile)) throw new Error('Set -c profile=local or production explicitly');
new McpStack(app, profile === 'local' ? 'FocusBearMcpLocal' : 'FocusBearMcpProduction', {
  local: profile === 'local',
  ...(profile === 'local' ? { env: { account: '000000000000', region: 'us-east-1' } } : {}),
});
