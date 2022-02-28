import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  let nftTokenOwner: SignerWithAddress;
  let stranger: SignerWithAddress;

  beforeEach(function () {
    nftTokenOwner = this.signers.unnamed[0];
    stranger = this.signers.unnamed[1];
  });

  describe.skip('balanceOf', function () {
    context('when the given address has rented some tokens', function () {
      it('returns the amount of tokens owned by the given address');
    });

    context('when the given address has not rented any tokens', function () {
      it('returns 0');
    });

    context('when querying the zero address', function () {
      it('throws');
    });
  });
}
