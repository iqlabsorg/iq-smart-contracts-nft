import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ConfigurableAvailabilityPeriodExtension, Metahub } from '../../../../../typechain';

/**
 * TODO
 */
export function shouldBehaveLikeConfigurableAvailabilityPeriod(): void {
  describe('Configurable availability period', function () {
    let warper: ConfigurableAvailabilityPeriodExtension;
    let metahub: FakeContract<Metahub>;

    beforeEach(function () {
      warper = this.contracts.configurableAvailabilityPeriodExtension;
      metahub = this.mocks.metahub;

      metahub.isWarperAdmin.returns(true);
    });
    describe('__setAvailabilityPeriodEnd', function () {
      it('allows warper admin to change param value', async () => {
        metahub.isWarperAdmin.returns(true);
        await warper.__setAvailabilityPeriodEnd(42);
        await expect(warper.__availabilityPeriodEnd()).to.eventually.eq(42);
      });

      it('forbids stranger to change param value', async () => {
        metahub.isWarperAdmin.returns(false);
        await expect(warper.__setAvailabilityPeriodEnd(42)).to.be.revertedWith('CallerIsNotWarperAdmin');
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

    describe('__setAvailabilityPeriodStart', function () {
      it('allows warper admin to change param value', async () => {
        metahub.isWarperAdmin.returns(true);
        await warper.__setAvailabilityPeriodStart(42);
        await expect(warper.__availabilityPeriodStart()).to.eventually.eq(42);
      });

      it('forbids stranger to change param value', async () => {
        metahub.isWarperAdmin.returns(false);
        await expect(warper.__setAvailabilityPeriodStart(42)).to.be.revertedWith('CallerIsNotWarperAdmin');
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
  });
}
