import { baseContext } from '../shared/contexts';
import { unitTestERC721Warper } from './erc721/ERC721';
import { unitTestMetahub } from './methaub/Metahub';

baseContext('Unit Tests', function () {
  unitTestERC721Warper();
  unitTestMetahub();
});
