import { expect } from 'chai';
import { Contract } from 'ethers';

export function shouldBehaveLikeGetter({ param, expectedValue }: { param: string; expectedValue: number }): void {
  const getter = `__${param}`;

  describe(param, function () {
    let warper: Contract;
    beforeEach(function () {
      warper = this.contracts.presets.core;
    });

    it('returns correct default value', async () => {
      await expect((warper as Contract)[getter]()).to.eventually.eq(expectedValue);
    });
  });
}
