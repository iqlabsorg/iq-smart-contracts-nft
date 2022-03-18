import { expect } from 'chai';
import { Ownable } from '../../../typechain';

declare module 'mocha' {
  interface Context {
    ownable: {
      underTest: Ownable;
    };
  }
}

export function shouldBehavesLikeOwnable() {
  describe('Ownable', () => {
    it('has the owner set', async function () {
      await expect(this.ownable.underTest.owner()).to.eventually.equal(this.signers.named['deployer'].address);
    });
  });
}
