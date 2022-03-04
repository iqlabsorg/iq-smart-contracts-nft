import { shouldBehaveLikeIsCompatibleWarper } from './views/isCompatibleWarper';

/**
 * Asset controller tests
 */
export function shouldBehaveAssetController(): void {
  describe('View Functions', function () {
    //todo: move to warper tests? Something along the lines of `shouldWorkWithERC721AssetController`
    shouldBehaveLikeIsCompatibleWarper();
  });

  describe('Effect Functions', function () {
    //todo
  });
}
