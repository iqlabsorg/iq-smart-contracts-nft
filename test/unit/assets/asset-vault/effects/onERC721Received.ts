import { expect } from 'chai';
import { ERC721AssetVault, ERC721Mock } from '../../../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

export function shouldBehaveOnERC721Received(): void {
  const mintedTokenId = 1;
  let vault: ERC721AssetVault;
  let asset: ERC721Mock;

  let operator: SignerWithAddress;
  let assetOwner: SignerWithAddress;

  beforeEach(async function () {
    operator = this.signers.named['operator'];

    [assetOwner] = this.signers.unnamed;
    asset = this.mocks.assets.erc721;
    vault = this.contracts.erc721assetVault;

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
}
