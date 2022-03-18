import { IUniverseManager } from '../../../typechain';
import { AssetClass, createUniverse } from '../../shared/utils';
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
  shouldBehaveLikeUniverseManager();
  shouldBehaveLikeRentingManager();

  describe('listing-manager', () => {
    beforeEach(async function () {
      // Note: tests are depending on pre-existing behaviour defined by the IAssetClassManager
      await this.contracts.assetClassRegistry.registerAssetClass(AssetClass.ERC721, {
        controller: this.listingManager.erc721Controller.address,
        vault: this.listingManager.erc721Vault.address,
      });
    });
    shouldBehaveLikeListingManager();
  });

  describe('warper-manager', () => {
    beforeEach(async function () {
      // Note: tests are depending on pre-existing behaviour defined by the IUniverseManager
      this.warperManager.universeId = await createUniverse(
        this.warperManager.underTest as unknown as IUniverseManager,
        {
          name: 'IQ Universe',
          rentalFeePercent: 1000,
        },
      );
    });

    shouldBehaveLikeWarperManager();
  });
}
