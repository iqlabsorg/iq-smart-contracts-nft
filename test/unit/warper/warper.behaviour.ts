import { expect } from 'chai';
import { ERC721, IWarperPreset, Metahub } from '../../../typechain';

declare module 'mocha' {
  interface Context {
    warper: {
      underTest: IWarperPreset;
      metahub: Metahub;
      originalAsset: ERC721;
      forwarder: {
        call: () => Promise<string>;
        expected: string;
      };
    };
  }
}

/**
 * Core warper method functionality
 */
export function shouldBehaveLikeWarper(): void {
  describe('View Functions', function () {
    describe('__original', () => {
      it('returns the original asset address', async function () {
        await expect(this.warper.underTest.__original()).to.eventually.eq(this.warper.originalAsset.address);
      });
    });

    describe('__metahub', () => {
      it('returns the metahub address', async function () {
        await expect(this.warper.underTest.__metahub()).to.eventually.equal(this.warper.metahub.address);
      });
    });

    describe('call forwarding', () => {
      it('can forward the call to the original asset contract', async function () {
        await expect(this.warper.forwarder.call()).to.eventually.eq(this.warper.forwarder.expected);
      });
    });
  });
}
