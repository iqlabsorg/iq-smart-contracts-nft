import { shouldBehaveLikeGetter } from './views/genericGetter';
import { shouldBehaveLikeSetMinRentalPeriod } from './effects/setMinRentalPeriod';
import { shouldBehaveLikeSetMaxRentalPeriod } from './effects/setMaxRentalPeriod';
import { shouldBehaveLikeAvailabilityPeriodStart } from './effects/setAvailabilityPeriodStart';
import { shouldBehaveLikeAvailabilityPeriodEnd } from './effects/setAvailabilityPeriodEnd';

const MaxUint32 = 2 ** 32 - 1;

/**
 * Core warper method functionality
 */
export function shouldBehaveLikeERC721Configurable(): void {
  describe('View Functions', function () {
    shouldBehaveLikeGetter({ param: 'availabilityPeriodStart', expectedValue: 0 });
    shouldBehaveLikeGetter({ param: 'availabilityPeriodEnd', expectedValue: MaxUint32 });
    shouldBehaveLikeGetter({ param: 'minRentalPeriod', expectedValue: 0 });
    shouldBehaveLikeGetter({ param: 'maxRentalPeriod', expectedValue: MaxUint32 });
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeSetMinRentalPeriod();
    shouldBehaveLikeSetMaxRentalPeriod();
    shouldBehaveLikeAvailabilityPeriodStart();
    shouldBehaveLikeAvailabilityPeriodEnd();
  });
}
