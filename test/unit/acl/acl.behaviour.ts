import { expect } from 'chai';
import { IACL } from '../../../typechain';
import { RolesLibrary } from '../../shared/utils';

declare module 'mocha' {
  interface Context {
    acl: {
      underTest: IACL;
    };
  }
}

/**
 * Warper preset factory tests
 */
export function shouldBehaveACL(): void {
  it('exposes `checkRole`', async function () {
    const adminRole = await this.acl.underTest.adminRole();
    const address = this.signers.named['deployer'].address;
    await expect(this.acl.underTest.checkRole(adminRole, address)).to.not.be.reverted;
  });

  it('exposes `adminRole`', async function () {
    await expect(this.acl.underTest.adminRole()).to.eventually.equal(RolesLibrary.ADMIN_ROLE);
  });

  it('exposes `supervisorRole`', async function () {
    await expect(this.acl.underTest.supervisorRole()).to.eventually.equal(RolesLibrary.SUPERVISOR_ROLE);
  });
}
