import { expect } from 'chai';
import { formatBytes32String } from 'ethers/lib/utils';
import { unitFixtureWarperPresetFactory } from '../../shared/fixtures';
import { shouldBehaveWarperPresetFactory } from './WarperPresetFactory.behaviour';

export function unitTestWarperPresetFactory(): void {
  describe('WarperPresetFactory', function () {
    beforeEach(async function () {
      const { warperImplMock1, warperImplMock2, warperPresetFactory } = await this.loadFixture(
        unitFixtureWarperPresetFactory,
      );
      this.mocks.warperPreset = [warperImplMock1, warperImplMock2];
      this.contracts.warperPresetFactory = warperPresetFactory;
    });

    shouldBehaveWarperPresetFactory();
  });
}

export const presetId1 = formatBytes32String('ERC721Basic');
export const presetId2 = formatBytes32String('ERC721Advanced');

export const expectWarperPresetData = async (preset: unknown | Promise<unknown>, data: Record<string, unknown>) => {
  const object = preset instanceof Promise ? await preset : preset;
  expect({ ...object }).to.include(data);
};
