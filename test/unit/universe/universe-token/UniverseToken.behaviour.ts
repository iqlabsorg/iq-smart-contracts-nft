import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ContractTransaction, Signer } from 'ethers';
import { IUniverseToken, Metahub } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeUniverseToken(): void {
  describe('Universe token tests', () => {
    const tokenId = 1;

    let universeToken: IUniverseToken;
    let metahub: FakeContract<Metahub>;

    let universeOwner: SignerWithAddress;

    beforeEach(async function () {
      metahub = this.mocks.metahub;
      universeToken = this.contracts.universeToken;

      universeOwner = this.signers.named['universeOwner'];

      await universeToken.connect(metahub.wallet).mint(universeOwner.address);
    });
    describe('View Functions', function () {
      describe('Universe (NFT) token Name', () => {
        it('has correct token name', async () => {
          await expect(universeToken.name()).to.eventually.eq('IQVerse');
        });
      });

      describe('Like Correct Token Symbol', () => {
        describe('Universe (NFT) token symbol', () => {
          it('has correct token symbol', async () => {
            await expect(universeToken.symbol()).to.eventually.eq('IQV');
          });
        });
      });

      describe('Correct Interface Support', () => {
        it('Supports IUniverse token interface');
      });
    });

    describe('Effect Functions', function () {
      describe('mint', function () {
        it('reverts when mint msg.sender is not metahub', async function () {
          await expect(universeToken.mint(universeOwner.address)).to.be.revertedWith('CallerIsNotRegistry()');
        });

        describe('Minting', () => {
          it('owner cannot mint', async () => {
            await expect(universeToken.mint(universeOwner.address)).to.be.revertedWith('CallerIsNotRegistry()');
          });

          it('metahub can mint', async () => {
            await expect(universeToken.connect(metahub.wallet).mint(universeOwner.address))
              .to.emit(universeToken, 'Transfer')
              .withArgs(AddressZero, universeOwner.address, 2);
            await expect(universeToken.ownerOf(2)).to.eventually.eq(universeOwner.address);
          });
        });

        context('when mint msg.sender is metahub', function () {
          let mintTx: ContractTransaction;

          beforeEach(async function () {
            mintTx = await universeToken.connect(metahub.wallet).mint(universeOwner.address);
          });

          it('emits a Transfer event', function () {
            expect(mintTx).to.be.emit(universeToken, 'Transfer').withArgs(AddressZero, universeOwner.address, 2);
          });

          context('when minted', function () {
            it('returns token URI', async function () {
              await expect(universeToken.tokenURI(tokenId)).to.eventually.eq('');
            });
          });
        });
      });
    });
  });
}
