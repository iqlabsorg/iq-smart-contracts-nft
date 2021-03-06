import { shouldBehaveLikeAssetManager } from './asset-manager/asset-manager.behaviour';
import { shouldBehaveLikeListingManager } from './listing-manager/listing-manager.behaviour';
import { shouldBehaveLikePaymentManager } from './payment-manager/payment-manager.behaviour';
import { shouldBehaveLikeRentingManager } from './renting-manager/renting-manager.behaviour';
import { shouldBehaveLikeUUPSUpgradeable } from './uups-upgradeable/uups-upgradeable.behaviour';
import { shouldBehaveLikeWarperManager } from './warper-manager/warper-manager.behaviour';

/**
 * Metahub tests
 */
export function shouldBehaveLikeMetahub(): void {
  shouldBehaveLikeUUPSUpgradeable();
  shouldBehaveLikeRentingManager();
  shouldBehaveLikeListingManager();
  shouldBehaveLikeWarperManager();
  shouldBehaveLikePaymentManager();
  shouldBehaveLikeAssetManager();
}
