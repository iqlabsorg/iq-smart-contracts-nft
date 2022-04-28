import { shouldBehaveLikeApprove } from './_ERC721/approve';
import { shouldBehaveLikeSetApprovalForAl } from './_ERC721/set-approval-for-all';
import { shouldBehaveTransfer } from './_ERC721/transfers';
import { shouldBehaveLikeBalanceOf } from './_ERC721/balance-of';
import { shouldBehaveLikeGetApproved } from './_ERC721/get-approved';
import { shouldBehaveLikeOwnerOf } from './_ERC721/owner-of';

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
