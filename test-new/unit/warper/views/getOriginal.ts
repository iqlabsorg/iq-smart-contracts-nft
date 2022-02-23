import { expect } from 'chai';
import { ERC721Mock, ERC721Warper } from '../../../../typechain';

export function shouldBehaveLikeGetOriginal(): void {
  describe('__original', function () {
    let warper: ERC721Warper;
    let originalNft: ERC721Mock;

    beforeEach(function () {
      warper = this.contracts.presets.core;
      originalNft = this.mocks.assets.erc721;
    });

    it('returns the original asset address', async () => {
      await expect(warper.__original()).to.eventually.eq(originalNft.address);
    });
  });
}
