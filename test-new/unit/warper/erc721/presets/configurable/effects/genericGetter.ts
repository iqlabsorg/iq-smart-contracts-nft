import { expect } from 'chai';
import { Contract } from 'ethers';

export function shouldBehaveLikeGetter({ param, defaultValue }: { param: string; defaultValue: number }): void {
  const getter = `__${param}`;

  describe(param, function () {
    let warper: Contract;
    beforeEach(function () {
      warper = this.contracts.presets.core;
    });

    it('returns correct default value', async () => {
      await expect((warper as Contract)[getter]()).to.eventually.eq(defaultValue);
    });
  });
}
