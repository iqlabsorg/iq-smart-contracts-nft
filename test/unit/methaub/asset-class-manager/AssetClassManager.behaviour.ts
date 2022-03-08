import { IAssetClassManager } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeAssetClassManager(): void {
  describe('IAssetClassManager', function () {
    describe('get warperPresetFactory', function () {
      let metahub: IAssetClassManager;

      beforeEach(function () {
        // eslint-disable-next-line
        metahub = this.contracts.metahub as unknown as IAssetClassManager;
      });

      //todo
    });
  });
}
