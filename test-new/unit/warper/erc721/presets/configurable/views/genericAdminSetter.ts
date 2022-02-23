import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { Metahub } from '../../../../../../../typechain';

export function shouldBehaveLikeAdminSetter({ param }: { param: string }): void {
  const getter = `__${param}`;
  const setter = `__set${param[0].toUpperCase()}${param.slice(1)}`;

  describe(param, function () {
    let warper: Contract;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.presets.core;
      metahub = this.mocks.metahub;
    });
    it('allows warper admin to change param value', async () => {
      metahub.isWarperAdmin.returns(true);
      await (warper as Contract)[setter](100);
      await expect((warper as Contract)[getter]()).to.eventually.eq(100);
    });

    it('forbids stranger to change param value', async () => {
      metahub.isWarperAdmin.returns(false);
      await expect((warper as Contract)[setter](100)).to.be.revertedWith('CallerIsNotWarperAdmin');
    });
  });
}
