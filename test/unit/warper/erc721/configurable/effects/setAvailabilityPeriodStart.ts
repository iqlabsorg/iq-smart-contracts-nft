import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ERC721PresetConfigurable, Metahub } from '../../../../../../typechain';
import { shouldBehaveLikeAdminOnlySetter } from './genericAdminOnlySetter';

export function shouldBehaveLikeAvailabilityPeriodStart(): void {
  describe('__setAvailabilityPeriodStart', function () {
    let warper: ERC721PresetConfigurable;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.presets.erc721Configurable as unknown as ERC721PresetConfigurable;
      metahub = this.mocks.metahub;

      metahub.isWarperAdmin.returns(true);
    });

    shouldBehaveLikeAdminOnlySetter({
      setter: '__setAvailabilityPeriodStart',
      getter: '__availabilityPeriodStart',
      value: 42,
    });

    describe('End period is lesser than min period', () => {
      const newEndPeriod = 1000;
      beforeEach(async () => {
        await warper.__setAvailabilityPeriodEnd(newEndPeriod);
      });

      it('reverts', async () => {
        await expect(warper.__setAvailabilityPeriodStart(newEndPeriod + 1)).to.be.revertedWith(
          'InvalidAvailabilityPeriodStart',
        );
      });
    });

    describe('Both periods are equal', () => {
      it('reverts', async () => {
        await expect(warper.__setAvailabilityPeriodStart(await warper.__availabilityPeriodEnd())).to.be.revertedWith(
          'InvalidAvailabilityPeriodStart',
        );
      });
    });
  });
}
