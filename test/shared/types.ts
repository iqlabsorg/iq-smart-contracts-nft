import { FakeContract } from '@defi-wonderland/smock';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import type { Fixture } from 'ethereum-waffle';
import { constants } from 'ethers';
import {
  AssetClassRegistry,
  AssetsMock,
  ConfigurableAvailabilityPeriodExtension,
  ConfigurableRentalPeriodExtension,
  ERC20Mock,
  ERC721Mock,
  IACL,
  IAssetClassRegistry,
  IAssetController,
  IAssetVault,
  IAvailabilityPeriodMechanics,
  IERC721AssetVault,
  IERC721Warper,
  IERC721WarperController,
  IListingManager,
  IMetahub,
  IRentalPeriodMechanics,
  IRentingManager,
  IUniverseRegistry,
  IUniverseToken,
  IWarper,
  IWarperManager,
  IWarperPreset,
  IWarperPresetFactory,
  Metahub,
  Multicall,
  Ownable,
  UUPSUpgradeable,
  WarperPresetMock,
} from '../../typechain';

declare module 'mocha' {
  interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    mocks: Mocks;
    signers: Signers;
  }
}

export interface Contracts {
  // Metahub
  listingManager: IListingManager;
  rentingManager: IRentingManager;
  warperManager: IWarperManager;
  metahub: IMetahub;

  // acl
  acl: IACL;

  // Universe registry
  universeRegistry: IUniverseRegistry;

  // Assets
  assetClassRegistry: IAssetClassRegistry;

  // Universe token
  universeToken: IUniverseToken;

  // Warpers
  warperPresetFactory: IWarperPresetFactory;
  warperPreset: IWarperPreset;
  warper: IWarper;
  erc721Warper: IERC721Warper;
  // Warpers mechanics
  availabilityPeriod: IAvailabilityPeriodMechanics;
  rentalPeriod: IRentalPeriodMechanics;
  configurableAvailabilityPeriodExtension: ConfigurableAvailabilityPeriodExtension;
  configurableRentalPeriodExtension: ConfigurableRentalPeriodExtension;

  // Vault
  assetVault: IAssetVault;
  erc721assetVault: IERC721AssetVault;

  // controllers
  erc721WarperController: IERC721WarperController;
  assetController: IAssetController;

  // Misc, non-interface tests
  ownable: Ownable;
  multicall: Multicall;
  uupsUpgradeable: UUPSUpgradeable;
}

export interface Mocks {
  metahub: FakeContract<Metahub>;
  assetClassRegistry: FakeContract<AssetClassRegistry>;
  assetsLib: AssetsMock;
  assets: {
    erc721: ERC721Mock;
    erc20: ERC20Mock;
  };
  warperPreset: Array<WarperPresetMock>;
}

export interface Signers {
  named: Record<string, SignerWithAddress>;
  unnamed: Array<SignerWithAddress>;
}

export const AddressZero = constants.AddressZero;
