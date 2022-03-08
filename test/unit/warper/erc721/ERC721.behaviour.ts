import { shouldBehaveLikeApprove } from './base/effects/approve';
import { shouldBehaveLikeSetApprovalForAl } from './base/effects/setApprovalForAll';
import { shouldBehaveTransfer } from './base/effects/transfers';
import { shouldBehaveLikeBalanceOf } from './base/view/balanceOf';
import { shouldBehaveLikeGetApproved } from './base/view/getApproved';
import { shouldBehaveLikeOwnerOf } from './base/view/ownerOf';

/**
 * Core functionality tests of public ERC721 warper methods
 */
export function shouldBehaveLikeERC721Warper(): void {
  describe('View Functions', function () {
    shouldBehaveLikeGetApproved();
    shouldBehaveLikeOwnerOf();
    shouldBehaveLikeBalanceOf();
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeSetApprovalForAl();
    shouldBehaveLikeApprove();
    shouldBehaveTransfer();
  });
}
