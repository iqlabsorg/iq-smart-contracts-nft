import hre, { ethers } from 'hardhat';
import { WarperPresetFactory__factory, WarperPresetMock__factory } from '../../../typechain';
import { shouldBehaveWarperPresetFactory } from './WarperPresetFactory.behaviour';

export async function unitFixtureWarperPresetFactory() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const warperImplFactory = new WarperPresetMock__factory(deployer);
  const warperImplMock1 = await warperImplFactory.deploy();
  const warperImplMock2 = await warperImplFactory.deploy();

  const deployedWarperFactory = await hre.run('deploy:warper-preset-factory');

  return {
    warperImplMock1,
    warperImplMock2,
    warperPresetFactory: new WarperPresetFactory__factory(deployer).attach(deployedWarperFactory),
  };
}

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
