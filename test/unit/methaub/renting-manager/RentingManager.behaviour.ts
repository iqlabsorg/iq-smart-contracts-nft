import { IRentingManager } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeRentingManager(): void {
  describe('IRentingManager', function () {
    describe('get warperPresetFactory', function () {
      let rentingManager: IRentingManager;

      beforeEach(function () {
        // eslint-disable-next-line
        rentingManager = this.contracts.rentingManager;
      });

      it('todo'); // TODO
    });
  });
}
