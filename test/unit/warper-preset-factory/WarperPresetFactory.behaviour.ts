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
