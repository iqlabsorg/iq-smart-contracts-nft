import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IACL } from '../../../typechain';
import { RolesLibrary } from '../../shared/utils';

/**
 * Warper preset factory tests
 */
export function shouldBehaveACL(): void {
  let acl: IACL;
  let deployer: SignerWithAddress;

  beforeEach(function () {
    deployer = this.signers.named['deployer'];
    acl = this.contracts.acl;
  });

  it('exposes `checkRole`', async () => {
    const adminRole = await acl.adminRole();
    await expect(acl.checkRole(adminRole, deployer.address)).to.not.be.reverted;
  });

  it('exposes `adminRole`', async () => {
    await expect(acl.adminRole()).to.eventually.equal(RolesLibrary.ADMIN_ROLE);
  });

  it('exposes `supervisorRole`', async () => {
    await expect(acl.supervisorRole()).to.eventually.equal(RolesLibrary.SUPERVISOR_ROLE);
  });
}
