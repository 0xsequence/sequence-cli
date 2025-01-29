import { Command } from 'commander';
import { password, input } from '@inquirer/prompts';
import { ethers, FunctionFragment } from 'ethers';
import { findSupportedNetwork } from '@0xsequence/network';
import { isValidPrivateKey } from '../utils/';
import { ERC1155_ABI } from '../abi/ERC_1155';
import { Session } from '@0xsequence/auth';

export async function testGasSponsorERC1155(program: Command, options: any) {
  let privateKey = options.key;
  let contractAddress = options.contract;
  let network = options.network;
  let projectAccessKey = options.projectAccessKey;

  // Get required inputs
  if (!privateKey) {
    privateKey = await input({
      message: 'Enter private key for the wallet initiating transaction',
    });

    if (!isValidPrivateKey(privateKey)) {
      program.error('Invalid private key format');
      return;
    }
  }

  if (!projectAccessKey) {
    projectAccessKey = await input({
      message: 'Enter your Sequence project access key',
    });
  }

  if (!network) {
    network = await input({
      message: 'Enter network (e.g. polygon, mainnet)',
    });
  }

  const chainConfig = findSupportedNetwork(network);

  if (chainConfig === undefined) {
    program.error('Unsupported network, please select a valid network');
  }

  const session = await Session.singleSigner({
    signer: privateKey,
    projectAccessKey: options.projectAccessKey,
  });

  const signer = session.account.getSigner(chainConfig.chainId, {
    selectFee: async (_txs: any, options: any[]) => {
      const found = options.find(o => !o.token.contractAddress);

      return found;
    },
  });

  // Get contract address
  if (!contractAddress) {
    contractAddress = await input({
      message: 'Enter ERC1155 contract address',
    });
  }

  console.log(`Make sure this wallet has mint permissions: ${session.account.address}`);

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);

  try {
    // Execute gas-sponsored transfer
    const _address = session.account.address;
    const _tokenId = 0;
    const _amount = 1;
    const _data = '0x00';

    console.log('Executing gas-sponsored transfer...');
    const txn = await contract.mint.populateTransaction(
      _address,
      _tokenId,
      _amount,
      _data
    );
    const txnResponse = await signer.sendTransaction(txn);
    const txnReceipt = await txnResponse.wait();
    console.log(txnReceipt?.hash);
  } catch (error: any) {
    console.log(error);
    program.error(`Transaction failed: ${error}`);
  }
}
