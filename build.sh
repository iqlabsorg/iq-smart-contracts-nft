#!/bin/sh

rm -rf ./dist
tsc -p tsconfig.build.json

# NOTE: We'll need to performt he publishing from within the dist folder
cp package.json dist/package.json

# Copy over all the artifacts
cp -r artifacts dist/artifacts

# The deploy scripts need to be raw TS files for them to work. When it's compiled to commonjs, it will not work :)
cp -r deploy dist/deploy
