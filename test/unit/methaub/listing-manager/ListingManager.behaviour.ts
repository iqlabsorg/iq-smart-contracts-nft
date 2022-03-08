import { IListingManager } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeListingManager(): void {
  describe('IListingManager', function () {
    describe('get warperPresetFactory', function () {
      let metahub: IListingManager;

      beforeEach(function () {
        // eslint-disable-next-line
        metahub = this.contracts.metahub as unknown as IListingManager;
      });

      //todo
    });
  });
}
