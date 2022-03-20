import { expect } from 'chai';
import { IAvailabilityPeriodMechanics } from '../../../../../typechain';
import { MaxUint32 } from '../../utils';

declare module 'mocha' {
  interface Context {
    availabilityPeriod: {
      underTest: IAvailabilityPeriodMechanics;
    };
  }
}

/**
 * TODO
 */
export function shouldBehaveLikeAvailabilityPeriod(): void {
  describe('Availability period', function () {
    it('__availabilityPeriodStart', async function () {
      await expect(this.availabilityPeriod.underTest.__availabilityPeriodStart()).to.eventually.equal(0);
    });

    it('__availabilityPeriodEnd', async function () {
      await expect(this.availabilityPeriod.underTest.__availabilityPeriodEnd()).to.eventually.equal(MaxUint32);
    });
  });
}
