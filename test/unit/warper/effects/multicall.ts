import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ERC721Mock, Warper } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

export function shouldBehaveLikeMulticall(): void {
  describe('Multicall methods', function () {
    let warper: Warper;
    let underlying: ERC721Mock;

    let tokenOwner: SignerWithAddress;

    beforeEach(function () {
      warper = this.contracts.presets.agnosticWarper;
      underlying = this.mocks.assets.erc721;

      [tokenOwner] = this.signers.unnamed;
    });

    describe('Forward multiple calls to the underlying asset', () => {
      context('Call the mint method multiple times', () => {
        it('mints n tokens', async () => {
          // Construct the call
          const call1 = underlying.interface.encodeFunctionData('mint', [tokenOwner.address, 1]);
          const call2 = underlying.interface.encodeFunctionData('mint', [tokenOwner.address, 22]);
          const call3 = underlying.interface.encodeFunctionData('mint', [tokenOwner.address, 42]);

          // Execute the call
          const tx = await warper.multicall([call1, call2, call3]);

          // Assert the call
          await expect(tx).to.emit(underlying, 'Transfer').withArgs(AddressZero, tokenOwner.address, 1);
          await expect(tx).to.emit(underlying, 'Transfer').withArgs(AddressZero, tokenOwner.address, 22);
          await expect(tx).to.emit(underlying, 'Transfer').withArgs(AddressZero, tokenOwner.address, 42);
        });
      });
    });
  });
}
