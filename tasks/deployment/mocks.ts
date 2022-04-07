import { parseEther } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';

const TOTAL_TOKENS = 1_000_000_000;
const TOKEN_DECIMALS = 18;

task('deploy:mock:ERC20', 'Deploy an ERC20 contract')
  .addParam('name', 'name of the mock token', 'TEST', types.string)
  .addParam('symbol', 'symbol of the mock token', 'TT', types.string)
  .addParam('decimals', 'decimal points', TOKEN_DECIMALS, types.int)
  .addParam('totalSupply', 'amount of tokens', TOTAL_TOKENS, types.int)
  .setAction(async ({ name, symbol, decimals, totalSupply }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    await hre.deployments.delete('ERC20Mock');

    const deployment = await hre.deployments.deploy('ERC20Mock', {
      from: deployer.address,
      args: [name, symbol, decimals, parseEther(totalSupply.toString())],
      log: true,
    });
    return deployment.address;
  });

task('deploy:mock:ERC721', 'Deploy an ERC721 contract')
  .addParam('name', 'name of the mock token', 'TEST', types.string)
  .addParam('symbol', 'symbol of the mock token', 'TT', types.string)
  .setAction(async ({ name, symbol }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    await hre.deployments.delete('ERC721Mock');

    const deployment = await hre.deployments.deploy('ERC721Mock', {
      from: deployer.address,
      args: [name, symbol],
      log: true,
    });
    return deployment.address;
  });

task('deploy:mock:warper-preset', 'Deploy an `WarperPresetMock` contract').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('WarperPresetMock');

  const deployment = await hre.deployments.deploy('WarperPresetMock', {
    from: deployer.address,
    args: [],
    log: true,
  });
  return deployment.address;
});

task('deploy:interfaces-printer', 'Print interfaces IDs to the stdout').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('InterfacePrinter');

  const deployment = await hre.deployments.deploy('InterfacePrinter', {
    from: deployer.address,
    args: [],
    log: true,
  });
  return deployment.address;
});

export {};
