import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../../../typechain';

export function shouldBehaveLikeApprove(): void {
  describe('approve', function () {
    const mintedTokenId = 445566;

    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let approved: SignerWithAddress;

    beforeEach(async function () {
      warper = this.contracts.erc721Warper;
      assetOwner = this.signers.named['assetOwner'];
      approved = this.signers.named['operator'];

      await warper.connect(this.mocks.metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    context('when calling `approve`', () => {
      it('reverts', async () => {
        await expect(warper.connect(assetOwner).approve(approved.address, mintedTokenId)).to.be.revertedWith(
          'MethodNotAllowed()',
        );
      });
    });

    context('when calling `getApproved`', () => {
      it('reverts', async () => {
        await expect(warper.connect(assetOwner).getApproved(mintedTokenId)).to.be.revertedWith('MethodNotAllowed()');
      });
    });
  });
}
