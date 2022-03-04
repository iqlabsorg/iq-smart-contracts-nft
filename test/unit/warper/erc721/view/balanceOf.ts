import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../typechain';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  let erc721Warper: ERC721Warper;
  let metahub: FakeContract<Metahub>;

  let nftTokenOwner: SignerWithAddress;

  beforeEach(function () {
    nftTokenOwner = this.signers.unnamed[0];
    metahub = this.mocks.metahub;
    erc721Warper = this.contracts.presets.erc721Warper;
  });

  describe('balanceOf', () => {
    context('when the given address has rented some tokens', () => {
      const activeRentalCount = 10;
      beforeEach(() => {
        metahub.getActiveWarperRentalCount.returns(activeRentalCount);
      });

      it('returns the amount of tokens owned by the given address', async () => {
        await expect(erc721Warper.balanceOf(nftTokenOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when the given address has not rented any tokens', () => {
      const activeRentalCount = 0;
      beforeEach(() => {
        metahub.getActiveWarperRentalCount.returns(activeRentalCount);
      });

      it('returns 0', async () => {
        await expect(erc721Warper.balanceOf(nftTokenOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when querying the zero address', () => {
      it('throws', async () => {
        await expect(erc721Warper.balanceOf(AddressZero)).to.be.revertedWith('BalanceQueryForZeroAddress');
      });
    });
  });
}
