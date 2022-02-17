import { unitFixtureERC721WarperConfigurable, unitFixtureERC721WarperMock } from '../../shared/fixtures';
import { shouldBehaveLikeERC721, shouldBehaveLikeERC721HiddenMethods } from './ERC721.behaviour';

export function unitTestERC721Warper(): void {
  describe('ERC721Warper Internals', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT } = await this.loadFixture(unitFixtureERC721WarperMock);
      this.mocks.assets.erc721 = oNFT;
      this.mocks.metahub = metahub;
      this.contracts.presets.core = erc721Warper;
    });

    shouldBehaveLikeERC721HiddenMethods();
  });

  describe('ERC721Warper Configurable', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT } = await this.loadFixture(unitFixtureERC721WarperConfigurable);
      this.mocks.assets.erc721 = oNFT;
      this.mocks.metahub = metahub;
      this.contracts.presets.erc721Configurable = erc721Warper;
    });

    shouldBehaveLikeERC721();
  });
}
