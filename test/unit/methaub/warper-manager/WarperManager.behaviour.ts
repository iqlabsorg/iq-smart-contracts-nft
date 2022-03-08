import { expect } from 'chai';
import { IWarperManager, WarperPresetFactory } from '../../../../typechain';

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeWarperManager(): void {
  describe('IWarperManager', function () {
    describe('get warperPresetFactory', function () {
      let metahub: IWarperManager;
      let warperPresetFactory: WarperPresetFactory;

      beforeEach(function () {
        metahub = this.contracts.metahub as unknown as IWarperManager;
        warperPresetFactory = this.contracts.warperPresetFactory;
      });

      it('returns the warper preset factory address', async () => {
        await expect(metahub.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
      });
    });
  });
}
