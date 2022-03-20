import { FakeContract } from '@defi-wonderland/smock';
import { ERC721Warper, ERC721WarperController, Metahub } from '../../../../typechain';
import { shouldBehaveLikeApprove } from './_ERC721/effects/approve';
import { shouldBehaveLikeSetApprovalForAl } from './_ERC721/effects/setApprovalForAll';
import { shouldBehaveTransfer } from './_ERC721/effects/transfers';
import { shouldBehaveLikeBalanceOf } from './_ERC721/view/balanceOf';
import { shouldBehaveLikeGetApproved } from './_ERC721/view/getApproved';
import { shouldBehaveLikeOwnerOf } from './_ERC721/view/ownerOf';

declare module 'mocha' {
  interface Context {
    erc721Warper: {
      underTest: ERC721Warper;
      erc721WarperController: ERC721WarperController;
      metahub: FakeContract<Metahub>;
    };
  }
}

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
