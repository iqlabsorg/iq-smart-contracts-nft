import { expect } from 'chai';
import { ContractTransaction } from 'ethers';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeBurn(): void {
  describe('_burn', function () {
    const firstTokenId = 1;
    const secondTokenId = 2;
    const nonExistentTokenId = 42;

    it('reverts when burning a non-existent token id', async function () {
      await expect(this.contracts.erc721Warper.burn(nonExistentTokenId)).to.be.revertedWithError(
        'OwnerQueryForNonexistentToken',
        nonExistentTokenId,
      );
    });

    context('with minted tokens', function () {
      beforeEach(async function () {
        await this.contracts.erc721Warper.mint(this.signers.nftTokenOwner.address, firstTokenId);
        await this.contracts.erc721Warper.mint(this.signers.nftTokenOwner.address, secondTokenId);
      });

      context('with burnt token', function () {
        let burnTx: ContractTransaction;

        beforeEach(async function () {
          burnTx = await this.contracts.erc721Warper.burn(firstTokenId);
        });

        it('emits a Transfer event', function () {
          expect(burnTx)
            .to.be.emit(this.contracts.erc721Warper, 'Transfer')
            .withArgs(this.signers.nftTokenOwner.address, AddressZero, firstTokenId);
        });

        it('emits an Approval event', function () {
          expect(burnTx)
            .to.be.emit(this.contracts.erc721Warper, 'Approval')
            .withArgs(this.signers.nftTokenOwner.address, AddressZero, firstTokenId);
        });

        it('deletes the token', async function () {
          await expect(this.contracts.erc721Warper.balanceOf(this.signers.nftTokenOwner.address)).to.eventually.equal(
            '1',
          );

          await expect(this.contracts.erc721Warper.ownerOf(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });

        it('reverts when burning a token id that has been deleted', async function () {
          await expect(this.contracts.erc721Warper.burn(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });
      });
    });
  });
}
