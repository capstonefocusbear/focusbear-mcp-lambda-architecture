import tracer from 'dd-trace';

// initialized in a different file to avoid hoisting.
tracer.init({
  // https://docs.datadoghq.com/tracing/connect_logs_and_traces/nodejs/
  logInjection: true,
});

// Disable AWS SDK auto-instrumentation to avoid recursive wrapping on CloudWatch client
tracer.use('aws-sdk', false);
export default tracer;
