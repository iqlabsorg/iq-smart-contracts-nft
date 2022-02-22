import { expect } from 'chai';
import { Metahub, WarperPresetFactory } from '../../../../typechain';

export function shouldBehaveGetWarperPresetFactory(): void {
  describe('get warperPresetFactory', function () {
    let metahub: Metahub;
    let warperPresetFactory: WarperPresetFactory;

    beforeEach(function () {
      metahub = this.contracts.metahub;
      warperPresetFactory = this.contracts.warperPresetFactory;
    });

    it('returns the warper preset factory address', async () => {
      await expect(metahub.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
    });
  });
}
