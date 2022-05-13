/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import hre, { ethers } from 'hardhat';
import { PRESET_CONFIGURABLE_ID } from '../../../tasks/deployment';
import {
  ERC20,
  ERC721Mock,
  IACL,
  IAssetController__factory,
  IERC721WarperController,
  IUniverseRegistry,
} from '../../../typechain';
import { shouldBehaveLikeMetahub } from './metahub.behaviour';

export const warperPresetId = PRESET_CONFIGURABLE_ID;

export function unitTestMetahub(): void {
  let acl: IACL;
  async function unitFixtureMetahub(): Promise<{
    assetClassRegistry: any;
    universeRegistry: IUniverseRegistry;
    fixedPriceListingController: any;
    originalAsset: ERC721Mock;
    erc721Controller: IERC721WarperController;
    erc721Vault: any;
    listingStrategyRegistry: any;
    warperPresetFactory: any;
    metahub: any;
    baseToken: any;
  }> {
    // Resolve primary roles
    const nftCreator = await ethers.getNamedSigner('nftCreator');

    // Deploy original NFT
    const originalAsset = (await hre.run('deploy:mock:ERC721', {
      name: 'Test ERC721',
      symbol: 'ONFT',
    })) as ERC721Mock;

    // Mint some NFT to deployer
    await originalAsset.mint(nftCreator.address, 1);
    await originalAsset.mint(nftCreator.address, 2);

    // Deploy and register warper preset
    const baseToken = (await hre.run('deploy:mock:ERC20', {
      name: 'Test ERC721',
      symbol: 'ONFT',
      decimals: 18,
      totalSupply: 100_000_000,
    })) as ERC20;

    const {
      erc721Controller,
      erc721Vault,
      assetClassRegistry,
      listingStrategyRegistry,
      warperPresetFactory,
      universeRegistry,
      metahub,
      fixedPriceListingController,
    } = await hre.run('deploy:initial-deployment', {
      baseToken: baseToken.address,
      acl: acl.address,
      rentalFee: 100,
      unsafe: false,
    });

    return {
      assetClassRegistry,
      universeRegistry,
      fixedPriceListingController,
      originalAsset,
      erc721Controller,
      erc721Vault,
      listingStrategyRegistry,
      warperPresetFactory,
      metahub,
      baseToken,
    };
  }

  describe('Metahub', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;

      const {
        metahub,
        originalAsset,
        universeRegistry,
        listingStrategyRegistry,
        warperPresetFactory,
        fixedPriceListingController,
        assetClassRegistry,
        erc721Controller,
        baseToken,
        erc721Vault,
      } = await this.loadFixture(unitFixtureMetahub);

      // Interfaces/Subclasses under test
      this.contracts.metahub = metahub;
      this.contracts.listingManager = metahub;
      this.contracts.rentingManager = metahub;
      this.contracts.warperManager = metahub;
      this.contracts.paymentManager = metahub;
      this.contracts.uupsUpgradeable = metahub;

      // Common dependencies
      this.contracts.listingStrategyRegistry = listingStrategyRegistry;
      this.contracts.erc721assetVault = erc721Vault;
      this.contracts.assetController = IAssetController__factory.connect(
        erc721Controller.address,
        erc721Controller.signer,
      );
      this.contracts.assetClassRegistry = assetClassRegistry;
      this.contracts.universeRegistry = universeRegistry;
      this.contracts.warperPresetFactory = warperPresetFactory;
      this.contracts.fixedPriceListingController = fixedPriceListingController;

      // Mocks
      this.mocks.assets.erc721 = originalAsset;
      this.mocks.assets.erc20 = baseToken;
    });

    shouldBehaveLikeMetahub();
  });
}
