import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../../../typechain';

export function shouldBehaveLikeApprove(): void {
  describe('approve', function () {
    const tokenId = 42;

    context('when calling `approve`', function () {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest
            .connect(this.signers.named['assetOwner'])
            .approve(this.signers.unnamed[0].address, tokenId),
        ).to.be.revertedWith('MethodNotAllowed()');
      });
    });

    context('when calling `getApproved`', () => {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest.connect(this.signers.named['assetOwner']).getApproved(tokenId),
        ).to.be.revertedWith('MethodNotAllowed()');
      });
    });
  });
}
