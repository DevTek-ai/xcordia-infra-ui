#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { InfraStack } from './infra-stack';

const config = require('config');

const app = new cdk.App();

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'qa') {
    
    new InfraStack(app, get_logical_env_name('Stack'), {
        stackName: get_logical_env_name('Stack'),
    });
}
else {

    new InfraStack(app, 'InfraStack', {
        stackName: `${config.get('PROJECT_NAME')}-Stack`,
        
    });
}

function get_logical_env_name(resource_type: string): string {

    let val = `${config.get('PROJECT_NAME')}-${config.get('ENVIRONMENT')}`
    if (resource_type) {
        val = val + '-' + resource_type;
    }

    return val;
}
