import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { UniverseToken } from '../../../../typechain';

export function shouldBehaveLikeUniverseName(): void {
  const tokenId = 1;
  const randomTokenId = 12;
  const universeName = 'Universe One';

  let universe: UniverseToken;
  let universeOwner: SignerWithAddress;

  beforeEach(async function () {
    universe = this.contracts.universeToken;
    universeOwner = this.signers.named['universeOwner'];

    await universe.connect(this.mocks.metahub.wallet).mint(universeOwner.address, universeName);
  });

  describe('universeName', () => {
    context('when the given token id is minted', () => {
      it('returns the universe name of universe that exists', async () => {
        expect(await universe.universeName(tokenId)).to.be.equal(universeName);
      });
    });

    context('when the given token id is not minted', () => {
      it('returns empty string', async () => {
        expect(await universe.universeName(randomTokenId)).to.be.equal('');
      });
    });
  });
}
