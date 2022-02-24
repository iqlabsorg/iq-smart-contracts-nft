import { shouldBehaveLikeGetter } from './effects/genericGetter';
import { shouldBehaveLikeAdminSetter } from './views/genericAdminSetter';

const MaxUint32 = 2 ** 32 - 1;

/**
 * Core warper method functionality
 */
export function shouldBehaveLikeERC721Configurable(): void {
  describe('View Functions', function () {
    shouldBehaveLikeGetter({ param: 'availabilityPeriodStart', defaultValue: 0 });
    shouldBehaveLikeGetter({ param: 'availabilityPeriodEnd', defaultValue: MaxUint32 });
    shouldBehaveLikeGetter({ param: 'minRentalPeriod', defaultValue: 0 });
    shouldBehaveLikeGetter({ param: 'maxRentalPeriod', defaultValue: MaxUint32 });
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeAdminSetter({ param: 'availabilityPeriodStart' });
    shouldBehaveLikeAdminSetter({ param: 'availabilityPeriodEnd' });
    shouldBehaveLikeAdminSetter({ param: 'minRentalPeriod' });
    shouldBehaveLikeAdminSetter({ param: 'maxRentalPeriod' });
  });
}
