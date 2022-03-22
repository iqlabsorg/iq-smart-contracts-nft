import { shouldBehaveLikeMint } from './effects/mint';
import { shouldBehaveLikeCorrectInterfaceSupport } from './views/interfaceSupport';
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
    shouldBehaveLikeCorrectInterfaceSupport();
  });

  describe('Effects Functions', function () {
    shouldBehaveLikeMint();
  });
}
