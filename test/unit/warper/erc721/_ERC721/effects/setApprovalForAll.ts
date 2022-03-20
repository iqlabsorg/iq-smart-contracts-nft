import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../../../typechain';

export function shouldBehaveLikeSetApprovalForAl(): void {
  describe('setApprovalForAll', () => {
    context('when calling `isApprovedForAll`', () => {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest
            .connect(this.signers.named['assetOwner'])
            .isApprovedForAll(this.signers.named['assetOwner'].address, this.signers.named['operator'].address),
        ).to.be.revertedWith('MethodNotAllowed()');
      });
    });

    context('when calling `setApprovalForAll`', () => {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest
            .connect(this.signers.named['assetOwner'])
            .setApprovalForAll(this.signers.named['operator'].address, true),
        ).to.be.revertedWith('MethodNotAllowed()');
      });
    });
  });
}
