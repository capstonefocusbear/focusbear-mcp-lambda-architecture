#!/bin/bash
# Start-up script for AWS Lambda. The Lambda Web Adapter layer runs this,
# waits for the server to listen on AWS_LWA_PORT, then forwards requests to it.
exec node main.js
