import { shouldBehaveOnERC721Received } from './effects/onERC721Received';

/**
 * Tests for ERC721 Asset Vault
 */
export function shouldBehaveLikeERC721AssetVault(): void {
  describe('Effects Functions', function () {
    shouldBehaveOnERC721Received();
  });
}
