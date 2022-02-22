import { baseContext } from '../shared/contexts';
import { unitTestERC721Warper } from './erc721/ERC721';
import { unitTestMetahub } from './methaub/Metahub';
import { unitWarperPresetFactory } from './warper-preset-factory/WarperPresetFactory';

baseContext('Unit Tests', function () {
  unitWarperPresetFactory();
  unitTestERC721Warper();
  unitTestMetahub();
});
