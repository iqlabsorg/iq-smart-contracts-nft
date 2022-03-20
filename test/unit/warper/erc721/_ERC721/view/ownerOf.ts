import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Warper, Metahub } from '../../../../../../typechain';
import { AssetRentalStatus } from '../../../../../shared/utils';

export function shouldBehaveLikeOwnerOf(): void {
  describe('ownerOf', () => {
    const mintedTokenId = 4455666;

    beforeEach(async function () {
      this.erc721Warper.metahub.warperController.returns(this.erc721Warper.erc721WarperController.address);

      await this.erc721Warper.underTest
        .connect(this.erc721Warper.metahub.wallet)
        .mint(this.signers.named['assetOwner'].address, mintedTokenId, '0x');
    });

    context('when the token has never been rented', () => {
      beforeEach(function () {
        this.erc721Warper.metahub.assetRentalStatus.returns(AssetRentalStatus.NONE);
      });

      it('reverts', async function () {
        await expect(this.erc721Warper.underTest.ownerOf(mintedTokenId)).to.be.revertedWith(
          `OwnerQueryForNonexistentToken(${mintedTokenId})`,
        );
      });
    });

    context('when the token has been minted but currently has not been rented', () => {
      beforeEach(function () {
        this.erc721Warper.metahub.assetRentalStatus.returns(AssetRentalStatus.AVAILABLE);
      });

      it('returns metahub address', async function () {
        await expect(this.erc721Warper.underTest.ownerOf(mintedTokenId)).to.eventually.equal(
          this.erc721Warper.metahub.address,
        );
      });
    });

    context('when the token is currently rented', () => {
      beforeEach(function () {
        this.erc721Warper.metahub.assetRentalStatus.returns(AssetRentalStatus.RENTED);
      });

      it('returns the current owner of the token', async function () {
        await expect(this.erc721Warper.underTest.ownerOf(mintedTokenId)).to.eventually.equal(
          this.signers.named['assetOwner'].address,
        );
      });
    });
  });
}
