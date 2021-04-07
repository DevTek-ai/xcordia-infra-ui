#!/usr/bin/env bash

set -eux
# account # 

echo "🚀 Deploying infra to QA..."
npm i

export NODE_ENV=
npm run build

cdk deploy
