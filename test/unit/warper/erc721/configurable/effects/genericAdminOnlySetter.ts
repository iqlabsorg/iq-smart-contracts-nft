import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { Metahub } from '../../../../../../typechain';

export function shouldBehaveLikeAdminOnlySetter<T>({
  getter,
  setter,
  value,
}: {
  getter: string;
  setter: string;
  value: T;
}): void {
  describe(`Only warper admin can call ${setter}`, function () {
    let warper: Contract;
    let metahub: FakeContract<Metahub>;
    beforeEach(function () {
      warper = this.contracts.erc721Warper;
      metahub = this.mocks.metahub;
    });
    it('allows warper admin to change param value', async () => {
      metahub.isWarperAdmin.returns(true);
      await (warper as Contract)[setter](value);
      await expect((warper as Contract)[getter]()).to.eventually.eq(value);
    });

    it('forbids stranger to change param value', async () => {
      metahub.isWarperAdmin.returns(false);
      await expect((warper as Contract)[setter](value)).to.be.revertedWith('CallerIsNotWarperAdmin');
    });
  });
}
