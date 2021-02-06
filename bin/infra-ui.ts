#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { InfraUiStack } from '../lib/infra-ui-stack';

const app = new cdk.App();
new InfraUiStack(app, 'InfraUiStack');
