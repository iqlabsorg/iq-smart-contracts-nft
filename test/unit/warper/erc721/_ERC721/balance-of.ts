import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IERC721Warper, IERC721WarperController, Metahub } from '../../../../../typechain';
import { ADDRESS_ZERO } from '../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  describe('balanceOf', () => {
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

    context('when the given address has rented some tokens', () => {
      const activeRentalCount = 10;
      beforeEach(() => {
        metahub.collectionRentedValue.returns(activeRentalCount);
      });

      it('returns the amount of tokens owned by the given address', async () => {
        await expect(erc721warper.balanceOf(assetOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when the given address has not rented any tokens', () => {
      const activeRentalCount = 0;
      beforeEach(() => {
        metahub.collectionRentedValue.returns(activeRentalCount);
      });

      it('returns 0', async () => {
        await expect(erc721warper.balanceOf(assetOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when querying the zero address', () => {
      it('throws', async () => {
        await expect(erc721warper.balanceOf(ADDRESS_ZERO)).to.be.revertedWith('BalanceQueryForZeroAddress');
      });
    });
  });
}
