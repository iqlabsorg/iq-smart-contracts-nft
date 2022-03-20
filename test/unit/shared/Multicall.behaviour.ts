import { ContractTransaction } from 'ethers';
import { Multicall } from '../../../typechain';

declare module 'mocha' {
  interface Context {
    multicall: {
      underTest: Multicall;
      call1: string;
      call2: string;
      call3: string;
      assert: (tx: ContractTransaction) => Promise<void>;
    };
  }
}

export function shouldBehavesLikeMulticall() {
  describe('Multicall', () => {
    it('Execute 3 method calls in a single transaction', async function () {
      // Execute the call
      const tx = await this.multicall.underTest.multicall([
        this.multicall.call1,
        this.multicall.call2,
        this.multicall.call3,
      ]);

      // Assert the call
      await this.multicall.assert(tx);
    });
  });
}
