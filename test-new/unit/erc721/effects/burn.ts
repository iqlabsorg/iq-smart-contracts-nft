import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ContractTransaction } from 'ethers';
import { ERC721WarperMock } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeBurn(): void {
  describe('_burn', function () {
    const firstTokenId = 1;
    const secondTokenId = 2;
    const nonExistentTokenId = 42;

    let warper: ERC721WarperMock;
    let assetOwner: SignerWithAddress;

    beforeEach(function () {
      warper = this.contracts.presets.core;
      assetOwner = this.signers.named['assetOwner'];
    });

    it('reverts when burning a non-existent token id', async function () {
      await expect(warper.burn(nonExistentTokenId)).to.be.revertedWithError(
        'OwnerQueryForNonexistentToken',
        nonExistentTokenId,
      );
    });

    context('with minted tokens', function () {
      beforeEach(async function () {
        await warper.mint(assetOwner.address, firstTokenId);
        await warper.mint(assetOwner.address, secondTokenId);
      });

      context('with burnt token', function () {
        let burnTx: ContractTransaction;

        beforeEach(async function () {
          burnTx = await warper.burn(firstTokenId);
        });

        it('emits a Transfer event', function () {
          expect(burnTx).to.be.emit(warper, 'Transfer').withArgs(assetOwner.address, AddressZero, firstTokenId);
        });

        it('emits an Approval event', function () {
          expect(burnTx).to.be.emit(warper, 'Approval').withArgs(assetOwner.address, AddressZero, firstTokenId);
        });

        it('deletes the token', async function () {
          await expect(warper.balanceOf(assetOwner.address)).to.eventually.equal('1');

          await expect(warper.ownerOf(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });

        it('reverts when burning a token id that has been deleted', async function () {
          await expect(warper.burn(firstTokenId)).to.be.revertedWithError(
            'OwnerQueryForNonexistentToken',
            firstTokenId,
          );
        });
      });
    });
  });
}
