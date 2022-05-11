import hre, { ethers } from 'hardhat';
import { IACL, InterfacePrinter } from '../../typechain';

import type { Contracts, Mocks, Signers } from './types';
import { AccessControlledHelper } from './utils';

// eslint-disable-next-line func-style
export function baseContext(description: string, testSuite: () => void): void {
  describe(description, function () {
    before(async function () {
      this.contracts = {} as Contracts;
      this.mocks = {
        assets: {},
      } as Mocks;
      this.signers = {} as Signers;

      // Signer setup
      this.signers.named = await ethers.getNamedSigners();
      this.signers.unnamed = await ethers.getUnnamedSigners();

      // Fixture loader setup
      this.loadFixture = hre.waffle.createFixtureLoader();

      // ACL contract setup
      const deployer = await ethers.getNamedSigner('deployer');
      const acl = (await hre.run('deploy:acl')) as IACL;
      await acl.connect(deployer).grantRole(await acl.adminRole(), this.signers.named.admin.address);
      await acl.connect(deployer).grantRole(await acl.supervisorRole(), this.signers.named.supervisor.address);
      this.contracts.acl = acl;

      // ACL test helper setup
      const [stranger] = this.signers.unnamed;
      await AccessControlledHelper.registerAdmin(this.signers.named.admin, stranger, acl);
      await AccessControlledHelper.registerSupervisor(this.signers.named.supervisor, stranger, acl);

      // Interface printer setup
      const interfacePrinter = (await hre.run('deploy:interfaces-printer')) as InterfacePrinter;
      this.mocks.interfacePrinter = interfacePrinter;
    });

    testSuite();
  });
}
