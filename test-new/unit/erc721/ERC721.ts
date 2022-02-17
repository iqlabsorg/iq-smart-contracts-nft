import { unitFixtureERC721Warper } from '../../shared/fixtures';
import { shouldBehaveLikeERC721 } from './ERC721.behaviour';

export function unitTestERC721WarperCore(): void {
  describe('ERC721Warper Core', function () {
    beforeEach(async function () {
      const { erc721Warper } = await this.loadFixture(unitFixtureERC721Warper);
      this.contracts.erc721Warper = erc721Warper;
    });

    shouldBehaveLikeERC721();
  });
}
