import { shouldBehaveLikeApprove } from './_ERC721/approve';
import { shouldBehaveLikeSetApprovalForAl } from './_ERC721/setApprovalForAll';
import { shouldBehaveTransfer } from './_ERC721/transfers';
import { shouldBehaveLikeBalanceOf } from './_ERC721/balanceOf';
import { shouldBehaveLikeGetApproved } from './_ERC721/getApproved';
import { shouldBehaveLikeOwnerOf } from './_ERC721/ownerOf';

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
