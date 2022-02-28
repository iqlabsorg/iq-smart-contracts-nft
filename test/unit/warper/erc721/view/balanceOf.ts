import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../typechain';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  let warper: ERC721Warper;
  let metahub: FakeContract<Metahub>;

  let nftTokenOwner: SignerWithAddress;

  beforeEach(function () {
    nftTokenOwner = this.signers.unnamed[0];
    metahub = this.mocks.metahub;
    warper = this.contracts.presets.core;
  });

  describe('balanceOf', () => {
    context('when the given address has rented some tokens', () => {
      const activeRentalCount = 10;
      beforeEach(() => {
        metahub.getActiveWarperRentalCount.returns(activeRentalCount);
      });

      it('returns the amount of tokens owned by the given address', async () => {
        await expect(warper.balanceOf(nftTokenOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when the given address has not rented any tokens', () => {
      const activeRentalCount = 0;
      beforeEach(() => {
        metahub.getActiveWarperRentalCount.returns(activeRentalCount);
      });

      it('returns 0', async () => {
        await expect(warper.balanceOf(nftTokenOwner.address)).to.eventually.equal(activeRentalCount);
      });
    });

    context('when querying the zero address', () => {
      it('throws', async () => {
        await expect(warper.balanceOf(AddressZero)).to.be.revertedWith('BalanceQueryForZeroAddress');
      });
    });
  });
}
