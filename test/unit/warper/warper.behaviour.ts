import { shouldBehaveLikeRejectERC20TokenInterface } from './effects/interfaceCompatibility';
import { shouldBehaveLikeMulticall } from './effects/multicall';
import { shouldBehaveLikeAbleToForwardCalls } from './views/forwardCalls';
import { shouldBehaveLikeGetMetahub } from './views/getMetahub';
import { shouldBehaveLikeGetOriginal } from './views/getOriginal';

/**
 * Core warper method functionality
 */
export function shouldBehaveLikeWarper(): void {
  describe('View Functions', function () {
    shouldBehaveLikeGetOriginal();
    shouldBehaveLikeGetMetahub();
    shouldBehaveLikeAbleToForwardCalls();
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeRejectERC20TokenInterface();
    shouldBehaveLikeMulticall();
  });
}
