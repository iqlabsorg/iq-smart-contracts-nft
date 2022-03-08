import { shouldBehaveLikeGetter } from './configurable/views/genericGetter';
import { shouldBehaveLikeSetMinRentalPeriod } from './configurable/effects/setMinRentalPeriod';
import { shouldBehaveLikeSetMaxRentalPeriod } from './configurable/effects/setMaxRentalPeriod';
import { shouldBehaveLikeAvailabilityPeriodStart } from './configurable/effects/setAvailabilityPeriodStart';
import { shouldBehaveLikeAvailabilityPeriodEnd } from './configurable/effects/setAvailabilityPeriodEnd';

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
