import { Command } from 'commander';
import { createSingleSigner } from './create_single_signer';
import { identifySequenceWallet } from './identify_sequence_wallet';
import { sendTx } from './send_tx';

export function makeCommandWallet(program: Command) {
  const comm = new Command('wallet');

  comm.action(() => {
    comm.help();
  });

  comm
    .command('send-tx')
    .description(
      'Sign tx data coming from marketplace API and send it to chain'
    )
    .option(
      '-k, --key <private_key>',
      'Private key for the wallet that holds the tokens'
    )
    .option('-d, --data <data>', 'TX data from marketplace API')
    .option('--to <to>', 'Target address')
    .option(
      '-n, --network <network>',
      'Network to be used (mainnet, polygon, etc.)'
    )
    .option('--value <value>', 'Value in wei')
    .action(options => {
      sendTx(program, options);
    });

  comm
    .command('create-single-signer')
    .description(
      'Generate a Sequence Wallet Single Signer using an EOA wallet (i.e. MetaMask)'
    )
    .option(
      '-k, --key <private_key>',
      'Private key for the wallet that holds the tokens'
    )
    .option(
      '-n, --network <network>',
      'Network to be used (mainnet, polygon, etc.)'
    )
    .option(
      '--project-access-key <access_key>',
      'Project access key for Sequence requests'
    )
    .option('--verbose', 'Show additional information in the output')
    .action(options => {
      createSingleSigner(program, options);
    });

  comm
    .command('identify-sequence-wallet')
    .description('Identify Sequence Wallet address from a transaction hash')
    .option('-t, --txn <txn>', 'Transaction hash to be used')
    .option(
      '-n, --network <network>',
      'Network to be used (mainnet, polygon, etc.)'
    )
    .option(
      '--project-access-key <access_key>',
      'Project access key for Sequence requests'
    )
    .option('--verbose', 'Show additional information in the output')
    .action(options => {
      identifySequenceWallet(program, options);
    });

  return comm;
}
