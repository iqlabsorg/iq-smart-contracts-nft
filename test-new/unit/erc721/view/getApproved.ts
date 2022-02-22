import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeGetApproved(): void {
  describe('getApproved', function () {
    let warper: ERC721Warper;
    let assetOwner: SignerWithAddress;
    let approved: SignerWithAddress;

    const nonExistentTokenId = 42;
    const mintedTokenId = 4455666;

    beforeEach(async function () {
      warper = this.contracts.presets.core;
      assetOwner = this.signers.named['assetOwner'];
      approved = this.signers.named['operator'];

      await warper.connect(this.mocks.metahub.wallet).safeMint(assetOwner.address, mintedTokenId);
    });

    context('when token is not minted', function () {
      it('reverts', async function () {
        await expect(warper.connect(assetOwner).getApproved(nonExistentTokenId)).to.be.revertedWith(
          `ApprovedQueryForNonexistentToken(${nonExistentTokenId})`,
        );
      });
    });

    context('when token has been minted ', function () {
      it('should return the zero address', async function () {
        await expect(warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.be.equal(AddressZero);
      });

      context('when account has been approved', function () {
        beforeEach(async function () {
          await warper.connect(assetOwner).approve(approved.address, mintedTokenId);
        });

        it('returns approved account', async function () {
          await expect(warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.equal(approved.address);
        });
      });
    });
  });
}
