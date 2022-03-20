import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../../typechain';

export function shouldBehaveLikeGetApproved(): void {
  describe('getApproved', function () {
    const nonExistentTokenId = 42;
    const mintedTokenId = 4455666;

    beforeEach(async function () {
      await this.erc721Warper.underTest
        .connect(this.erc721Warper.metahub.wallet)
        .mint(this.signers.named['assetOwner'].address, mintedTokenId, '0x');
    });

    context('when token is not minted', () => {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest.connect(this.signers.named['assetOwner']).getApproved(nonExistentTokenId),
        ).to.be.revertedWith(`MethodNotAllowed()`);
      });
    });

    context('when token has been minted', () => {
      it('reverts', async function () {
        await expect(
          this.erc721Warper.underTest.connect(this.signers.named['assetOwner']).getApproved(mintedTokenId),
        ).to.be.revertedWith(`MethodNotAllowed()`);
      });
    });
  });
}
