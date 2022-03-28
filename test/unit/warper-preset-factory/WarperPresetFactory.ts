import hre, { ethers } from 'hardhat';
import {
  IWarperPresetFactory__factory,
  WarperPresetFactory__factory,
  WarperPresetMock__factory,
} from '../../../typechain';
import { shouldBehaveWarperPresetFactory } from './WarperPresetFactory.behaviour';

export async function unitFixtureWarperPresetFactory() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');

  const warperImplMock1 = new WarperPresetMock__factory(deployer).attach(await hre.run('deploy:mock:warper-preset'));
  const warperImplMock2 = new WarperPresetMock__factory(deployer).attach(await hre.run('deploy:mock:warper-preset'));

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

      this.interfaces.iWarperPresetFactory = IWarperPresetFactory__factory.connect(
        warperPresetFactory.address,
        warperPresetFactory.signer,
      );
      this.mocks.warperPreset = [warperImplMock1, warperImplMock2];
    });

    shouldBehaveWarperPresetFactory();
  });
}
