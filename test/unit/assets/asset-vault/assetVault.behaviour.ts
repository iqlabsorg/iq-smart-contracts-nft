import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IACL, IAssetVault, Pausable__factory } from '../../../../typechain';
import { AccessControlledHelper } from '../../../shared/utils';

/**
 * Tests for ERC721 Asset Vault
 */
export function shouldBehaveLikeAssetVault(): void {
  describe('IAssetVault', function () {
    let assetVault: IAssetVault;
    let acl: IACL;
    let stranger: SignerWithAddress;
    let admin: SignerWithAddress;
    let supervisor: SignerWithAddress;
    let operator: SignerWithAddress;

    let onlyAdminCan: AccessControlledHelper;
    let onlySupervisorCan: AccessControlledHelper;

    beforeEach(async function () {
      assetVault = this.contracts.assetVault;
      acl = this.contracts.acl;

      operator = this.signers.named['operator'];
      [stranger, admin, supervisor] = this.signers.unnamed;
      const deployer = this.signers.named['deployer'];

      await acl.connect(deployer).grantRole(await acl.adminRole(), admin.address);
      await acl.connect(deployer).grantRole(await acl.supervisorRole(), supervisor.address);

      onlyAdminCan = new AccessControlledHelper(admin, stranger, await acl.adminRole());
      onlySupervisorCan = new AccessControlledHelper(supervisor, stranger, await acl.supervisorRole());
    });

    describe('switchToRecoveryMode', () => {
      AccessControlledHelper.onlyRoleCan(
        () => onlyAdminCan,
        async signer => {
          const tx = await assetVault.connect(signer).switchToRecoveryMode();
          await expect(tx)
            .to.emit(assetVault, 'RecoveryModeActivated')
            .withArgs(await onlyAdminCan.successfulSigner.getAddress());
          await expect(assetVault.isRecovery()).to.eventually.equal(true);
        },
      );

      context('When in recovery mode', () => {
        beforeEach(async () => {
          await assetVault.connect(admin).switchToRecoveryMode();
        });

        it('cannot pause', async () => {
          await expect(assetVault.pause()).to.be.revertedWith('VaultIsInRecoveryMode()');
        });

        it('cannot unpause', async () => {
          await expect(assetVault.pause()).to.be.revertedWith('VaultIsInRecoveryMode()');
        });
      });
    });

    describe('pause', () => {
      AccessControlledHelper.onlyRoleCan(
        () => onlySupervisorCan,
        async signer => {
          const tx = await assetVault.connect(signer).pause();
          const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

          await expect(tx).to.emit(pausable, 'Paused');
          await expect(pausable.paused()).to.eventually.equal(true);
        },
      );
    });

    describe('unpause', () => {
      context('When not paused', () => {
        it('reverts', async () => {
          await expect(assetVault.connect(supervisor).unpause()).to.be.revertedWith('Pausable: not paused');
        });
      });

      context('When paused', () => {
        beforeEach(async () => {
          await assetVault.connect(supervisor).pause();
        });

        AccessControlledHelper.onlyRoleCan(
          () => onlySupervisorCan,
          async signer => {
            const tx = await assetVault.connect(signer).unpause();
            const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

            await expect(tx).to.emit(pausable, 'Unpaused');
            await expect(pausable.paused()).to.eventually.equal(false);
          },
        );
      });
    });

    describe('assetClass', () => {
      context('not in recovery mode', () => {
        it('returns false', async () => {
          await expect(assetVault.isRecovery()).to.eventually.equal(false);
        });
      });
    });

    describe('metahub', () => {
      it('returns metahub', async () => {
        await expect(assetVault.metahub()).to.eventually.equal(operator.address);
      });
    });
  });
}
