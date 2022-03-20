import { expect } from 'chai';
import { IRentalPeriodMechanics } from '../../../../../typechain';
import { MaxUint32 } from '../../../../shared/utils';

declare module 'mocha' {
  interface Context {
    rentalPeriod: {
      underTest: IRentalPeriodMechanics;
    };
  }
}

/**
 * TODO
 */
export function shouldBehaveLikeRentalPeriod(): void {
  describe('Rental period', function () {
    it('__minRentalPeriod', async function () {
      await expect(this.configurableRentalPeriod.underTest.__minRentalPeriod()).to.eventually.equal(0);
    });

    it('maxRentalPeriod', async function () {
      await expect(this.configurableRentalPeriod.underTest.__maxRentalPeriod()).to.eventually.equal(MaxUint32);
    });
  });
}
