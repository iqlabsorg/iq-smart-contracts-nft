import { shouldBehaveLikeListingManager } from './listing-manager/listing-manager.behaviour';
import { shouldBehaveLikeRentingManager } from './renting-manager/renting-manager.behaviour';
import { shouldBehaveLikeUUPSUpgradeable } from './uups-upgradeable/uups-upgradeable.behaviour';
import { shouldBehaveLikeWarperManager } from './warper-manager/waroer-manager.behaviour';

/**
 * Metahub tests
 */
export function shouldBehaveLikeMetahub(): void {
  shouldBehaveLikeUUPSUpgradeable();
  shouldBehaveLikeRentingManager();
  shouldBehaveLikeListingManager();
  shouldBehaveLikeWarperManager();
}
