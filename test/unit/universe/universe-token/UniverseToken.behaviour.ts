import { FakeContract } from '@defi-wonderland/smock';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { InterfacePrinter, IUniverseToken, Metahub } from '../../../../typechain';
import { AddressZero } from '../../../shared/types';

const tokenId = 1;

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeUniverseToken(): void {
  describe('Should behave like IUniverseToken', () => {
    let universeToken: IUniverseToken;
    let metahub: FakeContract<Metahub>;

    let universeOwner: SignerWithAddress;
    let interfacePrinter: InterfacePrinter;

    beforeEach(function () {
      metahub = this.mocks.metahub;
      interfacePrinter = this.mocks.interfacePrinter;
      universeToken = this.contracts.universeToken;

      universeOwner = this.signers.named.universeOwner;
    });

    describe('name', () => {
      it('returns Universe (NFT) token Name', async () => {
        await expect(universeToken.name()).to.eventually.eq('IQVerse');
      });
    });

    describe('symbol', () => {
      it('returns Universe (NFT) token symbol', async () => {
        await expect(universeToken.symbol()).to.eventually.eq('IQV');
      });
    });

    describe('supportsInterface', () => {
      it('supports IUniverseToken interface', async () => {
        const iUniverseTokenInterfaceId = await interfacePrinter.universeToken();
        await expect(universeToken.supportsInterface(iUniverseTokenInterfaceId)).to.eventually.eq(true);
      });

      it('supports ERC721 interface', async () => {
        const erc721InterfaceId = await interfacePrinter.erc721();
        await expect(universeToken.supportsInterface(erc721InterfaceId)).to.eventually.eq(true);
      });
    });

    describe('mint', () => {
      context('Caller is registry', () => {
        it('mints the account to the passed address', async () => {
          const tx = await universeToken.connect(metahub.wallet).mint(universeOwner.address);

          await expect(tx).to.emit(universeToken, 'Transfer').withArgs(AddressZero, universeOwner.address, tokenId);
          await expect(universeToken.ownerOf(tokenId)).to.eventually.eq(universeOwner.address);
        });
      });

      context('Caller is not registry', () => {
        it('reverts', async () => {
          await expect(universeToken.mint(universeOwner.address)).to.be.revertedWith('CallerIsNotRegistry()');
        });
      });
    });

    describe('tokenURI', () => {
      context('When token minted', () => {
        beforeEach(async () => {
          await universeToken.connect(metahub.wallet).mint(universeOwner.address);
        });

        it('returns token URI', async () => {
          await expect(universeToken.tokenURI(tokenId)).to.eventually.eq('');
        });
      });
    });
  });
}
