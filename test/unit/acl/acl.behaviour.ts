import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IACL } from '../../../typechain';
import { ROLES_LIBRARY } from '../../shared/constants';

/**
 * Warper preset factory tests
 */
export function shouldBehaveACL(): void {
  describe('behaves like IACL', () => {
    let acl: IACL;
    let deployer: SignerWithAddress;
    let admin: SignerWithAddress;
    let supervisor: SignerWithAddress;

    beforeEach(function () {
      deployer = this.signers.named.deployer;
      admin = this.signers.named.admin;
      supervisor = this.signers.named.supervisor;

      acl = this.contracts.acl;
    });

    it('exposes `checkRole`', async () => {
      const adminRole = await acl.adminRole();
      await expect(acl.checkRole(adminRole, deployer.address)).to.not.be.reverted;
    });

    describe('revokeRole', () => {
      context('When 2 admins set', () => {
        it('can remove one', async () => {
          await acl.connect(admin).revokeRole(ROLES_LIBRARY.ADMIN_ROLE, admin.address);

          await expect(acl.getRoleMemberCount(ROLES_LIBRARY.ADMIN_ROLE)).to.eventually.equal(1);
        });
      });

      context('When 1 admin set', () => {
        beforeEach(async () => {
          await acl.renounceRole(ROLES_LIBRARY.ADMIN_ROLE, deployer.address);
        });

        it('reverts', async () => {
          await expect(acl.connect(admin).revokeRole(ROLES_LIBRARY.ADMIN_ROLE, admin.address)).to.be.revertedWith(
            'CannotRemoveLastAdmin',
          );
        });
      });

      context('When 1 supervisor set', () => {
        beforeEach(async () => {
          await acl.renounceRole(ROLES_LIBRARY.SUPERVISOR_ROLE, deployer.address);
        });

        it('removes the supervisor', async () => {
          await acl.connect(admin).revokeRole(ROLES_LIBRARY.SUPERVISOR_ROLE, supervisor.address);

          await expect(acl.getRoleMemberCount(ROLES_LIBRARY.SUPERVISOR_ROLE)).to.eventually.equal(0);
        });
      });
    });

    it('exposes `checkRole`', async () => {
      const adminRole = await acl.adminRole();
      await expect(acl.checkRole(adminRole, deployer.address)).to.not.be.reverted;
    });

    it('exposes `adminRole`', async () => {
      await expect(acl.adminRole()).to.eventually.equal(ROLES_LIBRARY.ADMIN_ROLE);
    });

    it('exposes `supervisorRole`', async () => {
      await expect(acl.supervisorRole()).to.eventually.equal(ROLES_LIBRARY.SUPERVISOR_ROLE);
    });
  });
}
