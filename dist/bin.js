#!/usr/bin/env node
import { Command } from 'commander';
import { password, input, number } from '@inquirer/prompts';
import { ethers } from 'ethers';
import { findSupportedNetwork } from '@0xsequence/network';
import { Session } from '@0xsequence/auth';
import shell from 'shelljs';
import figlet from 'figlet';

const ERC1155_ABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "_owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_operator",
                type: "address",
            },
            {
                indexed: false,
                internalType: "bool",
                name: "_approved",
                type: "bool",
            },
        ],
        name: "ApprovalForAll",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "_operator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256[]",
                name: "_ids",
                type: "uint256[]",
            },
            {
                indexed: false,
                internalType: "uint256[]",
                name: "_amounts",
                type: "uint256[]",
            },
        ],
        name: "TransferBatch",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "_operator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "_to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "_id",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "_amount",
                type: "uint256",
            },
        ],
        name: "TransferSingle",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_owner",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_id",
                type: "uint256",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "_owners",
                type: "address[]",
            },
            {
                internalType: "uint256[]",
                name: "_ids",
                type: "uint256[]",
            },
        ],
        name: "balanceOfBatch",
        outputs: [
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_id",
                type: "uint256",
            },
        ],
        name: "getIDBinIndex",
        outputs: [
            {
                internalType: "uint256",
                name: "bin",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_binValues",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256",
            },
        ],
        name: "getValueInBin",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "_operator",
                type: "address",
            },
        ],
        name: "isApprovedForAll",
        outputs: [
            {
                internalType: "bool",
                name: "isOperator",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_from",
                type: "address",
            },
            {
                internalType: "address",
                name: "_to",
                type: "address",
            },
            {
                internalType: "uint256[]",
                name: "_ids",
                type: "uint256[]",
            },
            {
                internalType: "uint256[]",
                name: "_amounts",
                type: "uint256[]",
            },
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
            },
        ],
        name: "safeBatchTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_from",
                type: "address",
            },
            {
                internalType: "address",
                name: "_to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_id",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_amount",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
            },
        ],
        name: "safeTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_operator",
                type: "address",
            },
            {
                internalType: "bool",
                name: "_approved",
                type: "bool",
            },
        ],
        name: "setApprovalForAll",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "_interfaceID",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
];

