#!/bin/sh

rm -rf ./dist

yarn compile

tsc -p tsconfig.build.json

# NOTE: We'll need to performt he publishing from within the dist folder
cp package.json dist/package.json

# Copy over all the artifacts
cp -r artifacts dist/artifacts
rm -rf dist/artifacts/build-info  # Remove build info
find dist/artifacts -name '*.dbg.json' | xargs rm  # Remove dbg build files

# Copy over all contracts
cp -r contracts dist/contracts

# The deploy scripts need to be raw TS files for them to work. When it's compiled to commonjs, it will not work :)
cp -r deploy dist/deploy

cp README.md dist/README.md
