import * as dotenv from 'dotenv';

import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-contract-sizer';

// Enable tasks
// NOTE: https://github.com/dethcrypto/TypeChain/issues/371
// eslint-disable-next-line
import('./tasks').catch(e =>
  console.log(
    `
Cannot load tasks. Need to generate typechain types.
This is the expected behaviour on first time setup.`,
    `Missing type trace: ${e.toString()}`,
  ),
);

// Enable test assertions
import './test/assertions';

dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  mocha: {
    bail: true,
  },
  solidity: {
    version: '0.8.13',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['storageLayout'],
        },
      },
    },
  },
  namedAccounts: {
    deployer: 0,
    nftCreator: 1,
    assetOwner: 2,
    operator: 3,
    universeOwner: 4,
    admin: 5,
    supervisor: 6,
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  contractSizer: {
    runOnCompile: !!process.env.REPORT_SIZE,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: 'USD',
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
};

export default config;
