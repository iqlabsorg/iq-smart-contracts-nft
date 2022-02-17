import { shouldBehaveLikeBurn } from './effects/burn';
import { shouldBehaveLikeBalanceOf } from './view/balanceOf';

/**
 * Core functionality tests of public ERC721 warper methods
 */
export function shouldBehaveLikeERC721(): void {
  describe('View Functions', function () {
    shouldBehaveLikeBalanceOf();
  });
}

/**
 * We're testing internal methods that exist on the ERC721 Warper but do not
 * get exposed publicly on presets.
 */
export function shouldBehaveLikeERC721HiddenMethods(): void {
  describe('Effects Functions', function () {
    shouldBehaveLikeBurn();
  });
}
