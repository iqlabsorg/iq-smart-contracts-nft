import hre from 'hardhat';
import { IACL } from '../../../typechain';
import { shouldBehaveACL } from './acl.behaviour';

export function unitTestACL(): void {
  describe('ACL', function () {
    async function unitFixtureACL() {
      const acl = (await hre.run('deploy:acl')) as IACL;
      return { acl };
    }

    beforeEach(async function () {
      // Cache the ACL contract state
      const { acl } = await this.loadFixture(unitFixtureACL);
      await acl.grantRole(await acl.adminRole(), this.signers.named.admin.address);
      await acl.grantRole(await acl.supervisorRole(), this.signers.named.supervisor.address);

      this.contracts.acl = acl;
    });

    shouldBehaveACL();
  });
}
