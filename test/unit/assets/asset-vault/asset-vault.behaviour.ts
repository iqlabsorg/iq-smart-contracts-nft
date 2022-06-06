import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IAssetVault, ERC20Mock, Pausable__factory } from '../../../../typechain';
import { AccessControlledHelper } from '../../../shared/utils';

/**
 * Tests for ERC721 Asset Vault
 */
export function shouldBehaveLikeAssetVault(): void {
  describe('IAssetVault', function () {
    let assetVault: IAssetVault;
    let erc20: ERC20Mock;

    let admin: SignerWithAddress;
    let supervisor: SignerWithAddress;
    let operator: SignerWithAddress;
    let stranger: SignerWithAddress;
    let deployer: SignerWithAddress;

    beforeEach(function () {
      erc20 = this.mocks.assets.erc20;
      assetVault = this.contracts.assetVault;

      [stranger] = this.signers.unnamed;
      admin = this.signers.named.admin;
      deployer = this.signers.named.deployer;
      operator = this.signers.named.operator;
      supervisor = this.signers.named.supervisor;
    });

    describe('switchToRecoveryMode', () => {
      AccessControlledHelper.onlyAdminCan(async signer => {
        const tx = await assetVault.connect(signer).switchToRecoveryMode();

        await expect(tx)
          .to.emit(assetVault, 'RecoveryModeActivated')
          .withArgs(await AccessControlledHelper.adminData.successfulSigner.getAddress());
        await expect(assetVault.isRecovery()).to.eventually.equal(true);
      });

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

    describe('withdrawERC20Tokens', () => {
      const amount = 100000;
      beforeEach(async () => {
        // Send the ERC20 tokens to the contract
        await erc20.connect(deployer).transfer(assetVault.address, amount);
      });

      AccessControlledHelper.onlyAdminCan(async signer => {
        const tx = assetVault.connect(signer).withdrawERC20Tokens(erc20.address, stranger.address, amount);
        await expect(tx).to.emit(erc20, 'Transfer').withArgs(assetVault.address, stranger.address, amount);
      });
    });

    describe('pause', () => {
      AccessControlledHelper.onlySupervisorCan(async signer => {
        const tx = await assetVault.connect(signer).pause();
        const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

        await expect(tx).to.emit(pausable, 'Paused');
        await expect(pausable.paused()).to.eventually.equal(true);
      });
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

        AccessControlledHelper.onlySupervisorCan(async signer => {
          const tx = await assetVault.connect(signer).unpause();
          const pausable = Pausable__factory.connect(assetVault.address, assetVault.signer);

          await expect(tx).to.emit(pausable, 'Unpaused');
          await expect(pausable.paused()).to.eventually.equal(false);
        });
      });
    });

    describe('assetClass', () => {
      context('When not in recovery mode', () => {
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
