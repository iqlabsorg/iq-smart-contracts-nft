import { ERC721Warper } from '../../../typechain';
import { unitFixtureERC721WarperConfigurable, unitFixtureERC721WarperMock } from '../../shared/fixtures';
import { shouldBehaveLikeERC721 } from './ERC721.behaviour';

export function unitTestERC721Warper(): void {
  describe('ERC721Warper Configurable', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT } = await this.loadFixture(unitFixtureERC721WarperConfigurable);
      this.mocks.assets.erc721 = oNFT;
      this.mocks.metahub = metahub;
      this.contracts.presets.erc721Configurable = erc721Warper;
      this.contracts.presets.core = erc721Warper as unknown as ERC721Warper;
    });

    shouldBehaveLikeERC721();
  });
}
