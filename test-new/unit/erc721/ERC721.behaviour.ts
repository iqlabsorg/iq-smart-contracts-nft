import { shouldBehaveLikeApprove } from './effects/approve';
import { shouldBehaveLikeSetApprovalForAl } from './effects/setApprovalForAll';
import { shouldBehaveTransfer } from './effects/transfers';
import { shouldBehaveLikeGetApproved } from './view/getApproved';

/**
 * Core functionality tests of public ERC721 warper methods
 */
export function shouldBehaveLikeERC721(): void {
  describe('View Functions', function () {
    shouldBehaveLikeGetApproved();
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeSetApprovalForAl();
    shouldBehaveLikeApprove();
    shouldBehaveTransfer();
  });
}
