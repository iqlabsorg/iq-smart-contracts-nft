import { shouldBehaveLikeApprove } from './_ERC721/effects/approve';
import { shouldBehaveLikeSetApprovalForAl } from './_ERC721/effects/setApprovalForAll';
import { shouldBehaveTransfer } from './_ERC721/effects/transfers';
import { shouldBehaveLikeBalanceOf } from './_ERC721/view/balanceOf';
import { shouldBehaveLikeGetApproved } from './_ERC721/view/getApproved';
import { shouldBehaveLikeOwnerOf } from './_ERC721/view/ownerOf';

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
