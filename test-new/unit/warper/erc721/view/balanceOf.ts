import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { AddressZero } from '../../../../shared/types';

export function shouldBehaveLikeBalanceOf(): void {
  const firstTokenId = 1;
  const secondTokenId = 2;
  let nftTokenOwner: SignerWithAddress;
  let stranger: SignerWithAddress;

  beforeEach(async function () {
    nftTokenOwner = this.signers.unnamed[0];
    stranger = this.signers.unnamed[1];

    await this.contracts.presets.erc721Configurable
      .connect(this.mocks.metahub.wallet)
      .safeMint(nftTokenOwner.address, firstTokenId);
    await this.contracts.presets.erc721Configurable
      .connect(this.mocks.metahub.wallet)
      .safeMint(nftTokenOwner.address, secondTokenId);
  });

  describe('balanceOf', function () {
    context('when the given address owns some tokens', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        expect(await this.contracts.presets.erc721Configurable.balanceOf(nftTokenOwner.address)).to.be.equal('2');
      });
    });

    context('when the given address does not own any tokens', function () {
      it('returns 0', async function () {
        expect(await this.contracts.presets.erc721Configurable.balanceOf(stranger.address)).to.be.equal('0');
      });
    });

    context('when querying the zero address', function () {
      it('throws', async function () {
        await expect(this.contracts.presets.erc721Configurable.balanceOf(AddressZero)).to.be.revertedWith(
          'BalanceQueryForZeroAddress',
        );
      });
    });
  });
}
