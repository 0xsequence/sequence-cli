import { Command } from 'commander';
import { input, password } from '@inquirer/prompts';
import { isValidPrivateKey } from '../utils';
import { findSupportedNetwork } from '@0xsequence/network';
import { ethers } from 'ethers';

export async function sendTx(program: Command, options: any) {
  let privateKey = options.key;
  let network = options.network;
  let data = options.data;
  let to = options.to;
  let value = options.value;

  if (!privateKey) {
    privateKey = await password({
      message: 'Enter the private key for the wallet that holds the tokens',
    });

    if (!isValidPrivateKey(privateKey) && privateKey) {
      console.log('Please input a valid EVM Private key');
      process.exit();
    }
  }

  if (!to) {
    console.log('Please provide target address');

    to = await input({
      message: 'Enter target address',
    });
  }

  if (!network) {
    console.log(
      'Please provide the Network for your project as a Sequence chain handle'
    );
    console.log(
      'Possible networks can be found at https://docs.sequence.xyz/solutions/technical-references/chain-support'
    );

    network = await input({
      message: 'Enter the network to be used (mainnet, polygon, etc.)',
    });
  }

  if (!data) {
    console.log('Please provide the transaction data');

    data = await input({
      message: 'Please provide the transaction data',
    });
  }

  const chainConfig = findSupportedNetwork(network);
  if (chainConfig === undefined) {
    program.error('Unsupported network, please select a valid network');
    return;
  }

  let nodeUrl = chainConfig.rpcUrl;
  if (options.projectAccessKey) {
    nodeUrl += '/' + options.projectAccessKey;
  }

  const provider = new ethers.JsonRpcProvider(nodeUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  try {
    const res = await wallet.sendTransaction({
      data: data,
      to: to,
      value: value,
    });
    console.log('Transaction hash', res.hash);
  } catch (e) {
    console.error(e);
    return;
  }
}
