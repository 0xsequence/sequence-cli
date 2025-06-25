import { Command } from 'commander';
import { createListings } from './create_listings';
import { createMarketplaceBoilerplate } from './create_marketplace_boilerplate';

export const SEQUENCE_MARKETPLACE_V1_ADDRESS =
  '0xB537a160472183f2150d42EB1c3DD6684A55f74c';

export const SEQUENCE_MARKETPLACE_V2_ADDRESS =
  '0xfdb42A198a932C8D3B506Ffa5e855bC4b348a712';

export function makeCommandMarketplace(program: Command) {
  const comm = new Command('marketplace');

  comm.action(() => {
    comm.help();
  });

  comm
    .command('create-listings')
    .description(
      'Create listings for tokens in your wallet using the Sequence Marketplace contract'
    )
    .option('--type <type>', 'Collection type ERC1155 or ERC721', 'ERC1155')
    .option(
      '-k, --key <private_key>',
      'Private key for the wallet that holds the tokens'
    )
    .option(
      '-a, --address <collection_address>',
      'Address of the collection contract'
    )
    .option('-t, --token <token_id>', 'ID for the token to be listed', parseInt)
    .option(
      '-n, --network <network>',
      'Network to be used (mainnet, polygon, etc.)'
    )
    .option(
      '-c, --currency <currency>',
      'Address for the currency token to be used for the listing'
    )
    .option('-p, --price <price>', 'Price per token, in the currency specified')
    .option(
      '-q, --quantity <quantity>',
      'Number of tokens to be listed',
      parseInt,
      1
    )
    .option(
      '--expire-in <expiry_time>',
      'Days to expiry for the listing',
      parseInt,
      7
    )
    .option(
      '--project-access-key <access_key>',
      'Project access key for Sequence requests'
    )
    .option('--marketplace-version <version>', 'Marketplace version', 'v2')
    .option('--verbose', 'Show additional information in the output')
    .action(options => {
      createListings(program, options);
    });

  comm
    .command('create-marketplace-boilerplate')
    .description(
      'Clone a starter boilerplate for Marketplace integrated with Next.js'
    )
    .option(
      '-pkey --project-access-key <access_key>',
      'Project access key for Sequence requests'
    )
    .option('-pid --project-id <project_id>', 'Project ID from your project')
    .option('--verbose', 'Show additional information in the output')
    .action(options => {
      createMarketplaceBoilerplate(program, options);
    });

  return comm;
}
