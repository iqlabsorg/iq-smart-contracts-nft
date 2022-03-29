import hre, { ethers } from 'hardhat';

import type { Contracts, Mocks, Signers } from './types';

export function baseContext(description: string, testSuite: () => void): void {
  describe(description, function () {
    before(async function () {
      this.contracts = {} as Contracts;
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
