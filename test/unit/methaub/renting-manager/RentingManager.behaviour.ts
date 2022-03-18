import { IRentingManager } from '../../../../typechain';

declare module 'mocha' {
  interface Context {
    rentingManager: {
      underTest: IRentingManager;
    };
  }
}

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeRentingManager(): void {
  describe('IRentingManager', function () {
    describe('get warperPresetFactory', function () {
      let rentingManager: IRentingManager;

      beforeEach(function () {
        // eslint-disable-next-line
        ({ underTest: rentingManager } = this.rentingManager);
      });

      it('todo'); // TODO
    });
  });
}
