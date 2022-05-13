import { expect } from 'chai';
import { MAX_UINT_32 } from '../../../../../src';

/**
 * TODO
 */
export function shouldBehaveLikeAvailabilityPeriod(): void {
  describe('Availability period', function () {
    it('__availabilityPeriodStart', async function () {
      await expect(this.contracts.availabilityPeriod.__availabilityPeriodStart()).to.eventually.equal(0);
    });

    it('__availabilityPeriodEnd', async function () {
      await expect(this.contracts.availabilityPeriod.__availabilityPeriodEnd()).to.eventually.equal(MAX_UINT_32);
    });
  });
}
