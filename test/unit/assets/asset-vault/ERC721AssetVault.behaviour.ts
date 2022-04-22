import { expect } from 'chai';
import { ERC721Mock, IERC721AssetVault } from '../../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { AssetClass } from '../../../shared/utils';

/**
 * Tests for ERC721 Asset Vault specific behaviour
 */
export function shouldBehaveLikeERC721AssetVault(): void {
  describe('ERC721 Asset Vault', () => {
    const mintedTokenId = 1;
    let vault: IERC721AssetVault;
    let asset: ERC721Mock;

    let operator: SignerWithAddress;
    let admin: SignerWithAddress;
    let deployer: SignerWithAddress;
    let assetOwner: SignerWithAddress;

    beforeEach(async function () {
      operator = this.signers.named['operator'];
      deployer = this.signers.named.deployer;

      [assetOwner, admin] = this.signers.unnamed;
      asset = this.mocks.assets.erc721;
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
        await expect(vault.assetClass()).to.eventually.equal(AssetClass.ERC721);
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
            await expect(() => vault.returnToOwner(asset.address, mintedTokenId)).to.changeTokenBalance(
              asset,
              assetOwner,
              1,
            );
          });
        });
      });
    });
  });
}
