import hre, { ethers } from 'hardhat';

import type { Contracts, Mocks, Signers } from './types';

/// This is run at the beginning of each suite of tests: 2e2, integration and unit.
export function baseContext(description: string, testSuite: () => void): void {
  describe(description, function () {
    before(async function () {
      this.contracts = {
        presets: {},
      } as Contracts;
      this.mocks = {
        assets: {},
      } as Mocks;
      this.signers = {} as Signers;

      this.signers.named = await ethers.getNamedSigners();
      this.signers.unnamed = await ethers.getUnnamedSigners();

      this.loadFixture = hre.waffle.createFixtureLoader();
    });

    testSuite();
  });
}
