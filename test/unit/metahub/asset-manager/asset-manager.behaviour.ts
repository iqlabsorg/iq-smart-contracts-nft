import { expect } from 'chai';
import { IAssetManager } from '../../../../typechain';

export function shouldBehaveLikeAssetManager(): void {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  describe('AssetManager', function () {
    let assetManager: IAssetManager;

    beforeEach(function () {
      assetManager = this.contracts.assetManager;
    });

    describe('supportedAssetCount', () => {
      context('When warpers are not registered', () => {
        it('returns 0', async () => {
          await expect(assetManager.supportedAssetCount()).to.eventually.eq(0);
        });
      });
    });

    // TODO add the rest of the methods
  });
}
