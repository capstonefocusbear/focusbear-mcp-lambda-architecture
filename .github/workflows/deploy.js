require('dotenv').config();
const sdk = require('api')('@render-api/v1.0#2ye4wum37lk2jqyiz');

const DeployStatus = {
  build_in_progress: 'build_in_progress',
  update_in_progress: 'update_in_progress',
  live: 'live',
};

const { RENDER_SERVICE_ID: serviceId, RENDER_API_KEY } = process.env;
const TIMEOUT = 3 * 60 * 1000; // 5 min

sdk.auth(RENDER_API_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const triggerDeploy = async () => {
  const { id, status } = await sdk.createDeploy({ clearCache: 'clear' }, { serviceId });
  console.log(`Deploy has beed started! id: ${id}, currectStatus: ${status}`);
  return { id, status };
};

const checkDeployStatus = async ({ id: deployId, status, finishedAt }) => {
  if (!deployId) {
    console.warn('DeployId was not provided!');
  }
  if (status === DeployStatus.live) return console.log(`Deploy status: ${status}`);
  if (finishedAt) throw new Error(`Check the deployment! Current status: ${status}`);
  console.log(`Await ${TIMEOUT / 60 / 1000} minutes... `);
  await sleep(TIMEOUT);
  const deploy = await sdk['get-deploy']({ serviceId, deployId });
  return checkDeployStatus({ ...deploy });
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
