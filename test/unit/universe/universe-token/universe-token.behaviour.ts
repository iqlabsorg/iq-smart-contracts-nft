import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { InterfacePrinter, IUniverseRegistry, IUniverseToken } from '../../../../typechain';
import { ADDRESS_ZERO } from '../../../shared/types';
import hre from 'hardhat';

const tokenId = 1;

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeUniverseToken(): void {
  describe('IUniverseToken', () => {
    let universeToken: IUniverseToken;
    let universeRegistry: IUniverseRegistry;

    let interfacePrinter: InterfacePrinter;
    let universeRegistrySigner: SignerWithAddress;
    let universeOwner: SignerWithAddress;

    beforeEach(async function () {
      universeToken = this.contracts.universeToken;
      universeRegistry = this.contracts.universeRegistry;
      interfacePrinter = this.mocks.interfacePrinter;

      universeOwner = this.signers.named.universeOwner;

      // Impersonate Universe Registry contract to be able to call Universe Token on its behalf.
      await hre.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [universeRegistry.address],
      });
      universeRegistrySigner = await hre.ethers.getSigner(universeRegistry.address);
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
      context('When caller is universe registry', () => {
        it('emits Transfer event', async () => {
          await expect(universeToken.connect(universeRegistrySigner).mint(universeOwner.address))
            .to.emit(universeToken, 'Transfer')
            .withArgs(ADDRESS_ZERO, universeOwner.address, tokenId);
        });

        it('mints the token to the provided account address', async () => {
          await universeToken.connect(universeRegistrySigner).mint(universeOwner.address);
          await expect(universeToken.ownerOf(tokenId)).to.eventually.eq(universeOwner.address);
        });
      });

      context('When caller is not universe registry', () => {
        it('reverts', async () => {
          await expect(universeToken.mint(universeOwner.address)).to.be.revertedWith('CallerIsNotRegistry()');
        });
      });
    });

    describe('tokenURI', () => {
      context('When token is not minted', () => {
        it('reverts', async () => {
          await expect(universeToken.tokenURI(tokenId)).to.be.revertedWith(
            'ERC721Metadata: URI query for nonexistent token',
          );
        });
      });
      context('When token is minted', () => {
        beforeEach(async () => {
          await universeToken.connect(universeRegistrySigner).mint(universeOwner.address);
        });

        context('When the base URI is not set', () => {
          it('returns empty string', async () => {
            await expect(universeToken.tokenURI(tokenId)).to.eventually.eq('');
          });
        });

        context('When the base URI is set', () => {
          const baseURI = 'https://example.com/';
          beforeEach(async () => {
            await universeRegistry.setUniverseTokenBaseURI(baseURI);
          });

          it('returns correct token URI', async () => {
            await expect(universeToken.tokenURI(tokenId)).to.eventually.eq(`${baseURI}${tokenId}`);
          });
        });
      });
    });
  });
}
