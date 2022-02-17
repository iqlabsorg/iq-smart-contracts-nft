import hre, { ethers } from 'hardhat';

import type { Contracts, Mocks, Signers } from './types';

/// This is run at the beginning of each suite of tests: 2e2, integration and unit.
export function baseContext(description: string, hooks: () => void): void {
  describe(description, function () {
    before(async function () {
      this.contracts = {} as Contracts;
      this.mocks = {} as Mocks;
      this.signers = {} as Signers;

      this.signers.deployer = await ethers.getNamedSigner('deployer');
      this.signers.nftCreator = await ethers.getNamedSigner('nftCreator');
      [this.signers.nftTokenOwner] = await ethers.getUnnamedSigners();

      this.loadFixture = hre.waffle.createFixtureLoader();
    });

    hooks();
  });
}
