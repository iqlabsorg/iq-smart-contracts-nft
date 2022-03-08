import { shouldBehaveLikeApprove } from './effects/approve';
import { shouldBehaveLikeSetApprovalForAl } from './effects/setApprovalForAll';
import { shouldBehaveTransfer } from './effects/transfers';
import { shouldBehaveLikeBalanceOf } from './view/balanceOf';
import { shouldBehaveLikeGetApproved } from './view/getApproved';
import { shouldBehaveLikeOwnerOf } from './view/ownerOf';

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
