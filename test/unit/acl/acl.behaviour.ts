import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IACL } from '../../../typechain';
import { RolesLibrary } from '../../shared/utils';

/**
 * Warper preset factory tests
 */
export function shouldBehaveACL(): void {
  let iacl: IACL;
  let deployer: SignerWithAddress;

  beforeEach(function () {
    deployer = this.signers.named['deployer'];
    iacl = this.interfaces.iAcl;
  });

  it('exposes `checkRole`', async () => {
    const adminRole = await iacl.adminRole();
    await expect(iacl.checkRole(adminRole, deployer.address)).to.not.be.reverted;
  });

  it('exposes `adminRole`', async () => {
    await expect(iacl.adminRole()).to.eventually.equal(RolesLibrary.ADMIN_ROLE);
  });

  it('exposes `supervisorRole`', async () => {
    await expect(iacl.supervisorRole()).to.eventually.equal(RolesLibrary.SUPERVISOR_ROLE);
  });
}
