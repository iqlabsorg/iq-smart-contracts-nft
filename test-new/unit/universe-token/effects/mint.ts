import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ContractTransaction } from 'ethers';
import { UniverseToken } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

const UNIVERSE_NAME = 'Universe One';

export function shouldBehaveLikeMint(): void {
  describe('mint', function () {
    const tokenId = 1;
    const universeName = 'Universe One';

    let universe: UniverseToken;
    let universeOwner: SignerWithAddress;
    let metahub: SignerWithAddress;
    let firstMintTx: ContractTransaction;

    beforeEach(function () {
      universe = this.contracts.universeToken;
      universeOwner = this.signers.named['universeOwner'];
      metahub = this.mocks.metahub.wallet as SignerWithAddress;
    });

    it('reverts when mint msg.sender is not metahub', async function () {
      await expect(universe.mint(universeOwner.address, universeName)).to.be.revertedWithError('CallerIsNotMetahub');
    });

    describe('Minting', () => {
      it('owner cannot mint', async () => {
        await expect(universe.mint(universeOwner.address, UNIVERSE_NAME)).to.be.revertedWithError('CallerIsNotMetahub');
      });

      it('metahub can mint', async () => {
        await expect(universe.connect(metahub).mint(universeOwner.address, UNIVERSE_NAME))
          .to.emit(universe, 'Transfer')
          .withArgs(AddressZero, universeOwner.address, 1);
        await expect(universe.ownerOf(1)).to.eventually.eq(universeOwner.address);
      });
    });

    context('when mint msg.sender is metahub', function () {
      beforeEach(async function () {
        firstMintTx = await universe.connect(this.mocks.metahub.wallet).mint(universeOwner.address, universeName);
      });

      it('emits a Transfer event', function () {
        expect(firstMintTx).to.be.emit(universe, 'Transfer').withArgs(AddressZero, universeOwner.address, tokenId);
      });

      context('when minted', function () {
        it('returns token URI', async function () {
          await expect(universe.tokenURI(tokenId)).to.eventually.eq('');
        });

        it('returns universe name', async function () {
          await expect(universe.universeName(tokenId)).to.eventually.eq(universeName);
        });
      });
    });
  });
}
