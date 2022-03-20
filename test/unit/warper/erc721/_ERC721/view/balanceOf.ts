import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../../typechain';
import { AddressZero } from '../../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  describe('balanceOf', () => {
    const mintedTokenId = 4455666;

    beforeEach(async function () {
      this.erc721Warper.metahub.warperController.returns(this.erc721Warper.erc721WarperController.address);

      await this.erc721Warper.underTest
        .connect(this.erc721Warper.metahub.wallet)
        .mint(this.signers.named['assetOwner'].address, mintedTokenId, '0x');
    });

    context('when the given address has rented some tokens', () => {
      const activeRentalCount = 10;
      beforeEach(function () {
        this.erc721Warper.metahub.collectionRentedValue.returns(activeRentalCount);
      });

      it('returns the amount of tokens owned by the given address', async function () {
        await expect(
          this.erc721Warper.underTest.balanceOf(this.signers.named['assetOwner'].address),
        ).to.eventually.equal(activeRentalCount);
      });
    });

    context('when the given address has not rented any tokens', () => {
      const activeRentalCount = 0;
      beforeEach(function () {
        this.erc721Warper.metahub.collectionRentedValue.returns(activeRentalCount);
      });

      it('returns 0', async function () {
        await expect(
          this.erc721Warper.underTest.balanceOf(this.signers.named['assetOwner'].address),
        ).to.eventually.equal(activeRentalCount);
      });
    });

    context('when querying the zero address', () => {
      it('throws', async function () {
        await expect(this.erc721Warper.underTest.balanceOf(AddressZero)).to.be.revertedWith(
          'BalanceQueryForZeroAddress',
        );
      });
    });
  });
}
