import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ConfigurableRentalPeriodExtension, WarperManager } from '../../../../../typechain';

/**
 * TODO
 */
export function shouldBehaveLikeConfigurableRentalPeriod(): void {
  describe('Configurable rental period', function () {
    let warper: ConfigurableRentalPeriodExtension;
    let warperManager: FakeContract<WarperManager>;

    beforeEach(function () {
      warper = this.contracts.configurableRentalPeriodExtension;
      warperManager = this.mocks.warperManager;

      warperManager.isWarperAdmin.returns(true);
    });
    describe('__setMinRentalPeriod', function () {
      it('allows warper admin to change param value', async () => {
        warperManager.isWarperAdmin.returns(true);
        await warper.__setMinRentalPeriod(42);
        await expect(warper.__minRentalPeriod()).to.eventually.eq(42);
      });

      it('forbids stranger to change param value', async () => {
        warperManager.isWarperAdmin.returns(false);
        await expect(warper.__setMinRentalPeriod(42)).to.be.revertedWith('CallerIsNotWarperAdmin');
      });

      describe('Min period is greater than max period', () => {
        const newMaxPeriod = 1000;
        beforeEach(async () => {
          await warper.__setMaxRentalPeriod(newMaxPeriod);
        });

        it('reverts', async () => {
          await expect(warper.__setMinRentalPeriod(newMaxPeriod + 1)).to.be.revertedWith('InvalidMinRentalPeriod');
        });
      });

      describe('Both periods are equal', () => {
        it('succeeds', async () => {
          await warper.__setMinRentalPeriod(await warper.__maxRentalPeriod());
        });
      });
    });

    describe('__setMaxRentalPeriod', function () {
      it('allows warper admin to change param value', async () => {
        warperManager.isWarperAdmin.returns(true);
        await warper.__setMaxRentalPeriod(42);
        await expect(warper.__maxRentalPeriod()).to.eventually.eq(42);
      });

      it('forbids stranger to change param value', async () => {
        warperManager.isWarperAdmin.returns(false);
        await expect(warper.__setMaxRentalPeriod(42)).to.be.revertedWith('CallerIsNotWarperAdmin');
      });

      describe('Max period is lesser than min period', () => {
        const newMinPeriod = 1000;
        beforeEach(async () => {
          await warper.__setMinRentalPeriod(newMinPeriod);
        });

        it('reverts', async () => {
          await expect(warper.__setMaxRentalPeriod(newMinPeriod - 1)).to.be.revertedWith('InvalidMaxRentalPeriod');
        });
      });

      describe('Both periods are equal', () => {
        it('succeeds', async () => {
          await warper.__setMaxRentalPeriod(await warper.__minRentalPeriod());
        });
      });
    });
  });
}
