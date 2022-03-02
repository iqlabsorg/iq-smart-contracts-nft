import { ERC721Warper, IWarperPreset, Warper } from '../../../typechain';
import { unitFixtureERC721WarperConfigurable } from '../../shared/fixtures';
import { shouldBehaveLikeERC721, shouldBehaveLikeERC721Configurable } from './erc721';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export function unitTestWarpers(): void {
  describe('ERC721Warper Configurable', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT, erc20Token, uninitializedErc721Warper } = await this.loadFixture(
        unitFixtureERC721WarperConfigurable,
      );
      this.mocks.assets.erc721 = oNFT;
      this.mocks.assets.erc20 = erc20Token;
      this.mocks.metahub = metahub;
      this.contracts.presets.erc721Configurable = erc721Warper;
      this.contracts.presets.core = erc721Warper as unknown as ERC721Warper;
      this.contracts.presets.genericPreset = uninitializedErc721Warper as unknown as IWarperPreset;
      this.contracts.presets.agnosticWarper = erc721Warper as unknown as Warper;
    });

    // shouldBehaveLikeERC721(); // todo: turn back on once warpers tests have been fixed
    shouldBehaveLikeWarper();
    shouldBehaveLikeERC721Configurable();
  });
}