const Orderbook_ABI = [
    {
        inputs: [{ internalType: "address", name: "_owner", type: "address" }],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    { inputs: [], name: "InvalidAdditionalFees", type: "error" },
    { inputs: [], name: "InvalidBatchRequest", type: "error" },
    { inputs: [], name: "InvalidCurrency", type: "error" },
    {
        inputs: [
            { internalType: "address", name: "currency", type: "address" },
            { internalType: "uint256", name: "quantity", type: "uint256" },
            { internalType: "address", name: "owner", type: "address" },
        ],
        name: "InvalidCurrencyApproval",
        type: "error",
    },
    { inputs: [], name: "InvalidExpiry", type: "error" },
    { inputs: [], name: "InvalidPrice", type: "error" },
    { inputs: [], name: "InvalidQuantity", type: "error" },
    {
        inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
        name: "InvalidRequestId",
        type: "error",
    },
    { inputs: [], name: "InvalidRoyalty", type: "error" },
    {
        inputs: [
            { internalType: "address", name: "tokenContract", type: "address" },
            { internalType: "uint256", name: "tokenId", type: "uint256" },
            { internalType: "uint256", name: "quantity", type: "uint256" },
            { internalType: "address", name: "owner", type: "address" },
        ],
        name: "InvalidTokenApproval",
        type: "error",
    },
    {
        inputs: [
            { internalType: "address", name: "contractAddress", type: "address" },
            { internalType: "bytes4", name: "interfaceId", type: "bytes4" },
        ],
        name: "UnsupportedContractInterface",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "tokenContract",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            { indexed: false, internalType: "uint96", name: "fee", type: "uint96" },
        ],
        name: "CustomRoyaltyChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "requestId",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "buyer",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "tokenContract",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "receiver",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "quantity",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "quantityRemaining",
                type: "uint256",
            },
        ],
        name: "RequestAccepted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "requestId",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "tokenContract",
                type: "address",
            },
        ],
        name: "RequestCancelled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "requestId",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "creator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "tokenContract",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "tokenId",
                type: "uint256",
            },
            { indexed: false, internalType: "bool", name: "isListing", type: "bool" },
            {
                indexed: false,
                internalType: "uint256",
                name: "quantity",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "currency",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "pricePerToken",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "expiry",
                type: "uint256",
            },
        ],
        name: "RequestCreated",
        type: "event",
    },
    {
        inputs: [
            { internalType: "uint256", name: "requestId", type: "uint256" },
            { internalType: "uint256", name: "quantity", type: "uint256" },
            { internalType: "address", name: "receiver", type: "address" },
            { internalType: "uint256[]", name: "additionalFees", type: "uint256[]" },
            {
                internalType: "address[]",
                name: "additionalFeeReceivers",
                type: "address[]",
            },
        ],
        name: "acceptRequest",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256[]", name: "requestIds", type: "uint256[]" },
            { internalType: "uint256[]", name: "quantities", type: "uint256[]" },
            { internalType: "address[]", name: "receivers", type: "address[]" },
            { internalType: "uint256[]", name: "additionalFees", type: "uint256[]" },
            {
                internalType: "address[]",
                name: "additionalFeeReceivers",
                type: "address[]",
            },
        ],
        name: "acceptRequestBatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
        name: "cancelRequest",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256[]", name: "requestIds", type: "uint256[]" },
        ],
        name: "cancelRequestBatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.RequestParams",
                name: "request",
                type: "tuple",
            },
        ],
        name: "createRequest",
        outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.RequestParams[]",
                name: "requests",
                type: "tuple[]",
            },
        ],
        name: "createRequestBatch",
        outputs: [
            { internalType: "uint256[]", name: "requestIds", type: "uint256[]" },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "customRoyalties",
        outputs: [
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "uint96", name: "fee", type: "uint96" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
        name: "getRequest",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "creator", type: "address" },
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.Request",
                name: "request",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256[]", name: "requestIds", type: "uint256[]" },
        ],
        name: "getRequestBatch",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "creator", type: "address" },
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.Request[]",
                name: "requests",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "tokenContract", type: "address" },
            { internalType: "uint256", name: "tokenId", type: "uint256" },
            { internalType: "uint256", name: "cost", type: "uint256" },
        ],
        name: "getRoyaltyInfo",
        outputs: [
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "uint256", name: "royalty", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "requestId", type: "uint256" },
            { internalType: "uint256", name: "quantity", type: "uint256" },
        ],
        name: "isRequestValid",
        outputs: [
            { internalType: "bool", name: "valid", type: "bool" },
            {
                components: [
                    { internalType: "address", name: "creator", type: "address" },
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.Request",
                name: "request",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256[]", name: "requestIds", type: "uint256[]" },
            { internalType: "uint256[]", name: "quantities", type: "uint256[]" },
        ],
        name: "isRequestValidBatch",
        outputs: [
            { internalType: "bool[]", name: "valid", type: "bool[]" },
            {
                components: [
                    { internalType: "address", name: "creator", type: "address" },
                    { internalType: "bool", name: "isListing", type: "bool" },
                    { internalType: "bool", name: "isERC1155", type: "bool" },
                    { internalType: "address", name: "tokenContract", type: "address" },
                    { internalType: "uint256", name: "tokenId", type: "uint256" },
                    { internalType: "uint256", name: "quantity", type: "uint256" },
                    { internalType: "uint96", name: "expiry", type: "uint96" },
                    { internalType: "address", name: "currency", type: "address" },
                    { internalType: "uint256", name: "pricePerToken", type: "uint256" },
                ],
                internalType: "struct ISequenceMarketStorage.Request[]",
                name: "requests",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "tokenContract", type: "address" },
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "uint96", name: "fee", type: "uint96" },
        ],
        name: "setRoyaltyInfo",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];

