import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../../../typechain';

export function shouldBehaveLikeSetApprovalForAl(): void {
  describe('setApprovalForAll', () => {
    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let operator: SignerWithAddress;

    beforeEach(function () {
      warper = this.contracts.erc721Warper;
      assetOwner = this.signers.named['assetOwner'];
      operator = this.signers.named['operator'];
    });

    context('when calling `isApprovedForAll`', () => {
      it('reverts', async () => {
        await expect(
          warper.connect(assetOwner).isApprovedForAll(assetOwner.address, operator.address),
        ).to.be.revertedWith('MethodNotAllowed()');
      });
    });

    context('when calling `setApprovalForAll`', () => {
      it('reverts', async () => {
        await expect(warper.connect(assetOwner).setApprovalForAll(operator.address, true)).to.be.revertedWith(
          'MethodNotAllowed()',
        );
      });
    });
  });
}
