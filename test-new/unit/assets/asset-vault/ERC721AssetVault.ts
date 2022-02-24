import { unitFixtureERC721AssetsVault } from '../../../shared/fixtures';
import { shouldBehaveLikeERC721AssetVault } from './ERC721AssetVault.behaviour';

export function unitTestERC721AssetVault(): void {
  describe('ERC721AssetVault', function () {
    beforeEach(async function () {
      const { vault, asset } = await this.loadFixture(unitFixtureERC721AssetsVault);
      this.contracts.assetVault = vault;
      this.mocks.assets.erc721 = asset;
    });

    shouldBehaveLikeERC721AssetVault();
  });
}
