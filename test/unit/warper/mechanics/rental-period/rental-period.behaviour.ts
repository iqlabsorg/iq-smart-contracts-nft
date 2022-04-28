import { expect } from 'chai';
import { MaxUint32 } from '../../../../shared/utils';

/**
 * TODO
 */
export function shouldBehaveLikeRentalPeriod(): void {
  describe('Rental period', function () {
    it('__minRentalPeriod', async function () {
      await expect(this.contracts.rentalPeriod.__minRentalPeriod()).to.eventually.equal(0);
    });

    it('maxRentalPeriod', async function () {
      await expect(this.contracts.rentalPeriod.__maxRentalPeriod()).to.eventually.equal(MaxUint32);
    });
  });
}
