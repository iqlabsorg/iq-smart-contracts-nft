import { shouldBehaveLikeCreateUniverse } from './effects/createUniverse';
import { shouldBehaveLikeUpgradeTo } from './effects/upgradeTo';
import { shouldBehaveWarperAndUniverseConfiguration } from './effects/warperConfiguration';
import { shouldBehaveGetWarperPresetFactory } from './view/getWarperPresetFactory';

/**
 * Metahub tests
 */
export function shouldBehaveLikeMetahub(): void {
  describe('View Functions', function () {
    shouldBehaveGetWarperPresetFactory();
  });

  describe('Effect Functions', function () {
    shouldBehaveWarperAndUniverseConfiguration();
    shouldBehaveLikeCreateUniverse();
    shouldBehaveLikeUpgradeTo();
  });
}
