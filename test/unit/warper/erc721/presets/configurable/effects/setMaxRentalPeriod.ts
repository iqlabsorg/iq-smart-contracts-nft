import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ERC721WarperConfigurable, Metahub } from '../../../../../../../typechain';
import { shouldBehaveLikeAdminOnlySetter } from './genericAdminOnlySetter';

export function shouldBehaveLikeSetMaxRentalPeriod(): void {
  describe('__setMaxRentalPeriod', function () {
    let warper: ERC721WarperConfigurable;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.presets.erc721Configurable as unknown as ERC721WarperConfigurable;
      metahub = this.mocks.metahub;

      metahub.isWarperAdmin.returns(true);
    });

    shouldBehaveLikeAdminOnlySetter({ setter: '__setMaxRentalPeriod', getter: '__maxRentalPeriod', value: 42 });

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
}
