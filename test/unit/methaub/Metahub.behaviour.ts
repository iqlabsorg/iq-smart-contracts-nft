import { shouldBehaveLikeListingManager } from './listing-manager/ListingManager.behaviour';
import { shouldBehaveLikeRentingManager } from './renting-manager/RentingManager.behaviour';
import { shouldBehaveLikeUniverseManager } from './universe-manager/UniverseManager.behaviour';
import { shouldBehaveLikeUUPSUpgradeable } from './uups-upgradeable/UUPSUpgradeable.behaviour';
import { shouldBehaveLikeWarperManager } from './warper-manager/WarperManager.behaviour';

/**
 * Metahub tests
 */
export function shouldBehaveLikeMetahub(): void {
  shouldBehaveLikeUUPSUpgradeable();
  shouldBehaveLikeWarperManager();
  shouldBehaveLikeUniverseManager();
  shouldBehaveLikeRentingManager();
  shouldBehaveLikeListingManager();
}
