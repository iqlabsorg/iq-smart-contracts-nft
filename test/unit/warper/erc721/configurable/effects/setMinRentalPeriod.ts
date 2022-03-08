import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ERC721WarperConfigurable, Metahub } from '../../../../../../typechain';
import { shouldBehaveLikeAdminOnlySetter } from './genericAdminOnlySetter';

export function shouldBehaveLikeSetMinRentalPeriod(): void {
  describe('__setMinRentalPeriod', function () {
    let warper: ERC721WarperConfigurable;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.presets.erc721Configurable as unknown as ERC721WarperConfigurable;
      metahub = this.mocks.metahub;

      metahub.isWarperAdmin.returns(true);
    });

    shouldBehaveLikeAdminOnlySetter({ setter: '__setMinRentalPeriod', getter: '__minRentalPeriod', value: 42 });

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
}
