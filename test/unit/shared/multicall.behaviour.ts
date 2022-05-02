import { Multicall } from '../../../typechain';
import { expect } from 'chai';

export function shouldBehavesLikeMulticall(): void {
  describe('Multicall', () => {
    let multicall: Multicall;

    beforeEach(function () {
      multicall = this.contracts.multicall;
    });

    it('The multicall function exists', async () => {
      await expect(multicall.multicall([])).to.not.rejected;
    });
  });
}
