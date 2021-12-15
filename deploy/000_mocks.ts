import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { nftCreator } = await getNamedAccounts();

  // Deploy NFT mocks
  await deploy('ERC721Mock', {
    from: nftCreator,
    args: [`Test NFT`, `ONFT`],
    log: true,
  });
};
export default func;
func.tags = ['test'];
