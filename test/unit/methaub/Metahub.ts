import { unitFixtureMetahub } from '../../shared/fixtures';
import { shouldBehaveLikeMetahub } from './Metahub.behaviour';

export function unitTestMetahub(): void {
  describe('Metahub', function () {
    beforeEach(async function () {
      const { metahub, originalAsset, universeToken, warperPresetFactory } = await this.loadFixture(unitFixtureMetahub);
      this.mocks.assets.erc721 = originalAsset;
      this.contracts.metahub = metahub;
      this.contracts.universeToken = universeToken;
      this.contracts.warperPresetFactory = warperPresetFactory;
    });

    shouldBehaveLikeMetahub();
  });
}
