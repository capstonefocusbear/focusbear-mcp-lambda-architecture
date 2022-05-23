require('dotenv').config();
const sdk = require('api')('@render-api/v1.0#54d5p1kl39a18af');


const { RENDER_SERVICE_ID: serviceId, RENDER_API_KEY } = process.env;
const TIMEOUT = 3 * 60 * 1000; // 3 min
const LIVE_STATUS = 'live';

sdk.auth(RENDER_API_KEY);

const compose = (...funcs) => input => funcs.reduce((chain, func) => chain.then(func), Promise.resolve(input)).catch(err => { new Error(err) });

const sleep = ms => new Promise(r => setTimeout(r, ms));

const triggerDeploy = async () => {
  const { id, status } = await sdk['create-deploy']({ serviceId });
  console.log(`Deploy has beed started! id: ${id}, currectStatus: ${status}`);
  return { id, status };
}

const checkDeployStatus = async ({ id: deployId, status }) => {
  if (!deployId) throw new Error('DeployId was not provided!');
  if (status === LIVE_STATUS) return console.log(`Deploy status: ${LIVE_STATUS}`);
  console.log(`Await ${TIMEOUT} miliseconds before status check... `);
  await sleep(TIMEOUT);
  const deploy = await sdk['get-deploy']({ serviceId, deployId });
  return checkDeployStatus({ ...deploy });
}


compose(triggerDeploy, checkDeployStatus)();



