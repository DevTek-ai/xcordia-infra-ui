#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { InfraStack } from './infra-stack';

const config = require('config');

const app = new cdk.App();
new InfraStack(app, 'InfraStack', {
    stackName: `${config.get('PROJECT_NAME')}-Stack`,
    
});