const SEQUENCE_MARKETPLACE_V1_ADDRESS = "0xB537a160472183f2150d42EB1c3DD6684A55f74c";
async function createListings(program, options) {
    let privateKey = options.key;
    let collectionAddress = options.address;
    let tokenId = options.token;
    let network = options.network;
    let currency = options.currency;
    let price = options.price;
    let quantity = options.quantity;
    if (!privateKey) {
        privateKey = await password({
            message: "Enter the private key for the wallet that holds the tokens",
        });
    }
    if (!collectionAddress) {
        collectionAddress = await input({
            message: "Enter the address of the collection contract",
        });
    }
    if (!tokenId) {
        tokenId = await number({
            message: "Enter the ID for the token to be listed",
        });
    }
    if (!network) {
        network = await input({
            message: "Enter the network to be used (mainnet, polygon, etc.)",
        });
    }
    if (!currency) {
        currency = await input({
            message: "Enter either a well known currency code (USDC, MATIC, etc.) or a token address",
        });
    }
    if (!price) {
        price = await input({
            message: "Enter the price per token, in the currency specified",
        });
    }
    const chainConfig = findSupportedNetwork(network);
    if (chainConfig === undefined) {
        program.error("Unsupported network, please select a valid network");
        return;
    }
    let nodeUrl = chainConfig.rpcUrl;
    if (options.projectAccessKey) {
        nodeUrl += "/" + options.projectAccessKey;
    }
    if (options.verbose) {
        console.log(`Using node URL: ${nodeUrl}`);
    }
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using EOA Wallet: ${wallet.address}`);
    console.log("Collection Address:", collectionAddress);
    console.log("Currency token address:", currency);
    const collectionContract = new ethers.Contract(collectionAddress, ERC1155_ABI, wallet);
    await collectionContract.balanceOf(wallet.address, tokenId);
    let isApprovedForAll = false;
    try {
        isApprovedForAll = await collectionContract.isApprovedForAll(wallet.address, SEQUENCE_MARKETPLACE_V1_ADDRESS);
    }
    catch (error) {
        console.dir(error, { depth: null });
        program.error("Error checking approval.");
    }
    if (!isApprovedForAll) {
        const approveTxn = getErc1155ApproveAllTransaction(collectionAddress, SEQUENCE_MARKETPLACE_V1_ADDRESS);
        try {
            const res = await wallet.sendTransaction(approveTxn);
            if (options.verbose) {
                console.log(`Approve transaction sent: ${res.hash}`);
            }
            const receipt = await res.wait();
            if (options.verbose) {
                console.dir(receipt, { depth: null });
            }
        }
        catch (error) {
            console.dir(error, { depth: null });
            program.error("Error processing transaction, please try again.");
        }
    }
    const sequenceMarketplaceInterface = new ethers.Interface(Orderbook_ABI);
    const dataCreateRequest = sequenceMarketplaceInterface.encodeFunctionData("createRequest", [
        {
            isListing: true,
            isERC1155: true,
            tokenContract: ethers.hexlify(collectionAddress),
            tokenId: BigInt(tokenId),
            quantity: BigInt(quantity),
            expiry: BigInt(Math.floor(new Date().getTime() / 1000) +
                options.expireIn * 24 * 60 * 60),
            currency: ethers.hexlify(currency),
            pricePerToken: ethers.parseUnits(price, 6),
        },
    ]);
    const txn = {
        to: SEQUENCE_MARKETPLACE_V1_ADDRESS,
        data: dataCreateRequest,
    };
    try {
        const res = await wallet.sendTransaction(txn);
        if (options.verbose) {
            console.log(`Create request transaction sent: ${res.hash}`);
        }
        const receipt = await res.wait();
        if (options.verbose) {
            console.dir(receipt, { depth: null });
        }
    }
    catch (error) {
        console.dir(error, { depth: null });
        program.error("Error processing transaction, please try again.");
    }
    console.log(`Listing created successfully for token ID ${tokenId}`);
}
const getErc1155ApproveAllTransaction = (tokenAddress, spender) => {
    const erc1155Interface = new ethers.Interface(ERC1155_ABI);
    const erc1155Data = erc1155Interface.encodeFunctionData("setApprovalForAll", [
        spender,
        true,
    ]);
    const erc1155ApprovalTx = {
        to: tokenAddress,
        data: erc1155Data,
    };
    return erc1155ApprovalTx;
};

function makeCommandMarketplace(program) {
    const comm = new Command("marketplace");
    comm.action(() => {
        comm.help();
    });
    comm
        .command("create-listings")
        .description("Create listings for tokens in your wallet using the Sequence Marketplace contract")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-a, --address <collection_address>", "Address of the collection contract")
        .option("-t, --token <token_id>", "ID for the token to be listed", parseInt)
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("-c, --currency <currency>", "Address for the currency token to be used for the listing")
        .option("-p, --price <price>", "Price per token, in the currency specified")
        .option("-q, --quantity <quantity>", "Number of tokens to be listed", parseInt, 1)
        .option("--expire-in <expiry_time>", "Days to expiry for the listing", parseInt, 7)
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createListings(program, options);
    });
    return comm;
}

async function createSingleSigner(program, options) {
    let privateKey = options.key;
    let network = options.network;
    if (!privateKey) {
        privateKey = await password({
            message: "Enter the private key for an EOA wallet (i.e. MetaMask)",
        });
    }
    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
        });
    }
    const chainConfig = findSupportedNetwork(network);
    if (chainConfig === undefined) {
        program.error("Unsupported network, please select a valid network");
        return;
    }
    let nodeUrl = chainConfig.rpcUrl;
    if (options.projectAccessKey) {
        nodeUrl += "/" + options.projectAccessKey;
    }
    if (options.verbose) {
        console.log(`Using node URL: ${nodeUrl}`);
    }
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const session = await Session.singleSigner({
        signer: wallet,
        projectAccessKey: options.projectAccessKey,
    });
    console.log(`Your EOA Wallet: ${wallet.address}`);
    console.log(`Your Sequence Wallet Single Signer: ${session.account.address}`);
}

function makeCommandWallet(program) {
    const comm = new Command("wallet");
    comm.action(() => {
        comm.help();
    });
    comm
        .command("create-single-signer")
        .description("Generate a Sequence Wallet Single Signer using an EOA wallet (i.e. MetaMask)")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createSingleSigner(program, options);
    });
    return comm;
}

const EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/kit-embedded-wallet-react-boilerplate/";
const TX_MANAGER_REPO_URL = "https://github.com/0xsequence-demos/tx-manager";
const devMode = process.env.DEV === 'true';
async function createEmbeddedWalletReact(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    if (!waasConfigKey) {
        console.log("Please provide the WaaS Config Key for your project.");
        console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
        console.log("To skip and use the default test config key, press enter.");
        waasConfigKey = await input({
            message: "WaaS Config Key:",
        });
        console.log("");
    }
    if (!projectAccessKey && waasConfigKey != '') {
        console.log("Please provide the Project Access Key for your project.");
        console.log("Your access key can be found at https://sequence.build under the project settings.");
        console.log("To skip and use the default test access key, press enter.");
        projectAccessKey = await input({
            message: "Project Access Key:",
        });
        console.log("");
    }
    if (!googleClientId && waasConfigKey != '') {
        console.log("Please provide the Google Client ID for your project.");
        console.log("Your client ID can be found at https://console.cloud.google.com/apis/credentials");
        console.log("To skip and use the default test client ID, press enter.");
        googleClientId = await input({
            message: "Google Client ID:",
        });
        console.log("");
    }
    if (!appleClientId && waasConfigKey != '') {
        console.log("Please provide the Apple Client ID for your project.");
        console.log("Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId");
        console.log("To skip and use the default test client ID, press enter.");
        appleClientId = await input({
            message: "Apple Client ID:",
        });
        console.log("");
    }
    console.log("Cloning the repo to `embedded-wallet-react-boilerplate`...");
    shell.exec(`git clone ${EMBEDDED_WALLET_REACT_REPO_URL} embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("embedded-wallet-react-boilerplate");
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '') {
            shell.exec(`echo VITE_WAAS_CONFIG_KEY=${waasConfigKey} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('VITE_PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo VITE_PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('VITE_GOOGLE_CLIENT_ID') && googleClientId != '' && googleClientId != undefined) {
            shell.exec(`echo VITE_GOOGLE_CLIENT_ID=${googleClientId} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('VITE_APPLE_CLIENT_ID') && appleClientId != '' && appleClientId != undefined) {
            shell.exec(`echo VITE_APPLE_CLIENT_ID=${appleClientId} >> .env`, { silent: !options.verbose });
        }
        else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }
    console.log("Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}
async function createTxManager(program, options) {
    let network = options.network;
    let privateKey = options.key;
    let projectAccessKey = options.projectAccessKey;
    if (!network) {
        console.log("Please provide the Network for your project as a Sequence chain handle");
        console.log("Possible networks can be found at https://docs.sequence.xyz/solutions/technical-references/chain-support");
        console.log("To skip and use the default test network key, press enter.");
        console.log("To skip and use the default test network key, press enter.");
        network = await input({
            message: "Chain Handle (Network):",
        });
        console.log('testing');
        // console.log(await findSupportedNetwork(network))
        console.log("");
    }
    if (!privateKey) {
        console.log("Please provide a relayer private key for your project.");
        console.log("You can obtain one for demo purposes here https://sequence-ethauthproof-viewer.vercel.app/");
        console.log("To skip and use the default evm private key, press enter.");
        console.log("");
        console.log("Note: This private key's computed Sequence Wallet Address will have to have a Minter Role Granted on a Sequence standard contract in order for minting to work.");
        privateKey = await input({
            message: "EVM Private Key:",
        });
        console.log("");
    }
    if (!projectAccessKey) {
        console.log("Please provide the Project Access Key for your project.");
        console.log("Your access key can be found at https://sequence.build under the project settings.");
        console.log("To skip and use the default test access key, press enter.");
        projectAccessKey = await input({
            message: "Project Access Key:",
        });
        console.log("");
    }
    console.log("Cloning the repo to `tx-manager-boilerplate`...");
    shell.exec(`git clone ${TX_MANAGER_REPO_URL} tx-manager`, { silent: !options.verbose });
    shell.cd("tx-manager");
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    // shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    devMode && shell.cd("../tx-manager/server"); // for Local Development
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('CHAIN_HANDLE') && network != '' && network != undefined) {
            shell.exec(`echo CHAIN_HANDLE=${network} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('EVM_PRIVATE_KEY') && privateKey != '' && privateKey != undefined) {
            shell.exec(`echo EVM_PRIVATE_KEY=${privateKey} >> .env`, { silent: !options.verbose });
        }
        else if (envExampleLines[i].includes('PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        }
        else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }
    console.log("Tx Manager boilerplate created successfully! 🔄");
    console.log("Starting development server...");
    devMode && shell.cd("../"); // for Local Development
    shell.exec(`pnpm start`, { silent: false });
}
function makeCommandBoilerplates(program) {
    const comm = new Command("boilerplates");
    comm.action(() => {
        comm.help();
    });
    comm
        .command("create-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--apple-client-id <apple_client_id>", "Apple client ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createEmbeddedWalletReact(program, options);
    });
    comm
        .command("create-tx-manager")
        .description("Create a server that has the ability to mint collectibles based on parameters")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("-pak, --project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createTxManager(program, options);
    });
    return comm;
}

console.log(figlet.textSync("Sequence"));
console.log("");
const program = new Command();
program.version("0.1.2", "-v, --version", "Display the current version").action(
  () => {
    program.help();
  }
);
program.addCommand(makeCommandMarketplace(program));
program.addCommand(makeCommandWallet(program));
program.addCommand(makeCommandBoilerplates(program));
program.parse(process.argv);
