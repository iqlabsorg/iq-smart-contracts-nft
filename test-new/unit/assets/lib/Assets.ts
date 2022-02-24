import { unitFixtureAssetsLib } from '../../../shared/fixtures';
import { shouldBehaveLikeAssetsLibrary } from './Assets.behaviour';

export function unitTestAssetsLibrary(): void {
  describe('Assets library', function () {
    beforeEach(async function () {
      const { assetsLib } = await this.loadFixture(unitFixtureAssetsLib);

      this.mocks.assetsLib = assetsLib;
    });

    shouldBehaveLikeAssetsLibrary();
  });
}
