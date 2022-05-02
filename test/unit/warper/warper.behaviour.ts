import { FakeContract } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { ERC721Mock, IWarperPreset, Metahub } from '../../../typechain';

// TODO: refactor the test below so we can eliminate this context override
// eslint-disable-next-line filenames-simple/typescript-module-declaration
declare module 'mocha' {
  interface Context {
    warper: {
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
  let warperPreset: IWarperPreset;
  let metahub: FakeContract<Metahub>;
  let originalAsset: ERC721Mock;

  beforeEach(function () {
    warperPreset = this.contracts.warperPreset;
    metahub = this.mocks.metahub;
    originalAsset = this.mocks.assets.erc721;
  });

  describe('View Functions', () => {
    describe('__original', () => {
      it('returns the original asset address', async () => {
        await expect(warperPreset.__original()).to.eventually.eq(originalAsset.address);
      });
    });

    describe('__metahub', () => {
      it('returns the metahub address', async () => {
        await expect(warperPreset.__metahub()).to.eventually.equal(metahub.address);
      });
    });

    describe('call forwarding', () => {
      it('can forward the call to the original asset contract', async function () {
        await expect(this.warper.forwarder.call()).to.eventually.eq(this.warper.forwarder.expected);
      });
    });
  });
}
