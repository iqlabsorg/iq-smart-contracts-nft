import { shouldBehaveLikeMint } from './effects/mint';
import { shouldBehaveLikeCorrectInterfaceSupport } from './views/interfaceSupport';
import { shouldBehaveLikeCorrectOwner } from './views/owner';
import { shouldBehaveLikeCorrectTokenName } from './views/tokenName';
import { shouldBehaveLikeCorrectTokenSymbol } from './views/tokenSymbol';
import { shouldBehaveLikeUniverseName } from './views/universeName';

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeUniverseToken(): void {
  describe('View Functions', function () {
    shouldBehaveLikeUniverseName();
    shouldBehaveLikeCorrectTokenName();
    shouldBehaveLikeCorrectTokenSymbol();
    shouldBehaveLikeCorrectOwner();
    shouldBehaveLikeCorrectInterfaceSupport();
  });

  describe('Effects Functions', function () {
    shouldBehaveLikeMint();
  });
}
