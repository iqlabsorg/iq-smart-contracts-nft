import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IERC721Warper } from '../../../../../typechain';

export function shouldBehaveLikeApprove(): void {
  describe('approve', function () {
    const tokenId = 42;
    let erc721warper: IERC721Warper;
    let assetOwner: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      erc721warper = this.contracts.erc721Warper;

      assetOwner = this.signers.named.assetOwner;
      [stranger] = this.signers.unnamed;
    });

    context('When calling `approve`', () => {
      it('reverts', async () => {
        await expect(erc721warper.connect(assetOwner).approve(stranger.address, tokenId)).to.be.revertedWith(
          'MethodNotAllowed()',
        );
      });
    });
  });
}
