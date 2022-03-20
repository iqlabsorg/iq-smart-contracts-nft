import { ethers } from 'hardhat';
import { ACL__factory, IACL } from '../../../typechain';
import { shouldBehaveACL } from './acl.behaviour';

async function unitFixtureACL() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const acl = await new ACL__factory(deployer).deploy();

  return { acl };
}

export function unitTestACL(): void {
  describe('ACL', function () {
    beforeEach(async function () {
      const { acl } = await this.loadFixture(unitFixtureACL);

      this.acl = {
        underTest: acl as unknown as IACL,
      };
    });

    shouldBehaveACL();
  });
}
