import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ASSET_RENTAL_STATUS } from '../../../../../src';
import { IERC721Warper, IERC721WarperController, Metahub } from '../../../../../typechain';

export function shouldBehaveLikeOwnerOf(): void {
  describe('ownerOf', () => {
    const mintedTokenId = 4455666;

    let erc721warper: IERC721Warper;
    let erc721WarperController: IERC721WarperController;
    let metahub: FakeContract<Metahub>;
    let assetOwner: SignerWithAddress;

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      assetOwner = this.signers.named.assetOwner;
      erc721WarperController = this.contracts.erc721WarperController;
      erc721warper = this.contracts.erc721Warper;

      metahub.warperController.returns(erc721WarperController.address);

      await erc721warper.connect(metahub.wallet).mint(assetOwner.address, mintedTokenId, '0x');
    });

    context('When the token has never been rented', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.NONE);
      });

      it('reverts', async () => {
        await expect(erc721warper.ownerOf(mintedTokenId)).to.be.revertedWith(
          `OwnerQueryForNonexistentToken(${mintedTokenId})`,
        );
      });
    });

    context('When the token has been minted but currently has not been rented', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.AVAILABLE);
      });

      it('returns metahub address', async () => {
        await expect(erc721warper.ownerOf(mintedTokenId)).to.eventually.equal(metahub.address);
      });
    });

    context('When the token is currently rented', () => {
      beforeEach(() => {
        metahub.assetRentalStatus.returns(ASSET_RENTAL_STATUS.RENTED);
      });

      it('returns the current owner of the token', async () => {
        await expect(erc721warper.ownerOf(mintedTokenId)).to.eventually.equal(assetOwner.address);
      });
    });
  });
}
