import { FakeContract } from '@defi-wonderland/smock';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import type { Fixture } from 'ethereum-waffle';
import { constants } from 'ethers';
import { Metahub, ERC721Mock, ERC721PresetConfigurable, ERC721WarperMock, ERC721Warper } from '../../typechain';

declare module 'mocha' {
  interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    mocks: Mocks;
    signers: Signers;
  }
}

export interface Contracts {
  metahub: Metahub;
  oNFT: ERC721Mock;
  presets: {
    core: ERC721Warper;
    erc721Configurable: ERC721PresetConfigurable;
  };
}

export interface Mocks {
  metahub: FakeContract<Metahub>;
  assets: {
    erc721: ERC721Mock;
  };
}

export interface Signers {
  named: Record<string, SignerWithAddress>;
  unnamed: Array<SignerWithAddress>;
}

export const AddressZero = constants.AddressZero;
