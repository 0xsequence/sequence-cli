import { Command } from 'commander';
import { input, password, number } from '@inquirer/prompts';
import { ethers, Numeric } from 'ethers';
import { findSupportedNetwork } from '@0xsequence/network';
import { cliConsole, isValidPrivateKey } from '../utils/';
import { ERC1155_ABI } from '../abi/ERC_1155';
import { SequenceMarketplace_V1_ABI } from '../abi/SequenceMarketplaceV1';
import { ERC721_ABI } from '../abi/ERC_721';
import {
  createWalletClient,
  http,
  Address,
  getContract,
  WalletClient,
  Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SequenceMarketplace_V2_ABI } from '../abi/SequenceMarketplaceV2';
import {
  SEQUENCE_MARKETPLACE_V1_ADDRESS,
  SEQUENCE_MARKETPLACE_V2_ADDRESS,
} from './marketplace';

type ListingRequest = {
  collectionAddress: Address;
  walletAddress: Address;
  // currency address or well-known currency (USDC, MATIC)
  currency: Address | string;
  tokenId: bigint;
  price: bigint;
  quantity: Numeric;
  expiry: Numeric;
  marketplaceAddress: Address;
};

export async function createListings(program: Command, options: any) {
  let privateKey = options.key;
  let collectionAddress = options.address;
  let tokenId = options.token;
  let network = options.network;
  let currency = options.currency;
  let price = options.price;
  let quantity = options.quantity;
  const isERC1155 = options.type === 'ERC1155';

  cliConsole.sectionTitle(
    `Initializing creation process for Create Listings 🚀`
  );

  if (!isERC1155) {
    // ERC721 must be always quantity = 1
    quantity = 1;
  }

  if (!privateKey) {
    privateKey = await password({
      message: 'Enter the private key for the wallet that holds the tokens',
    });

    if (!isValidPrivateKey(privateKey) && privateKey) {
      cliConsole.error('Please input a valid EVM Private key');
      process.exit();
    }
  }

  if (!collectionAddress) {
    collectionAddress = await input({
      message: 'Enter the address of the collection contract',
    });
  }

  if (tokenId === null || tokenId === undefined) {
    tokenId = await number({
      message: 'Enter the ID for the token to be listed',
    });
  }

  if (!network) {
    cliConsole.info(
      'Please provide the Network for your project as a Sequence chain handle'
    );
    cliConsole.info(
      'Possible networks can be found at https://docs.sequence.xyz/solutions/technical-references/chain-support'
    );

    network = await input({
      message: 'Enter the network to be used (mainnet, polygon, etc.)',
    });
  }

  if (!currency) {
    currency = await input({
      message:
        'Enter either a well known currency code (USDC, MATIC, etc.) or a token address',
    });
  }

  if (!price) {
    price = await input({
      message: 'Enter the price per token, in the currency specified',
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

  if (options.verbose) {
    cliConsole.info(`Using node URL: ${nodeUrl}`);
  }

  const provider = new ethers.JsonRpcProvider(nodeUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Set up the wallet client
  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: {
      id: chainConfig.chainId,
      name: String(chainConfig.title),
      nativeCurrency: {
        name: chainConfig.nativeToken.name,
        decimals: chainConfig.nativeToken.decimals,
        symbol: chainConfig.nativeToken.symbol,
      },
      rpcUrls: {
        default: {
          http: [nodeUrl],
        },
      },
    },
    transport: http(nodeUrl),
  });

  let walletAddress = wallet.address as Address;
  if (!walletAddress.startsWith('0x')) {
    walletAddress = `0x${walletAddress}`;
  }

  let marketplaceAddress = SEQUENCE_MARKETPLACE_V2_ADDRESS;
  if (options.marketplaceVersion === 'v1') {
    marketplaceAddress = SEQUENCE_MARKETPLACE_V1_ADDRESS;
  }

  const marketplaceABI =
    options.marketplaceVersion == 'v2'
      ? SequenceMarketplace_V2_ABI
      : SequenceMarketplace_V1_ABI;

  cliConsole.info(`Using EOA Wallet: ${walletAddress}`);
  cliConsole.info(`Collection Address: ${collectionAddress}`);
  cliConsole.info(`Currency token address: ${currency}`);
  cliConsole.info(`Contract Type: ${options.type}, Is 1155: ${isERC1155}`);
  cliConsole.info(`Using marketplace version: ${options.marketplaceVersion}`);

  const listingRequest = {
    collectionAddress,
    walletAddress,
    tokenId,
    currency,
    price,
    quantity,
    expiry: options.expireIn,
    marketplaceAddress: marketplaceAddress as Address,
  };

  if (isERC1155) {
    try {
      await approvalERC1155(walletClient, listingRequest);
    } catch (e) {
      console.dir(e, { depth: null });
      return;
    }
  } else {
    try {
      await approvalERC721(walletClient, listingRequest);
    } catch (e) {
      console.dir(e, { depth: null });
      return;
    }
  }

  const marketplaceContract = getContract({
    address: listingRequest.marketplaceAddress,
    abi: marketplaceABI,
    client: walletClient,
  });

  try {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const expiryInSeconds = listingRequest.expiry * 24 * 60 * 60;

    cliConsole.loading('Creating listing');

    const res = await marketplaceContract.write.createRequest(
      [
        {
          isListing: true,
          isERC1155: isERC1155,
          tokenContract: listingRequest.collectionAddress,
          tokenId: BigInt(listingRequest.tokenId),
          quantity: BigInt(listingRequest.quantity),
          expiry: BigInt(currentTimeInSeconds + expiryInSeconds),
          currency: listingRequest.currency,
          pricePerToken: ethers.parseUnits(price, 6),
        },
      ],
      {
        account: walletClient.account,
        chain: walletClient.chain,
      }
    );

    cliConsole.done(`Listing created: ${res}`);
  } catch (error) {
    console.dir(error, { depth: null });
    program.error('Error processing transaction, please try again.');
  }

  cliConsole.done(`Listing created successfully for token ID ${tokenId}`);
}

async function approvalERC1155(client: WalletClient, input: ListingRequest) {
  const collectionContract = getContract({
    address: input.collectionAddress as Hex,
    abi: ERC1155_ABI,
    client: client,
  });

  const isApprovedForAll = await collectionContract.read.isApprovedForAll(
    [input.walletAddress, input.marketplaceAddress],
    {
      account: client.account,
    }
  );

  if (!isApprovedForAll) {
    await collectionContract.write.setApprovalForAll(
      [input.marketplaceAddress, true],
      {
        account: client.account as any,
        chain: client.chain,
      }
    );
    cliConsole.done('ERC1155 setApprovalForAll executed successfully');
  }
}

async function approvalERC721(client: WalletClient, input: ListingRequest) {
  const collectionContract = getContract({
    address: input.collectionAddress as Hex,
    abi: ERC721_ABI,
    client: client,
  });

  const isApprovedForAll = await collectionContract.read.isApprovedForAll(
    [input.walletAddress, input.marketplaceAddress],
    {
      account: client.account,
    }
  );

  if (!isApprovedForAll) {
    await collectionContract.write.setApprovalForAll(
      [input.marketplaceAddress, true],
      { account: client.account as any, chain: client.chain }
    );
    cliConsole.done('ERC721 setApprovalForAll executed successfully');
  }
}
