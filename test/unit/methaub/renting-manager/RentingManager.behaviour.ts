import { IRentingManager } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeRentingManager(): void {
  describe('IRentingManager', function () {
    describe('get warperPresetFactory', function () {
      let metahub: IRentingManager;

      beforeEach(function () {
        // eslint-disable-next-line
        metahub = this.contracts.metahub as unknown as IRentingManager;
      });

      //todo
    });
  });
}
