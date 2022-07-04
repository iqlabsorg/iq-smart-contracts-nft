import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ASSET_RENTAL_STATUS } from '../../../../../src';
import { IERC721Warper, IERC721WarperController, Metahub } from '../../../../../typechain';

export function shouldBehaveLikeGetApproved(): void {
  describe('getApproved', function () {
    const nonExistentTokenId = 42;
    const mintedTokenId = 4455666;

    let erc721warper: IERC721Warper;
    let erc721WarperController: IERC721WarperController;
    let metahub: FakeContract<Metahub>;
    let assetOwner: SignerWithAddress;

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      assetOwner = this.signers.named.assetOwner;
      erc721warper = this.contracts.erc721Warper;
      erc721WarperController = this.contracts.erc721WarperController;

      metahub.warperController.returns(erc721WarperController.address);
      await erc721warper.connect(metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    context('When rental status is None', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.NONE);
      });

      it('reverts', async () => {
        await expect(erc721warper.connect(assetOwner).getApproved(nonExistentTokenId)).to.be.revertedWith(
          `OwnerQueryForNonexistentToken(${nonExistentTokenId})`,
        );
      });
    });

    context('When rental status is RENTED', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.RENTED);
      });

      it('returns metahub', async () => {
        const metahub = await erc721warper.__metahub();

        await expect(erc721warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.equal(metahub);
      });
    });

    context('When rental status is AVAILABLE', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.AVAILABLE);
      });

      it('returns metahub', async () => {
        const metahub = await erc721warper.__metahub();

        await expect(erc721warper.connect(assetOwner).getApproved(mintedTokenId)).to.eventually.equal(metahub);
      });
    });
  });
}
