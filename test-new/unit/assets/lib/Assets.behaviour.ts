import { shouldBehaveLikeConstructAssets } from './view/constructAsset';

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeAssetsLibrary(): void {
  describe('View Functions', function () {
    shouldBehaveLikeConstructAssets();
  });
}
