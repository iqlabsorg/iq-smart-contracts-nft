import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-contract-sizer';
import 'solidity-docgen';

import { config as dotenvConfig } from 'dotenv';

// Enable tasks
// NOTE: https://github.com/dethcrypto/TypeChain/issues/371
import('./tasks').catch((e: string) =>
  console.log(
    `
Cannot load tasks. Need to generate typechain types.
This is the expected behaviour on first time setup.`,
    `Missing type trace: ${e.toString()}`,
  ),
);

// Enable custom assertions on project startup
import './test/assertions';

const env = dotenvConfig();

const DEPLOYMENT_PRIVATE_KEY = env.parsed?.DEPLOYMENT_PRIVATE_KEY;
const accounts = DEPLOYMENT_PRIVATE_KEY ? [DEPLOYMENT_PRIVATE_KEY] : [];

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
      url: process.env.ROPSTEN_URL ?? '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts,
    },
    mumbaiTestnet: {
      url: 'https://matic-mumbai.chainstacklabs.com',
      accounts,
    },
  },
  contractSizer: {
    runOnCompile: Boolean(process.env.REPORT_SIZE),
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: Boolean(process.env.REPORT_GAS),
    currency: 'USD',
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  docgen: { pages: 'files', outputDir: 'docs', templates: './themes/custom-markdown' },
};

export default config;
