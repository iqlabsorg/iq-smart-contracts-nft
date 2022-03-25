import hre, { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import {
  ERC721AssetController__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  IAssetController,
  Metahub,
  Metahub__factory,
  Warper,
} from '../../../../typechain';
import { shouldBehaveLikeIAssetTransferExecutor } from './asset-transfer-executer/assetTransferExecutor.behaviour';
import { shouldBehaveLikeIAssetController } from './assetController.behaviour';

export async function unitFixtureERC721AssetsController() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original asset mock.
  const oNFT = new ERC721Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC721', {
      name: 'Test ERC721',
      symbol: 'ONFT',
    }),
  );

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);

  // Deploy preset.
  const deployedERC721PresetConfigurable = await hre.run('deploy:erc721-preset-configurable');
  const erc721Warper = new ERC721PresetConfigurable__factory(deployer).attach(deployedERC721PresetConfigurable);
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const deployedERC721AssetController = await hre.run('deploy:erc721-asset-controller');
  const erc721AssetController = new ERC721AssetController__factory(deployer).attach(deployedERC721AssetController);

  return {
    originalNft: oNFT,
    erc721AssetController,
    warper: erc721Warper as unknown as Warper,
  };
}

export function unitTestAssetController(): void {
  describe('ERC721 Asset controller', function () {
    beforeEach(async function () {
      const { originalNft, erc721AssetController, warper } = await this.loadFixture(unitFixtureERC721AssetsController);

      this.mocks.assets.erc721 = originalNft;
      this.contracts.warper = warper as unknown as Warper;
      this.contracts.assetController = erc721AssetController as unknown as IAssetController;
    });

    shouldBehaveLikeIAssetController();
    shouldBehaveLikeIAssetTransferExecutor();
  });
}
