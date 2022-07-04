import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IERC721Warper } from '../../../../../typechain';

export function shouldBehaveLikeSetApprovalForAl(): void {
  describe('setApprovalForAll', () => {
    let erc721warper: IERC721Warper;
    let assetOwner: SignerWithAddress;
    let operator: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      erc721warper = this.contracts.erc721Warper;

      assetOwner = this.signers.named.assetOwner;
      operator = this.signers.named.operator;
      [stranger] = this.signers.unnamed;
    });

    context('When calling `isApprovedForAll`', () => {
      context('passing the Metahub address as the operator', () => {
        it('returns true', async () => {
          await expect(
            erc721warper.connect(assetOwner).isApprovedForAll(assetOwner.address, await erc721warper.__metahub()),
          ).to.eventually.be.true;
        });
      });

      context('passing a strangers address as the operator', () => {
        it('returns false', async () => {
          await expect(erc721warper.connect(assetOwner).isApprovedForAll(assetOwner.address, stranger.address)).to
            .eventually.be.false;
        });
      });
    });

    context('When calling `setApprovalForAll`', () => {
      it('reverts', async () => {
        await expect(erc721warper.connect(assetOwner).setApprovalForAll(operator.address, true)).to.be.revertedWith(
          'MethodNotAllowed()',
        );
      });
    });
  });
}
