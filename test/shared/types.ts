import { FakeContract } from '@defi-wonderland/smock';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import type { Fixture } from 'ethereum-waffle';
import { constants } from 'ethers';
import {
  Metahub,
  ERC721Mock,
  ERC721PresetConfigurable,
  ERC721Warper,
  UniverseToken,
  WarperPresetFactory,
  WarperPresetMock,
  ERC20Mock,
  IWarperPreset,
  AssetsMock,
  ERC721AssetVault,
  Warper,
  IAssetController,
  ERC721WarperController,
  AssetClassRegistry,
  IACL,
  IAssetClassRegistry,
  IListingManager,
  IRentingManager,
  IUniverseManager,
  IWarperManager,
  UUPSUpgradeable,
  ERC721AssetController,
  IAvailabilityPeriodMechanics,
  ConfigurableAvailabilityPeriodExtension,
  ConfigurableRentalPeriodExtension,
  IRentalPeriodMechanics,
  Ownable,
  Multicall,
  IWarperPresetFactory,
  IUniverseToken,
} from '../../typechain';
import { ACL } from '../../typechain/ACL';

declare module 'mocha' {
  interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    mocks: Mocks;
    interfaces: Interfaces;
    signers: Signers;
  }
}

export interface Contracts {
  metahub: Metahub;
  assetClassRegistry: AssetClassRegistry;
  universeToken: UniverseToken;
  warperPresetFactory: WarperPresetFactory;
  erc721assetVault: ERC721AssetVault;
  erc721WarperController: ERC721WarperController;
  erc721AssetController: ERC721AssetController;
  assetController: IAssetController;
  warper: Warper;
  erc721Warper: ERC721Warper;
  warperPreset: IWarperPreset;
  acl: ACL;
  presets: {
    erc721Configurable: ERC721PresetConfigurable;
  };

  // Misc tests
  ownable: Ownable;
  multicall: Multicall;
  uupsUpgradeable: UUPSUpgradeable;
  configurableAvailabilityPeriodExtension: ConfigurableAvailabilityPeriodExtension;
  configurableRentalPeriodExtension: ConfigurableRentalPeriodExtension;
}

export interface Interfaces {
  // acl
  iAcl: IACL;

  // Assets
  iAssetClassRegistry: IAssetClassRegistry;

  // Universe token
  iUniverseToken: IUniverseToken;

  // Metahub
  iListingManager: IListingManager;
  iRentingManager: IRentingManager;
  iUniverseManager: IUniverseManager;
  iWarperManager: IWarperManager;

  // Warper preset factory
  iWarperPresetFactory: IWarperPresetFactory;

  // Warpers mechanics
  availabilityPeriod: IAvailabilityPeriodMechanics;
  rentalPeriod: IRentalPeriodMechanics;
  // Warpers
  warperPreset: IWarperPreset;
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
