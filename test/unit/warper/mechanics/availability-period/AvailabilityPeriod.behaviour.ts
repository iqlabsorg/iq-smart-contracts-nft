import { expect } from 'chai';
import { MaxUint32 } from '../../../../shared/utils';

/**
 * TODO
 */
export function shouldBehaveLikeAvailabilityPeriod(): void {
  describe('Availability period', function () {
    it('__availabilityPeriodStart', async function () {
      await expect(this.interfaces.availabilityPeriod.__availabilityPeriodStart()).to.eventually.equal(0);
    });

    it('__availabilityPeriodEnd', async function () {
      await expect(this.interfaces.availabilityPeriod.__availabilityPeriodEnd()).to.eventually.equal(MaxUint32);
    });
  });
}
