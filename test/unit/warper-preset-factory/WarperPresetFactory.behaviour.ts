import { expect } from 'chai';
import { formatBytes32String } from 'ethers/lib/utils';
import { shouldBehaveLikeAddingANewPreset } from './effects/addPreset';
import { shouldBehaveLikeDeployWarperPreset } from './effects/deployWarperPreset';
import { shouldBehaveLikeDisablePreset } from './effects/disablePreset';
import { shouldBehaveEnablePreset } from './effects/enablePreset';
import { shouldBehaveLikeRemovePreset } from './effects/removePreset';

/**
 * Warper preset factory tests
 */
export function shouldBehaveWarperPresetFactory(): void {
  describe('View Functions', function () {
    //todo extract some of the view methods from "effect" tests and move them here
  });

  describe('Effect Functions', function () {
    shouldBehaveLikeRemovePreset();
    shouldBehaveEnablePreset();
    shouldBehaveLikeDisablePreset();
    shouldBehaveLikeDeployWarperPreset();
    shouldBehaveLikeAddingANewPreset();
  });
}

export const presetId1 = formatBytes32String('ERC721Basic');
export const presetId2 = formatBytes32String('ERC721Advanced');

export const expectWarperPresetData = async (preset: unknown | Promise<unknown>, data: Record<string, unknown>) => {
  const object = preset instanceof Promise ? await preset : preset;
  expect({ ...object }).to.include(data);
};
