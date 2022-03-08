import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ERC721WarperConfigurable, Metahub } from '../../../../../../typechain';
import { shouldBehaveLikeAdminOnlySetter } from './genericAdminOnlySetter';

export function shouldBehaveLikeAvailabilityPeriodEnd(): void {
  describe('__setAvailabilityPeriodEnd', function () {
    let warper: ERC721WarperConfigurable;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.presets.erc721Configurable as unknown as ERC721WarperConfigurable;
      metahub = this.mocks.metahub;

      metahub.isWarperAdmin.returns(true);
    });

    shouldBehaveLikeAdminOnlySetter({
      setter: '__setAvailabilityPeriodEnd',
      getter: '__availabilityPeriodEnd',
      value: 42,
    });

    describe('Start period is greater than max period', () => {
      const newStartPeriod = 1000;
      beforeEach(async () => {
        await warper.__setAvailabilityPeriodStart(newStartPeriod);
      });

      it('reverts', async () => {
        await expect(warper.__setAvailabilityPeriodEnd(newStartPeriod - 1)).to.be.revertedWith(
          'InvalidAvailabilityPeriodEnd',
        );
      });
    });

    describe('Both periods are equal', () => {
      it('reverts', async () => {
        await expect(warper.__setAvailabilityPeriodEnd(await warper.__availabilityPeriodStart())).to.be.revertedWith(
          'InvalidAvailabilityPeriodEnd',
        );
      });
    });
  });
}
