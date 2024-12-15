require('dotenv').config();
const sdk = require('api')('@render-api/v1.0#3b3esy2lm4n34b62');

const DeployStatus = {
  build_in_progress: 'build_in_progress',
  update_in_progress: 'update_in_progress',
  live: 'live',
};

console.log('======================= secrets ===========================');
console.log('values: ', (process.env.RENDER_SERVICE_ID ?? '').length, (process.env.RENDER_API_KEY ?? '').length);
console.log('======================= secrets ===========================');

const { RENDER_SERVICE_ID: serviceId, RENDER_API_KEY } = process.env;
const TIMEOUT = 3 * 60 * 1000; // 5 min

sdk.auth(RENDER_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const triggerDeploy = async () => {
  const { id, status } = await sdk.createDeploy({ clearCache: 'clear' }, { serviceId });
  console.log(`Deploy has been started! id: ${id}, currentStatus: ${status}`);
  return { id, status };
};

const checkDeployStatus = async ({ id: deployId, status, finishedAt }) => {
  if (!deployId) throw new Error('DeployId was not provided!');
  if (status === DeployStatus.live) return console.log(`Deploy status: ${status}`);
  if (finishedAt) throw new Error(`Check the deployment! Current status: ${status}`);
  console.log(`Await ${TIMEOUT / 60 / 1000} minutes... `);
  await sleep(TIMEOUT);
  try {
    const deploy = await sdk['get-deploy']({ serviceId, deployId });
    return checkDeployStatus({ ...deploy });
  } catch (error) {
    console.error('Error checking deploy status:', error);
    throw new Error('Failed to check deploy status');
  }
};

const bootstrap = async () => {
  try {
    const deploy = await triggerDeploy();
    await checkDeployStatus({ ...deploy });
  } catch (error) {
    console.warn(error);
    process.exit(1);
  }
};

bootstrap();
