import { expect } from 'chai';
import { ERC20Mock, ERC721Mock, IERC721AssetVault } from '../../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ASSET_CLASS } from '../../../../src';
import { AccessControlledHelper } from '../../../shared/utils';

/**
 * Tests for ERC721 Asset Vault specific behaviour
 */
export function shouldBehaveLikeERC721AssetVault(): void {
  describe('ERC721 Asset Vault', () => {
    const mintedTokenId = 1;
    let vault: IERC721AssetVault;
    let asset: ERC721Mock;
    let erc20: ERC20Mock;

    let operator: SignerWithAddress;
    let admin: SignerWithAddress;
    let deployer: SignerWithAddress;
    let assetOwner: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(async function () {
      operator = this.signers.named.operator;
      deployer = this.signers.named.deployer;

      [assetOwner, admin, stranger] = this.signers.unnamed;
      asset = this.mocks.assets.erc721;
      erc20 = this.mocks.assets.erc20;
      vault = this.contracts.erc721assetVault;

      await this.contracts.acl.connect(deployer).grantRole(await this.contracts.acl.adminRole(), admin.address);

      await asset.mint(assetOwner.address, mintedTokenId);
      await asset.connect(assetOwner).setApprovalForAll(operator.address, true);
    });

    describe('onERC721Received', () => {
      context('when the caller is operator', () => {
        it('accepts ERC721 tokens', async () => {
          await asset
            .connect(operator)
            .functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, mintedTokenId);
          await expect(asset.ownerOf(1)).to.eventually.eq(vault.address);
        });
      });

      context('when the caller is not operator', () => {
        it('reverts', async () => {
          await expect(
            asset
              .connect(assetOwner)
              .functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, mintedTokenId),
          ).to.be.reverted;
        });
      });
    });

    describe('assetClass', () => {
      it('returns successfully', async () => {
        await expect(vault.assetClass()).to.eventually.equal(ASSET_CLASS.ERC721);
      });
    });

    describe('returnToOwner', () => {
      beforeEach(async () => {
        await asset
          .connect(operator)
          .functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, mintedTokenId);
      });

      context('When not in recovery mode', () => {
        it('reverts', async () => {
          await expect(vault.returnToOwner(asset.address, mintedTokenId)).to.be.revertedWith(
            'AssetReturnIsNotAllowed()',
          );
        });
      });

      context('When in recovery mode', () => {
        beforeEach(async () => {
          await vault.connect(admin).switchToRecoveryMode();
        });

        context('When invalid asset id', () => {
          const invalidTokenId = 2;

          it('reverts', async () => {
            await expect(vault.returnToOwner(assetOwner.address, invalidTokenId)).to.be.revertedWith('AssetNotFound()');
          });
        });

        context('When valid asset id', () => {
          it('successfully transfers the token', async () => {
            await expect(async () => vault.returnToOwner(asset.address, mintedTokenId)).to.changeTokenBalance(
              asset,
              assetOwner,
              1,
            );
          });
        });
      });
    });

    describe('recoverTokens', () => {
      const amount = 100000;
      beforeEach(async () => {
        // Send the ERC20 tokens to the contract
        await erc20.connect(deployer).transfer(vault.address, amount);
      });

      AccessControlledHelper.onlyAdminCan(async signer => {
        const tx = vault.connect(signer).recoverTokens(erc20.address, stranger.address, amount);
        await expect(tx).to.emit(erc20, 'Transfer').withArgs(vault.address, stranger.address, amount);
      });
    });
  });
}
