import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../typechain';

export function shouldBehaveLikeSetApprovalForAl(): void {
  describe('setApprovalForAll', () => {
    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let operator: SignerWithAddress;

    beforeEach(function () {
      warper = this.contracts.presets.core;
      assetOwner = this.signers.named['assetOwner'];
      operator = this.signers.named['operator'];
    });

    context('when the operator willing to approve is not the owner', () => {
      context('when there is no operator approval set by the sender', () => {
        it('approves the operator', async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, true);

          await expect(
            warper.connect(assetOwner).isApprovedForAll(assetOwner.address, operator.address),
          ).to.eventually.equal(true);
        });

        it('emits an approval event', async () => {
          await expect(warper.connect(assetOwner).setApprovalForAll(operator.address, true))
            .to.emit(warper, 'ApprovalForAll')
            .withArgs(assetOwner.address, operator.address, true);
        });
      });

      context('when the operator was set as not approved', () => {
        beforeEach(async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, false);
        });

        it('approves the operator', async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, true);

          await expect(
            warper.connect(assetOwner).isApprovedForAll(assetOwner.address, operator.address),
          ).to.eventually.equal(true);
        });

        it('emits an approval event', async () => {
          await expect(warper.connect(assetOwner).setApprovalForAll(operator.address, true))
            .to.emit(warper, 'ApprovalForAll')
            .withArgs(assetOwner.address, operator.address, true);
        });

        it('can unset the operator approval', async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, false);

          await expect(
            warper.connect(operator).isApprovedForAll(assetOwner.address, operator.address),
          ).to.eventually.equal(false);
        });
      });

      context('when the operator was already approved', () => {
        beforeEach(async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, true);
        });

        it('keeps the approval to the given address', async () => {
          await warper.connect(assetOwner).setApprovalForAll(operator.address, true);

          await expect(warper.isApprovedForAll(assetOwner.address, operator.address)).to.eventually.equal(true);
        });

        it('emits an approval event', async () => {
          await expect(warper.connect(assetOwner).setApprovalForAll(operator.address, true))
            .to.emit(warper, 'ApprovalForAll')
            .withArgs(assetOwner.address, operator.address, true);
        });
      });
    });

    context('when the operator is the owner', () => {
      it('reverts', async () => {
        await expect(warper.connect(assetOwner).setApprovalForAll(assetOwner.address, true)).to.be.revertedWithError(
          'ApproveToCaller',
        );
      });
    });
  });
}
