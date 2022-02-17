import { shouldBehaveLikeBurn } from './effects/burn';

export function shouldBehaveLikeERC721(): void {
  describe('Effects Functions', function () {
    shouldBehaveLikeBurn();
  });
}
