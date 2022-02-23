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
import './tasks';

dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.11',
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
  paths: {
    tests: './test-new',
  },
};

export default config;
