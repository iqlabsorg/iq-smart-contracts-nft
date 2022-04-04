import hre, { ethers } from 'hardhat';
import { IACL__factory } from '../../typechain';

import type { Contracts, Mocks, Signers } from './types';
import { AccessControlledHelper } from './utils';

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

      const deployer = await ethers.getNamedSigner('deployer');
      const deployedACL = await hre.run('deploy:acl');
      const acl = IACL__factory.connect(deployedACL, deployer);
      await acl.connect(deployer).grantRole(await acl.adminRole(), this.signers.named.admin.address);
      await acl.connect(deployer).grantRole(await acl.supervisorRole(), this.signers.named.supervisor.address);

      this.contracts.acl = acl;

      const [stranger] = this.signers.unnamed;
      await AccessControlledHelper.registerAdmin(this.signers.named.admin, stranger, acl);
      await AccessControlledHelper.registerSupervisor(this.signers.named.supervisor, stranger, acl);
    });

    testSuite();
  });
}
