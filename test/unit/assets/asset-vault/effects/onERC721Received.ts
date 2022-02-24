import { expect } from 'chai';
import { ERC721AssetVault, ERC721AssetVault__factory, ERC721Mock, ERC721Mock__factory } from '../../../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

export function shouldBehaveOnERC721Received(): void {
  const mintedTokenId = 1;
  let vault: ERC721AssetVault;
  let asset: ERC721Mock;

  let operator: SignerWithAddress;
  let assetOwner: SignerWithAddress;
  let stranger: SignerWithAddress;

  beforeEach(async function () {
    operator = this.signers.named['operator'];

    [assetOwner, stranger] = this.signers.unnamed;
    asset = this.mocks.assets.erc721;
    vault = this.contracts.assetVault;

    await asset.mint(assetOwner.address, mintedTokenId);
    await asset.connect(assetOwner).setApprovalForAll(operator.address, true);
    await asset.connect(assetOwner).setApprovalForAll(stranger.address, true);
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
      it.skip('rejects ERC721 tokens', async () => {
        await expect(
          asset
            .connect(stranger)
            .functions['safeTransferFrom(address,address,uint256)'](assetOwner.address, vault.address, mintedTokenId),
        ).to.be.revertedWith('AssetDepositIsNotAllowed');
      });
    });
  });
}