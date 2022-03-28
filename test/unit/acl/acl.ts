import hre, { ethers } from 'hardhat';
import { ACL__factory, IACL, IACL__factory } from '../../../typechain';
import { shouldBehaveACL } from './acl.behaviour';

async function unitFixtureACL() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const acl = new ACL__factory(deployer).attach(await hre.run('deploy:acl'));

  return { acl };
}

export function unitTestACL(): void {
  describe('ACL', function () {
    beforeEach(async function () {
      const { acl } = await this.loadFixture(unitFixtureACL);

      this.interfaces.iAcl = IACL__factory.connect(acl.address, acl.signer);
    });

    shouldBehaveACL();
  });
}
