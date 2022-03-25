import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ERC20Mock__factory,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  ERC721Warper,
  ERC721WarperController__factory,
  IWarperPreset,
  Metahub,
  Metahub__factory,
  Warper,
} from '../../../typechain';
import { shouldBehaveLikeERC721Warper, shouldBehaveLikeERC721Configurable } from './erc721';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export async function unitFixtureERC721WarperConfigurable() {
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

  // Deploy ERC721 Warper controller.
  const erc721WarperController = new ERC721WarperController__factory(deployer).attach(
    await hre.run('deploy:erc721-warper-controller'),
  );

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);
  const assetClassRegistry = await smock.fake<AssetClassRegistry>(AssetClassRegistry__factory);

  // Deploy preset.
  const erc721Warper = new ERC721PresetConfigurable__factory(deployer).attach(
    await hre.run('deploy:erc721-preset-configurable'),
  );
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const uninitializedErc721Warper = new ERC721PresetConfigurable__factory(deployer).attach(
    await hre.run('deploy:erc721-preset-configurable'),
  );

  // Deploy erc20 token
  const erc20Token = new ERC20Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC20', {
      name: 'Random ERC20',
      symbol: 'TST',
      decimals: 18,
      totalSupply: 1,
    }),
  );

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    erc721Warper,
    metahub,
    oNFT,
    erc20Token,
    uninitializedErc721Warper,
    erc721WarperController,
    assetClassRegistry,
  };
}

export function unitTestWarpers(): void {
  describe('ERC721Warper Configurable', function () {
    beforeEach(async function () {
      const {
        erc721Warper,
        metahub,
        assetClassRegistry,
        oNFT,
        erc20Token,
        uninitializedErc721Warper,
        erc721WarperController,
      } = await this.loadFixture(unitFixtureERC721WarperConfigurable);
      this.mocks.assets.erc721 = oNFT;
      this.mocks.assets.erc20 = erc20Token;
      this.mocks.metahub = metahub;
      this.mocks.assetClassRegistry = assetClassRegistry;
      this.contracts.presets.erc721Configurable = erc721Warper;
      this.contracts.erc721Warper = erc721Warper as unknown as ERC721Warper;
      this.contracts.warperPreset = uninitializedErc721Warper as unknown as IWarperPreset;
      this.contracts.warper = erc721Warper as unknown as Warper;
      this.contracts.erc721WarperController = erc721WarperController;
    });

    shouldBehaveLikeWarper();
    shouldBehaveLikeERC721Warper();
    shouldBehaveLikeERC721Configurable();
  });
}
