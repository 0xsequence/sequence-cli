#!/usr/bin/env node

import { Command } from 'commander'
import { input, password, number } from '@inquirer/prompts'
import { ethers } from 'ethers'
import { sequence } from '0xsequence';
import { Session } from '@0xsequence/auth'
import { findSupportedNetwork } from '@0xsequence/network'

import figlet from "figlet"

const SEQUENCE_MARKETPLACE_V1_ADDRESS = "0xB537a160472183f2150d42EB1c3DD6684A55f74c"
const ORDERBOOK_ABI = [
    {
        inputs: [
          {
            components: [
              { internalType: 'bool', name: 'isListing', type: 'bool' },
              { internalType: 'bool', name: 'isERC1155', type: 'bool' },
              { internalType: 'address', name: 'tokenContract', type: 'address' },
              { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'quantity', type: 'uint256' },
              { internalType: 'uint96', name: 'expiry', type: 'uint96' },
              { internalType: 'address', name: 'currency', type: 'address' },
              { internalType: 'uint256', name: 'pricePerToken', type: 'uint256' },
            ],
            internalType: 'struct ISequenceMarketStorage.RequestParams',
            name: 'request',
            type: 'tuple',
          },
        ],
        name: 'createRequest',
        outputs: [{ internalType: 'uint256', name: 'requestId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    }
]

const ERC1155_ABI = [
    {
        "type": "function",
        "name": "setApprovalForAll",
        "inputs": [
            {
                "name": "_operator",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_approved",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [

        ],
        "stateMutability": "nonpayable"
    }
]

console.log(figlet.textSync("Sequence"))
console.log("")

const program = new Command()

program.version('0.1.0', '-v, --version', 'Display the current version').action(() => {
    program.help()
})

async function createListings(options: any) {
    let privateKey = options.key
    let collectionAddress = options.address
    let tokenId = options.token
    let network = options.network
    let currency = options.currency
    let price = options.price
    let quantity = options.quantity

    if (!privateKey) {
        privateKey = await password({
            message: 'Enter the private key for the wallet that holds the tokens'
        })
    }

    if (!collectionAddress) {
        collectionAddress = await input({
            message: 'Enter the address of the collection contract'
        })
    }

    if (!tokenId) {
        tokenId = await number({
            message: 'Enter the ID for the token to be listed'
        })
    }

    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
        })
    }

    if (!currency) {
        currency = await input({
            message: 'Enter either a well known currency code (USDC, MATIC, etc.) or a token address'
        })
    }

    if (!price) {
        price = await input({
            message: 'Enter the price per token, in the currency specified'
        })
    }

    const chainConfig = findSupportedNetwork(network);

    if (chainConfig === undefined) {
        program.error("Unsupported network, please select a valid network")
        return
    }

    let nodeUrl = chainConfig.rpcUrl

    if (options.projectAccessKey) {
        nodeUrl += "/" + options.projectAccessKey
    }
    
    console.log(`Using node URL: ${nodeUrl}`)

    const provider = new ethers.providers.JsonRpcProvider(nodeUrl)
    const wallet = new ethers.Wallet(privateKey, provider)
    const session = await Session.singleSigner({
        signer: wallet,
        projectAccessKey: options.projectAccessKey,
    })

    console.log(`Using EOA Wallet: ${wallet.address}`)
    console.log(`Using Sequence Wallet: ${session.account.address}`)

    const collectionInterface = new ethers.utils.Interface(ERC1155_ABI)
    const dataApproveToken = collectionInterface.encodeFunctionData(
        "setApprovalForAll",
        [
            ethers.utils.hexlify(session.account.address),
            true
        ]
    )

    const approveTxn = {
        to: collectionAddress,
        data: dataApproveToken
    }

    try {
        const res = await wallet.sendTransaction(approveTxn)
        console.log(`Transaction sent: ${res.hash}`)

        const receipt = await res.wait()
        console.dir(receipt, { depth: null });
    } catch (error) {
        console.dir(error, { depth: null });
        program.error('Error processing transaction, please try again.')
    }

    const sequenceMarketplaceInterface = new ethers.utils.Interface(ORDERBOOK_ABI)

    const dataCreateRequest = sequenceMarketplaceInterface.encodeFunctionData(
        "createRequest",
        [{
            isListing: true,
            isERC1155: true,
            tokenContract: ethers.utils.hexlify(collectionAddress),
            tokenId: BigInt(tokenId),
            quantity: BigInt(quantity),
            expiry: BigInt(Date.now() + (options.expireIn * 24 * 60 * 60)),
            currency: ethers.utils.hexlify(currency),
            pricePerToken: ethers.utils.parseUnits(price, 18).toBigInt(),
        }]
    )

    const txn = {
        to: SEQUENCE_MARKETPLACE_V1_ADDRESS,
        data: dataCreateRequest
    }

    const signer = session.account.getSigner(chainConfig.chainId);

    try {
        const res = await signer.sendTransaction(txn)
        console.log(`Transaction sent: ${res.hash}`)

        const receipt = await provider.getTransactionReceipt(res.hash)
        console.dir(receipt, { depth: null });
    } catch (error) {
        console.dir(error, { depth: null });
        program.error('Error processing transaction, please try again.')
    }
}

function makeCommandMarketplace() {
    const comm = new Command('marketplace');

    comm.action(() => {
        comm.help();
    })

    comm
    .command('create-listings')
    .description('Create listings for tokens with Sequence Marketplace contracts')
    .option('-k, --key <private_key>', 'Private key for the wallet that holds the tokens')
    .option('-a, --address <collection_address>', 'Address of the collection contract')
    .option('-t, --token <token_id>', 'ID for the token to be listed', parseInt)
    .option('-n, --network <network>', 'Network to be used (mainnet, polygon, etc.)')
    .option('-c, --currency <currency>', 'Either a well known currency code (USDC, MATIC, etc.) or a token address')
    .option('-p, --price <price>', 'Price per token, in the currency specified')
    .option('-q, --quantity <quantity>', 'Number of tokens to be listed', parseInt, 1)
    .option('--expire-in <expiry_time>', 'Days to expiry for the listing', parseInt, 7)
    .option('--project-access-key <access_key>', 'Project access key for Sequence requests')
    .action(options => {
        createListings(options)
    })

    return comm;
}

program.addCommand(makeCommandMarketplace())

program.parse(process.argv)
