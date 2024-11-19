#!/usr/bin/env node
import { Command } from 'commander';
import { select, input, password, number as number$1 } from '@inquirer/prompts';
import { Wallet, ethers } from 'ethers';
import { findSupportedNetwork } from '@0xsequence/network';
import shell from 'shelljs';
import chalk from 'chalk';
import { createWalletClient, http, getContract } from 'viem';
import { Session } from '@0xsequence/auth';
import { extractProjectIdFromAccessKey } from '@0xsequence/utils';
import figlet from 'figlet';

function isValidPrivateKey(privateKey) {
    try {
        new Wallet(privateKey);
        return true;
    }
    catch (error) {
        return false;
    }
}
const cliConsole = {
    error: (message) => {
        console.log(chalk.red(message));
    },
    errorFieldInBlank: () => {
        cliConsole.error("You cannot leave this field in blank. Please try again.");
    },
    warning: (message) => {
        console.log(chalk.yellow(`⚠️  ${message}`));
    },
    info: (message) => {
        console.log(chalk.blue(`ℹ️ ${message}`));
    },
    success: (message) => {
        console.log(chalk.green(`✅  ${message}`));
    },
    loading: (message) => {
        console.log(chalk.gray(`⏳ ${message}...`));
    },
    done: (message) => {
        console.log(chalk.greenBright(`🎉 ${message}`));
    },
    lineBreak: () => {
        console.log('\n');
    },
    sectionTitle: (title) => {
        console.log(chalk.magenta.bold(`\n=== ${title.toUpperCase()} ===\n`));
    },
};
async function promptUserKeyCustomizationDecision() {
    return await select({
        message: "Would you like to use the default configuration keys for testing?",
        choices: [
            {
                name: "Use test keys",
                value: false,
            },
            {
                name: "I'll provide my own keys",
                value: true,
            },
        ],
    });
}
async function promptForKeyWithLogs(prompt, logs) {
    if (!prompt.key) {
        logs.forEach((log) => console.log(log));
        const inputKey = await input({
            message: prompt.inputMessage,
        });
        console.log("");
        return inputKey || prompt.key;
    }
    return prompt.key;
}
async function executePromptWithRetry(promptFn, params, logs, options = { allowEmptyInput: true }) {
    const promptResult = await promptFn(params, logs);
    if (!promptResult && !options.allowEmptyInput) {
        cliConsole.errorFieldInBlank();
        return await executePromptWithRetry(promptFn, params, logs, options);
    }
    return promptResult;
}
async function promptForProjectAccessKeyWithLogs(projectAccessKey, options = { allowEmptyInput: true }) {
    const logsArray = [
        "Please provide the Project Access Key for your project.",
        "Your access key can be found at https://sequence.build under the project settings."
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default test access key, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: projectAccessKey, inputMessage: "Project Access Key:" }, logsArray, options);
}
async function promptForWaaSConfigKeyWithLogs(waasConfigKey, options = { allowEmptyInput: true }) {
    const logsArray = [
        "Please provide the WaaS Config Key for your project.",
        "Your config key can be found at https://sequence.build under the embedded wallet settings.",
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default test config key, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: waasConfigKey, inputMessage: "WaaS Config Key:" }, logsArray, options);
}
async function promptForGoogleClientIdWithLogs(googleClientId, options = { allowEmptyInput: true }) {
    const logsArray = [
        "Please provide the Google Client ID for your project.",
        "Your client ID can be found at https://console.cloud.google.com/apis/credentials.",
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default test client ID, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: googleClientId, inputMessage: "Google Client ID:" }, logsArray, options);
}
async function promptForAppleClientIdWithLogs(appleClientId, options = { allowEmptyInput: true }) {
    const logsArray = [
        "Please provide the Apple Client ID for your project.",
        "Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId",
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default test client ID, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: appleClientId, inputMessage: "Apple Client ID:" }, logsArray, options);
}
async function promptForWalletConnectIdWithLogs(walletConnectId, options = { allowEmptyInput: true }) {
    const logsArray = [
        "Please provide the Wallet Connect ID for your project.",
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default test client ID, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: walletConnectId, inputMessage: "Wallet Connect ID:" }, logsArray, options);
}
async function promptForJwtAccessKeyWithLogs(jwtAccessKey, options = { allowEmptyInput: true }) {
    const logsArray = [
        "To get your jwt access key follow the first step in https://docs.sequence.xyz/guides/metadata-guide/",
    ];
    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default jwt access key, press enter.");
    }
    return await executePromptWithRetry(promptForKeyWithLogs, { key: jwtAccessKey, inputMessage: "JWT Access Key:" }, logsArray, options);
}
async function promptForStytchWithLogs(stytchPublicToken) {
    return await promptForKeyWithLogs({ key: stytchPublicToken, inputMessage: "Stytch Public token:" }, [
        "Please provide the Stytch Public token for your project found in your dashboard.",
        "Your Public token can be found at https://stytch.com/dashboard in the top header.",
        "To skip and use the default test Public token, press enter.",
    ]);
}
function writeToEnvFile(envKeys, options) {
    Object.entries(envKeys).forEach(([key, value]) => {
        if (value && value !== "") {
            shell.exec(`echo ${key}=${value} >> ${options.pathToWrite ? options.pathToWrite : ".env"}`, { silent: !options.verbose });
        }
    });
}
function writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options) {
    const missingKeys = Object.entries(envKeys)
        .filter(([_, value]) => value === undefined || value === "")
        .map(([key, _]) => key);
    envExampleLines.forEach((line) => {
        if (missingKeys.some((key) => line.includes(key))) {
            shell.exec(`echo ${line} >> ${options.pathToWrite ? options.pathToWrite : ".env"}`, { silent: !options.verbose });
        }
    });
}
function checkIfDirectoryExists(path) {
    return shell.test('-d', path);
}

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

const SequenceMarketplace_V1_ABI = [
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

const ERC721_ABI = [
    {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "DEFAULT_ADMIN_ROLE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "approve",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "batchBurn",
        "inputs": [
            {
                "name": "tokenIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "burn",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "contractURI",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "explicitOwnershipOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct IERC721A.TokenOwnership",
                "components": [
                    {
                        "name": "addr",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "startTimestamp",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "burned",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "extraData",
                        "type": "uint24",
                        "internalType": "uint24"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "explicitOwnershipsOf",
        "inputs": [
            {
                "name": "tokenIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "internalType": "struct IERC721A.TokenOwnership[]",
                "components": [
                    {
                        "name": "addr",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "startTimestamp",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "burned",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "extraData",
                        "type": "uint24",
                        "internalType": "uint24"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getApproved",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRoleAdmin",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRoleMember",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "index",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRoleMemberCount",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "grantRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "hasRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenName",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "tokenSymbol",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "tokenBaseURI",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "tokenContractURI",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "royaltyReceiver",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "royaltyFeeNumerator",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "isApprovedForAll",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "operator",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "mint",
        "inputs": [
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "ownerOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "revokeRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "royaltyInfo",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "salePrice",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "safeTransferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "safeTransferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "setApprovalForAll",
        "inputs": [
            {
                "name": "operator",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setBaseMetadataURI",
        "inputs": [
            {
                "name": "tokenBaseURI",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setContractURI",
        "inputs": [
            {
                "name": "tokenContractURI",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setDefaultRoyalty",
        "inputs": [
            {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "feeNumerator",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setNameAndSymbol",
        "inputs": [
            {
                "name": "tokenName",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "tokenSymbol",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setTokenRoyalty",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "feeNumerator",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "supportsInterface",
        "inputs": [
            {
                "name": "interfaceId",
                "type": "bytes4",
                "internalType": "bytes4"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokenURI",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokensOfOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "tokensOfOwnerIn",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "start",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "stop",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "transferFrom",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "event",
        "name": "Approval",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ApprovalForAll",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "operator",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "approved",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ConsecutiveTransfer",
        "inputs": [
            {
                "name": "fromTokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "toTokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleAdminChanged",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "previousAdminRole",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "newAdminRole",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleGranted",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "sender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleRevoked",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "sender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Transfer",
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "ApprovalCallerNotOwnerNorApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ApprovalQueryForNonexistentToken",
        "inputs": []
    },
    {
        "type": "error",
        "name": "BalanceQueryForZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidQueryRange",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintERC2309QuantityExceedsLimit",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintToZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MintZeroQuantity",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnerQueryForNonexistentToken",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnershipNotInitializedForExtraData",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferCallerNotOwnerNorApproved",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferFromIncorrectOwner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferToNonERC721ReceiverImplementer",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferToZeroAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "URIQueryForNonexistentToken",
        "inputs": []
    }
];

function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`positive integer expected, not ${n}`);
}
// copied from utils
function isBytes$1(a) {
    return (a instanceof Uint8Array ||
        (a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array'));
}
function bytes(b, ...lengths) {
    if (!isBytes$1(b))
        throw new Error('Uint8Array expected');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Uint8Array expected of length ${lengths}, not of length=${b.length}`);
}
function hash(h) {
    if (typeof h !== 'function' || typeof h.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(h.outputLen);
    number(h.blockLen);
}
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}

const crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// Cast array to view
const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
// The byte swap operation for uint32
const byteSwap = (word) => ((word << 24) & 0xff000000) |
    ((word << 8) & 0xff0000) |
    ((word >>> 8) & 0xff00) |
    ((word >>> 24) & 0xff);
// In place byte swap for Uint32Array
function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = byteSwap(arr[i]);
    }
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes$1(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes$1(data) {
    if (typeof data === 'string')
        data = utf8ToBytes$1(data);
    bytes(data);
    return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes$2(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
        const a = arrays[i];
        bytes(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes$1(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === 'function') {
        return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    // Legacy Node.js compatibility
    if (crypto && typeof crypto.randomBytes === 'function') {
        return crypto.randomBytes(bytesLength);
    }
    throw new Error('crypto.getRandomValues must be defined');
}

// HMAC (RFC 2104)
class HMAC extends Hash {
    constructor(hash$1, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        hash(hash$1);
        const key = toBytes$1(_key);
        this.iHash = hash$1.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash$1.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash$1.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        exists(this);
        bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 * @example
 * import { hmac } from '@noble/hashes/hmac';
 * import { sha256 } from '@noble/hashes/sha2';
 * const mac1 = hmac(sha256, 'key', 'message');
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

/**
 * Polyfill for Safari 14
 */
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
/**
 * Choice: a ? b : c
 */
const Chi = (a, b, c) => (a & b) ^ (~a & c);
/**
 * Majority function, true if any two inputs is true
 */
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 */
class HashMD extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
    }
    update(data) {
        exists(this);
        const { view, buffer, blockLen } = this;
        data = toBytes$1(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        exists(this);
        output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in
        // current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}

// SHA2-256 need to try 2^128 hashes to execute birthday attack.
// BTC network is doing 2^67 hashes/sec as per early 2023.
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = /* @__PURE__ */ new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state:
// first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
// prettier-ignore
const SHA256_IV = /* @__PURE__ */ new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends HashMD {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = SHA256_IV[0] | 0;
        this.B = SHA256_IV[1] | 0;
        this.C = SHA256_IV[2] | 0;
        this.D = SHA256_IV[3] | 0;
        this.E = SHA256_IV[4] | 0;
        this.F = SHA256_IV[5] | 0;
        this.G = SHA256_IV[6] | 0;
        this.H = SHA256_IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
const sha256$1 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// 100 lines of code in the file are duplicated from noble-hashes (utils).
// This is OK: `abstract` directory does not use noble-hashes.
// User may opt-in into using different hashing library. This way, noble-hashes
// won't be included into their bundle.
const _0n$4 = /* @__PURE__ */ BigInt(0);
const _1n$5 = /* @__PURE__ */ BigInt(1);
const _2n$3 = /* @__PURE__ */ BigInt(2);
function isBytes(a) {
    return (a instanceof Uint8Array ||
        (a != null && typeof a === 'object' && a.constructor.name === 'Uint8Array'));
}
function abytes(item) {
    if (!isBytes(item))
        throw new Error('Uint8Array expected');
}
function abool(title, value) {
    if (typeof value !== 'boolean')
        throw new Error(`${title} must be valid boolean, got "${value}".`);
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes$1 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex$1(bytes) {
    abytes(bytes);
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes$1[bytes[i]];
    }
    return hex;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber$1(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    // Big Endian
    return BigInt(hex === '' ? '0' : `0x${hex}`);
}
// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
function asciiToBase16(char) {
    if (char >= asciis._0 && char <= asciis._9)
        return char - asciis._0;
    if (char >= asciis._A && char <= asciis._F)
        return char - (asciis._A - 10);
    if (char >= asciis._a && char <= asciis._f)
        return char - (asciis._a - 10);
    return;
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes$1(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
        throw new Error('padded hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
        const n1 = asciiToBase16(hex.charCodeAt(hi));
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2;
    }
    return array;
}
// BE: Big Endian, LE: Little Endian
function bytesToNumberBE(bytes) {
    return hexToNumber$1(bytesToHex$1(bytes));
}
function bytesToNumberLE(bytes) {
    abytes(bytes);
    return hexToNumber$1(bytesToHex$1(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
    return hexToBytes$1(n.toString(16).padStart(len * 2, '0'));
}
function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
}
// Unpadded, rarely used
function numberToVarBytesBE(n) {
    return hexToBytes$1(numberToHexUnpadded(n));
}
/**
 * Takes hex string or Uint8Array, converts to Uint8Array.
 * Validates output length.
 * Will throw error for other types.
 * @param title descriptive title for an error e.g. 'private key'
 * @param hex hex string or Uint8Array
 * @param expectedLength optional, will compare to result array's length
 * @returns
 */
function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === 'string') {
        try {
            res = hexToBytes$1(hex);
        }
        catch (e) {
            throw new Error(`${title} must be valid hex string, got "${hex}". Cause: ${e}`);
        }
    }
    else if (isBytes(hex)) {
        // Uint8Array.from() instead of hash.slice() because node.js Buffer
        // is instance of Uint8Array, and its slice() creates **mutable** copy
        res = Uint8Array.from(hex);
    }
    else {
        throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === 'number' && len !== expectedLength)
        throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes$1(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
        const a = arrays[i];
        abytes(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
// Compares 2 u8a-s in kinda constant time
function equalBytes(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a[i] ^ b[i];
    return diff === 0;
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
// Is positive bigint
const isPosBig = (n) => typeof n === 'bigint' && _0n$4 <= n;
function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
 * Asserts min <= n < max. NOTE: It's < max and not <= max.
 * @example
 * aInRange('x', x, 1n, 256n); // would assume x is in (1n..255n)
 */
function aInRange(title, n, min, max) {
    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
    // consider P=256n, min=0n, max=P
    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
    // - our way is the cleanest:               `inRange('x', x, 0n, P)
    if (!inRange(n, min, max))
        throw new Error(`expected valid ${title}: ${min} <= n < ${max}, got ${typeof n} ${n}`);
}
// Bit operations
/**
 * Calculates amount of bits in a bigint.
 * Same as `n.toString(2).length`
 */
function bitLen(n) {
    let len;
    for (len = 0; n > _0n$4; n >>= _1n$5, len += 1)
        ;
    return len;
}
/**
 * Gets single bit at position.
 * NOTE: first bit position is 0 (same as arrays)
 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
 */
function bitGet(n, pos) {
    return (n >> BigInt(pos)) & _1n$5;
}
/**
 * Sets single bit at position.
 */
function bitSet(n, pos, value) {
    return n | ((value ? _1n$5 : _0n$4) << BigInt(pos));
}
/**
 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
 */
const bitMask = (n) => (_2n$3 << BigInt(n - 1)) - _1n$5;
// DRBG
const u8n = (data) => new Uint8Array(data); // creates Uint8Array
const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== 'number' || hashLen < 2)
        throw new Error('hashLen must be a number');
    if (typeof qByteLen !== 'number' || qByteLen < 2)
        throw new Error('qByteLen must be a number');
    if (typeof hmacFn !== 'function')
        throw new Error('hmacFn must be a function');
    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
    let i = 0; // Iterations counter, will throw when over 1000
    const reset = () => {
        v.fill(1);
        k.fill(0);
        i = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
    const reseed = (seed = u8n()) => {
        // HMAC-DRBG reseed() function. Steps D-G
        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
        v = h(); // v = hmac(k || v)
        if (seed.length === 0)
            return;
        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
        v = h(); // v = hmac(k || v)
    };
    const gen = () => {
        // HMAC-DRBG generate() function
        if (i++ >= 1000)
            throw new Error('drbg: tried 1000 values');
        let len = 0;
        const out = [];
        while (len < qByteLen) {
            v = h();
            const sl = v.slice();
            out.push(sl);
            len += v.length;
        }
        return concatBytes$1(...out);
    };
    const genUntil = (seed, pred) => {
        reset();
        reseed(seed); // Steps D-G
        let res = undefined; // Step H: grind until k is in [1..n-1]
        while (!(res = pred(gen())))
            reseed();
        reset();
        return res;
    };
    return genUntil;
}
// Validating curves and fields
const validatorFns = {
    bigint: (val) => typeof val === 'bigint',
    function: (val) => typeof val === 'function',
    boolean: (val) => typeof val === 'boolean',
    string: (val) => typeof val === 'string',
    stringOrUint8Array: (val) => typeof val === 'string' || isBytes(val),
    isSafeInteger: (val) => Number.isSafeInteger(val),
    array: (val) => Array.isArray(val),
    field: (val, object) => object.Fp.isValid(val),
    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
};
// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
        const checkVal = validatorFns[type];
        if (typeof checkVal !== 'function')
            throw new Error(`Invalid validator "${type}", expected function`);
        const val = object[fieldName];
        if (isOptional && val === undefined)
            return;
        if (!checkVal(val, object)) {
            throw new Error(`Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`);
        }
    };
    for (const [fieldName, type] of Object.entries(validators))
        checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
        checkField(fieldName, type, true);
    return object;
}
// validate type tests
// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
// // Should fail type-check
// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });
/**
 * throws not implemented error
 */
const notImplemented = () => {
    throw new Error('not implemented');
};
/**
 * Memoizes (caches) computation result.
 * Uses WeakMap: the value is going auto-cleaned by GC after last reference is removed.
 */
function memoized(fn) {
    const map = new WeakMap();
    return (arg, ...args) => {
        const val = map.get(arg);
        if (val !== undefined)
            return val;
        const computed = fn(arg, ...args);
        map.set(arg, computed);
        return computed;
    };
}

const ut = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    aInRange,
    abool,
    abytes,
    bitGet,
    bitLen,
    bitMask,
    bitSet,
    bytesToHex: bytesToHex$1,
    bytesToNumberBE,
    bytesToNumberLE,
    concatBytes: concatBytes$1,
    createHmacDrbg,
    ensureBytes,
    equalBytes,
    hexToBytes: hexToBytes$1,
    hexToNumber: hexToNumber$1,
    inRange,
    isBytes,
    memoized,
    notImplemented,
    numberToBytesBE,
    numberToBytesLE,
    numberToHexUnpadded,
    numberToVarBytesBE,
    utf8ToBytes,
    validateObject
}, Symbol.toStringTag, { value: 'Module' }));

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Utilities for modular arithmetics and finite fields
// prettier-ignore
const _0n$3 = BigInt(0), _1n$4 = BigInt(1), _2n$2 = BigInt(2), _3n$1 = BigInt(3);
// prettier-ignore
const _4n = BigInt(4), _5n = BigInt(5), _8n = BigInt(8);
// prettier-ignore
BigInt(9); BigInt(16);
// Calculates a modulo b
function mod(a, b) {
    const result = a % b;
    return result >= _0n$3 ? result : b + result;
}
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
// TODO: use field version && remove
function pow(num, power, modulo) {
    if (modulo <= _0n$3 || power < _0n$3)
        throw new Error('Expected power/modulo > 0');
    if (modulo === _1n$4)
        return _0n$3;
    let res = _1n$4;
    while (power > _0n$3) {
        if (power & _1n$4)
            res = (res * num) % modulo;
        num = (num * num) % modulo;
        power >>= _1n$4;
    }
    return res;
}
// Does x ^ (2 ^ power) mod p. pow2(30, 4) == 30 ^ (2 ^ 4)
function pow2(x, power, modulo) {
    let res = x;
    while (power-- > _0n$3) {
        res *= res;
        res %= modulo;
    }
    return res;
}
// Inverses number over modulo
function invert(number, modulo) {
    if (number === _0n$3 || modulo <= _0n$3) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    // Euclidean GCD https://brilliant.org/wiki/extended-euclidean-algorithm/
    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
    let a = mod(number, modulo);
    let b = modulo;
    // prettier-ignore
    let x = _0n$3, u = _1n$4;
    while (a !== _0n$3) {
        // JIT applies optimization if those two lines follow each other
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        // prettier-ignore
        b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n$4)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
/**
 * Tonelli-Shanks square root search algorithm.
 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
 * Will start an infinite loop if field order P is not prime.
 * @param P field order
 * @returns function that takes field Fp (created from P) and number n
 */
function tonelliShanks(P) {
    // Legendre constant: used to calculate Legendre symbol (a | p),
    // which denotes the value of a^((p-1)/2) (mod p).
    // (a | p) ≡ 1    if a is a square (mod p)
    // (a | p) ≡ -1   if a is not a square (mod p)
    // (a | p) ≡ 0    if a ≡ 0 (mod p)
    const legendreC = (P - _1n$4) / _2n$2;
    let Q, S, Z;
    // Step 1: By factoring out powers of 2 from p - 1,
    // find q and s such that p - 1 = q*(2^s) with q odd
    for (Q = P - _1n$4, S = 0; Q % _2n$2 === _0n$3; Q /= _2n$2, S++)
        ;
    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
    for (Z = _2n$2; Z < P && pow(Z, legendreC, P) !== P - _1n$4; Z++)
        ;
    // Fast-path
    if (S === 1) {
        const p1div4 = (P + _1n$4) / _4n;
        return function tonelliFast(Fp, n) {
            const root = Fp.pow(n, p1div4);
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Slow-path
    const Q1div2 = (Q + _1n$4) / _2n$2;
    return function tonelliSlow(Fp, n) {
        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
        if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
            throw new Error('Cannot find square root');
        let r = S;
        // TODO: will fail at Fp2/etc
        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
        let x = Fp.pow(n, Q1div2); // first guess at the square root
        let b = Fp.pow(n, Q); // first guess at the fudge factor
        while (!Fp.eql(b, Fp.ONE)) {
            if (Fp.eql(b, Fp.ZERO))
                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
            // Find m such b^(2^m)==1
            let m = 1;
            for (let t2 = Fp.sqr(b); m < r; m++) {
                if (Fp.eql(t2, Fp.ONE))
                    break;
                t2 = Fp.sqr(t2); // t2 *= t2
            }
            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
            const ge = Fp.pow(g, _1n$4 << BigInt(r - m - 1)); // ge = 2^(r-m-1)
            g = Fp.sqr(ge); // g = ge * ge
            x = Fp.mul(x, ge); // x *= ge
            b = Fp.mul(b, g); // b *= g
            r = m;
        }
        return x;
    };
}
function FpSqrt(P) {
    // NOTE: different algorithms can give different roots, it is up to user to decide which one they want.
    // For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
    // P ≡ 3 (mod 4)
    // √n = n^((P+1)/4)
    if (P % _4n === _3n$1) {
        // Not all roots possible!
        // const ORDER =
        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        // const NUM = 72057594037927816n;
        const p1div4 = (P + _1n$4) / _4n;
        return function sqrt3mod4(Fp, n) {
            const root = Fp.pow(n, p1div4);
            // Throw if root**2 != n
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
    if (P % _8n === _5n) {
        const c1 = (P - _5n) / _8n;
        return function sqrt5mod8(Fp, n) {
            const n2 = Fp.mul(n, _2n$2);
            const v = Fp.pow(n2, c1);
            const nv = Fp.mul(n, v);
            const i = Fp.mul(Fp.mul(nv, _2n$2), v);
            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Other cases: Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
// prettier-ignore
const FIELD_FIELDS = [
    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
    'eql', 'add', 'sub', 'mul', 'pow', 'div',
    'addN', 'subN', 'mulN', 'sqrN'
];
function validateField(field) {
    const initial = {
        ORDER: 'bigint',
        MASK: 'bigint',
        BYTES: 'isSafeInteger',
        BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = 'function';
        return map;
    }, initial);
    return validateObject(field, opts);
}
// Generic field functions
/**
 * Same as `pow` but for Fp: non-constant-time.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 */
function FpPow(f, num, power) {
    // Should have same speed as pow for bigints
    // TODO: benchmark!
    if (power < _0n$3)
        throw new Error('Expected power > 0');
    if (power === _0n$3)
        return f.ONE;
    if (power === _1n$4)
        return num;
    let p = f.ONE;
    let d = num;
    while (power > _0n$3) {
        if (power & _1n$4)
            p = f.mul(p, d);
        d = f.sqr(d);
        power >>= _1n$4;
    }
    return p;
}
/**
 * Efficiently invert an array of Field elements.
 * `inv(0)` will return `undefined` here: make sure to throw an error.
 */
function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    // Walk from first to last, multiply them by each other MOD p
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = acc;
        return f.mul(acc, num);
    }, f.ONE);
    // Invert last element
    const inverted = f.inv(lastMultiplied);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = f.mul(acc, tmp[i]);
        return f.mul(acc, num);
    }, inverted);
    return tmp;
}
// CURVE.n lengths
function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
}
/**
 * Initializes a finite field over prime. **Non-primes are not supported.**
 * Do not init in loop: slow. Very fragile: always run a benchmark on a change.
 * Major performance optimizations:
 * * a) denormalized operations like mulN instead of mul
 * * b) same object shape: never add or remove keys
 * * c) Object.freeze
 * NOTE: operations don't check 'isValid' for all elements for performance reasons,
 * it is caller responsibility to check this.
 * This is low-level code, please make sure you know what you doing.
 * @param ORDER prime positive bigint
 * @param bitLen how many bits the field consumes
 * @param isLE (def: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
function Field(ORDER, bitLen, isLE = false, redef = {}) {
    if (ORDER <= _0n$3)
        throw new Error(`Expected Field ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
    if (BYTES > 2048)
        throw new Error('Field lengths over 2048 bytes are not supported');
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
        ORDER,
        BITS,
        BYTES,
        MASK: bitMask(BITS),
        ZERO: _0n$3,
        ONE: _1n$4,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
            if (typeof num !== 'bigint')
                throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
            return _0n$3 <= num && num < ORDER; // 0 is valid element, but it's not invertible
        },
        is0: (num) => num === _0n$3,
        isOdd: (num) => (num & _1n$4) === _1n$4,
        neg: (num) => mod(-num, ORDER),
        eql: (lhs, rhs) => lhs === rhs,
        sqr: (num) => mod(num * num, ORDER),
        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num * num,
        addN: (lhs, rhs) => lhs + rhs,
        subN: (lhs, rhs) => lhs - rhs,
        mulN: (lhs, rhs) => lhs * rhs,
        inv: (num) => invert(num, ORDER),
        sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // TODO: do we really need constant cmov?
        // We don't have const-time bigints anyway, so probably will be not very useful
        cmov: (a, b, c) => (c ? b : a),
        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
        fromBytes: (bytes) => {
            if (bytes.length !== BYTES)
                throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes.length}`);
            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        },
    });
    return Object.freeze(f);
}
/**
 * Returns total number of bytes consumed by the field element.
 * For example, 32 bytes for usual 256-bit weierstrass curve.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of field
 */
function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== 'bigint')
        throw new Error('field order must be bigint');
    const bitLength = fieldOrder.toString(2).length;
    return Math.ceil(bitLength / 8);
}
/**
 * Returns minimal amount of bytes that can be safely reduced
 * by field order.
 * Should be 2^-128 for 128-bit curve such as P256.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of target hash
 */
function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
}
/**
 * "Constant-time" private key generation utility.
 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being negligible.
 * Needs at least 48 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
 * @param hash hash output from SHA3 or a similar function
 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
 * @param isLE interpret hash bytes as LE num
 * @returns valid private scalar
 */
function mapHashToField(key, fieldOrder, isLE = false) {
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = getMinHashLength(fieldOrder);
    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
    if (len < 16 || len < minLen || len > 1024)
        throw new Error(`expected ${minLen}-1024 bytes of input, got ${len}`);
    const num = isLE ? bytesToNumberBE(key) : bytesToNumberLE(key);
    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
    const reduced = mod(num, fieldOrder - _1n$4) + _1n$4;
    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Abelian group utilities
const _0n$2 = BigInt(0);
const _1n$3 = BigInt(1);
// Since points in different groups cannot be equal (different object constructor),
// we can have single place to store precomputes
const pointPrecomputes = new WeakMap();
const pointWindowSizes = new WeakMap(); // This allows use make points immutable (nothing changes inside)
// Elliptic curve multiplication of Point by scalar. Fragile.
// Scalars should always be less than curve order: this should be checked inside of a curve itself.
// Creates precomputation tables for fast multiplication:
// - private scalar is split by fixed size windows of W bits
// - every window point is collected from window's table & added to accumulator
// - since windows are different, same point inside tables won't be accessed more than once per calc
// - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
// - +1 window is neccessary for wNAF
// - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
// TODO: Research returning 2d JS array of windows, instead of a single window. This would allow
// windows to be in different memory locations
function wNAF(c, bits) {
    const constTimeNegate = (condition, item) => {
        const neg = item.negate();
        return condition ? neg : item;
    };
    const validateW = (W) => {
        if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
            throw new Error(`Wrong window size=${W}, should be [1..${bits}]`);
    };
    const opts = (W) => {
        validateW(W);
        const windows = Math.ceil(bits / W) + 1; // +1, because
        const windowSize = 2 ** (W - 1); // -1 because we skip zero
        return { windows, windowSize };
    };
    return {
        constTimeNegate,
        // non-const time multiplication ladder
        unsafeLadder(elm, n) {
            let p = c.ZERO;
            let d = elm;
            while (n > _0n$2) {
                if (n & _1n$3)
                    p = p.add(d);
                d = d.double();
                n >>= _1n$3;
            }
            return p;
        },
        /**
         * Creates a wNAF precomputation window. Used for caching.
         * Default window size is set by `utils.precompute()` and is equal to 8.
         * Number of precomputed points depends on the curve size:
         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
         * - 𝑊 is the window size
         * - 𝑛 is the bitlength of the curve order.
         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
         * @returns precomputed point tables flattened to a single array
         */
        precomputeWindow(elm, W) {
            const { windows, windowSize } = opts(W);
            const points = [];
            let p = elm;
            let base = p;
            for (let window = 0; window < windows; window++) {
                base = p;
                points.push(base);
                // =1, because we skip zero
                for (let i = 1; i < windowSize; i++) {
                    base = base.add(p);
                    points.push(base);
                }
                p = base.double();
            }
            return points;
        },
        /**
         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
         * @param W window size
         * @param precomputes precomputed tables
         * @param n scalar (we don't check here, but should be less than curve order)
         * @returns real and fake (for const-time) points
         */
        wNAF(W, precomputes, n) {
            // TODO: maybe check that scalar is less than group order? wNAF behavious is undefined otherwise
            // But need to carefully remove other checks before wNAF. ORDER == bits here
            const { windows, windowSize } = opts(W);
            let p = c.ZERO;
            let f = c.BASE;
            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                // Extract W bits.
                let wbits = Number(n & mask);
                // Shift number by W bits.
                n >>= shiftBy;
                // If the bits are bigger than max size, we'll split those.
                // +224 => 256 - 32
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += _1n$3;
                }
                // This code was first written with assumption that 'f' and 'p' will never be infinity point:
                // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
                // there is negate now: it is possible that negated element from low value
                // would be the same as high element, which will create carry into next window.
                // It's not obvious how this can fail, but still worth investigating later.
                // Check if we're onto Zero point.
                // Add random point inside current window to f.
                const offset1 = offset;
                const offset2 = offset + Math.abs(wbits) - 1; // -1 because we skip zero
                const cond1 = window % 2 !== 0;
                const cond2 = wbits < 0;
                if (wbits === 0) {
                    // The most important part for const-time getPublicKey
                    f = f.add(constTimeNegate(cond1, precomputes[offset1]));
                }
                else {
                    p = p.add(constTimeNegate(cond2, precomputes[offset2]));
                }
            }
            // JIT-compiler should not eliminate f here, since it will later be used in normalizeZ()
            // Even if the variable is still unused, there are some checks which will
            // throw an exception, so compiler needs to prove they won't happen, which is hard.
            // At this point there is a way to F be infinity-point even if p is not,
            // which makes it less const-time: around 1 bigint multiply.
            return { p, f };
        },
        wNAFCached(P, n, transform) {
            const W = pointWindowSizes.get(P) || 1;
            // Calculate precomputes on a first run, reuse them after
            let comp = pointPrecomputes.get(P);
            if (!comp) {
                comp = this.precomputeWindow(P, W);
                if (W !== 1)
                    pointPrecomputes.set(P, transform(comp));
            }
            return this.wNAF(W, comp, n);
        },
        // We calculate precomputes for elliptic curve point multiplication
        // using windowed method. This specifies window size and
        // stores precomputed values. Usually only base point would be precomputed.
        setWindowSize(P, W) {
            validateW(W);
            pointWindowSizes.set(P, W);
            pointPrecomputes.delete(P);
        },
    };
}
/**
 * Pippenger algorithm for multi-scalar multiplication (MSM).
 * MSM is basically (Pa + Qb + Rc + ...).
 * 30x faster vs naive addition on L=4096, 10x faster with precomputes.
 * For N=254bit, L=1, it does: 1024 ADD + 254 DBL. For L=5: 1536 ADD + 254 DBL.
 * Algorithmically constant-time (for same L), even when 1 point + scalar, or when scalar = 0.
 * @param c Curve Point constructor
 * @param field field over CURVE.N - important that it's not over CURVE.P
 * @param points array of L curve points
 * @param scalars array of L scalars (aka private keys / bigints)
 */
function pippenger(c, field, points, scalars) {
    // If we split scalars by some window (let's say 8 bits), every chunk will only
    // take 256 buckets even if there are 4096 scalars, also re-uses double.
    // TODO:
    // - https://eprint.iacr.org/2024/750.pdf
    // - https://tches.iacr.org/index.php/TCHES/article/view/10287
    // 0 is accepted in scalars
    if (!Array.isArray(points) || !Array.isArray(scalars) || scalars.length !== points.length)
        throw new Error('arrays of points and scalars must have equal length');
    scalars.forEach((s, i) => {
        if (!field.isValid(s))
            throw new Error(`wrong scalar at index ${i}`);
    });
    points.forEach((p, i) => {
        if (!(p instanceof c))
            throw new Error(`wrong point at index ${i}`);
    });
    const wbits = bitLen(BigInt(points.length));
    const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1; // in bits
    const MASK = (1 << windowSize) - 1;
    const buckets = new Array(MASK + 1).fill(c.ZERO); // +1 for zero array
    const lastBits = Math.floor((field.BITS - 1) / windowSize) * windowSize;
    let sum = c.ZERO;
    for (let i = lastBits; i >= 0; i -= windowSize) {
        buckets.fill(c.ZERO);
        for (let j = 0; j < scalars.length; j++) {
            const scalar = scalars[j];
            const wbits = Number((scalar >> BigInt(i)) & BigInt(MASK));
            buckets[wbits] = buckets[wbits].add(points[j]);
        }
        let resI = c.ZERO; // not using this will do small speed-up, but will lose ct
        // Skip first bucket, because it is zero
        for (let j = buckets.length - 1, sumI = c.ZERO; j > 0; j--) {
            sumI = sumI.add(buckets[j]);
            resI = resI.add(sumI);
        }
        sum = sum.add(resI);
        if (i !== 0)
            for (let j = 0; j < windowSize; j++)
                sum = sum.double();
    }
    return sum;
}
function validateBasic(curve) {
    validateField(curve.Fp);
    validateObject(curve, {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
    }, {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
    });
    // Set defaults
    return Object.freeze({
        ...nLength(curve.n, curve.nBitLength),
        ...curve,
        ...{ p: curve.Fp.ORDER },
    });
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Short Weierstrass curve. The formula is: y² = x³ + ax + b
function validateSigVerOpts(opts) {
    if (opts.lowS !== undefined)
        abool('lowS', opts.lowS);
    if (opts.prehash !== undefined)
        abool('prehash', opts.prehash);
}
function validatePointOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        a: 'field',
        b: 'field',
    }, {
        allowedPrivateKeyLengths: 'array',
        wrapPrivateKey: 'boolean',
        isTorsionFree: 'function',
        clearCofactor: 'function',
        allowInfinityPoint: 'boolean',
        fromBytes: 'function',
        toBytes: 'function',
    });
    const { endo, Fp, a } = opts;
    if (endo) {
        if (!Fp.eql(a, Fp.ZERO)) {
            throw new Error('Endomorphism can only be defined for Koblitz curves that have a=0');
        }
        if (typeof endo !== 'object' ||
            typeof endo.beta !== 'bigint' ||
            typeof endo.splitScalar !== 'function') {
            throw new Error('Expected endomorphism with beta: bigint and splitScalar: function');
        }
    }
    return Object.freeze({ ...opts });
}
const { bytesToNumberBE: b2n, hexToBytes: h2b } = ut;
/**
 * ASN.1 DER encoding utilities. ASN is very complex & fragile. Format:
 *
 *     [0x30 (SEQUENCE), bytelength, 0x02 (INTEGER), intLength, R, 0x02 (INTEGER), intLength, S]
 *
 * Docs: https://letsencrypt.org/docs/a-warm-welcome-to-asn1-and-der/, https://luca.ntop.org/Teaching/Appunti/asn1.html
 */
const DER = {
    // asn.1 DER encoding utils
    Err: class DERErr extends Error {
        constructor(m = '') {
            super(m);
        }
    },
    // Basic building block is TLV (Tag-Length-Value)
    _tlv: {
        encode: (tag, data) => {
            const { Err: E } = DER;
            if (tag < 0 || tag > 256)
                throw new E('tlv.encode: wrong tag');
            if (data.length & 1)
                throw new E('tlv.encode: unpadded data');
            const dataLen = data.length / 2;
            const len = numberToHexUnpadded(dataLen);
            if ((len.length / 2) & 128)
                throw new E('tlv.encode: long form length too big');
            // length of length with long form flag
            const lenLen = dataLen > 127 ? numberToHexUnpadded((len.length / 2) | 128) : '';
            return `${numberToHexUnpadded(tag)}${lenLen}${len}${data}`;
        },
        // v - value, l - left bytes (unparsed)
        decode(tag, data) {
            const { Err: E } = DER;
            let pos = 0;
            if (tag < 0 || tag > 256)
                throw new E('tlv.encode: wrong tag');
            if (data.length < 2 || data[pos++] !== tag)
                throw new E('tlv.decode: wrong tlv');
            const first = data[pos++];
            const isLong = !!(first & 128); // First bit of first length byte is flag for short/long form
            let length = 0;
            if (!isLong)
                length = first;
            else {
                // Long form: [longFlag(1bit), lengthLength(7bit), length (BE)]
                const lenLen = first & 127;
                if (!lenLen)
                    throw new E('tlv.decode(long): indefinite length not supported');
                if (lenLen > 4)
                    throw new E('tlv.decode(long): byte length is too big'); // this will overflow u32 in js
                const lengthBytes = data.subarray(pos, pos + lenLen);
                if (lengthBytes.length !== lenLen)
                    throw new E('tlv.decode: length bytes not complete');
                if (lengthBytes[0] === 0)
                    throw new E('tlv.decode(long): zero leftmost byte');
                for (const b of lengthBytes)
                    length = (length << 8) | b;
                pos += lenLen;
                if (length < 128)
                    throw new E('tlv.decode(long): not minimal encoding');
            }
            const v = data.subarray(pos, pos + length);
            if (v.length !== length)
                throw new E('tlv.decode: wrong value length');
            return { v, l: data.subarray(pos + length) };
        },
    },
    // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
    // since we always use positive integers here. It must always be empty:
    // - add zero byte if exists
    // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
    _int: {
        encode(num) {
            const { Err: E } = DER;
            if (num < _0n$1)
                throw new E('integer: negative integers are not allowed');
            let hex = numberToHexUnpadded(num);
            // Pad with zero byte if negative flag is present
            if (Number.parseInt(hex[0], 16) & 0b1000)
                hex = '00' + hex;
            if (hex.length & 1)
                throw new E('unexpected assertion');
            return hex;
        },
        decode(data) {
            const { Err: E } = DER;
            if (data[0] & 128)
                throw new E('Invalid signature integer: negative');
            if (data[0] === 0x00 && !(data[1] & 128))
                throw new E('Invalid signature integer: unnecessary leading zero');
            return b2n(data);
        },
    },
    toSig(hex) {
        // parse DER signature
        const { Err: E, _int: int, _tlv: tlv } = DER;
        const data = typeof hex === 'string' ? h2b(hex) : hex;
        abytes(data);
        const { v: seqBytes, l: seqLeftBytes } = tlv.decode(0x30, data);
        if (seqLeftBytes.length)
            throw new E('Invalid signature: left bytes after parsing');
        const { v: rBytes, l: rLeftBytes } = tlv.decode(0x02, seqBytes);
        const { v: sBytes, l: sLeftBytes } = tlv.decode(0x02, rLeftBytes);
        if (sLeftBytes.length)
            throw new E('Invalid signature: left bytes after parsing');
        return { r: int.decode(rBytes), s: int.decode(sBytes) };
    },
    hexFromSig(sig) {
        const { _tlv: tlv, _int: int } = DER;
        const seq = `${tlv.encode(0x02, int.encode(sig.r))}${tlv.encode(0x02, int.encode(sig.s))}`;
        return tlv.encode(0x30, seq);
    },
};
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n$1 = BigInt(0), _1n$2 = BigInt(1); BigInt(2); const _3n = BigInt(3); BigInt(4);
function weierstrassPoints(opts) {
    const CURVE = validatePointOpts(opts);
    const { Fp } = CURVE; // All curves has same field / group length as for now, but they can differ
    const Fn = Field(CURVE.n, CURVE.nBitLength);
    const toBytes = CURVE.toBytes ||
        ((_c, point, _isCompressed) => {
            const a = point.toAffine();
            return concatBytes$1(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
        });
    const fromBytes = CURVE.fromBytes ||
        ((bytes) => {
            // const head = bytes[0];
            const tail = bytes.subarray(1);
            // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
            const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
            const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
            return { x, y };
        });
    /**
     * y² = x³ + ax + b: Short weierstrass curve formula
     * @returns y²
     */
    function weierstrassEquation(x) {
        const { a, b } = CURVE;
        const x2 = Fp.sqr(x); // x * x
        const x3 = Fp.mul(x2, x); // x2 * x
        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x3 + a * x + b
    }
    // Validate whether the passed curve params are valid.
    // We check if curve equation works for generator point.
    // `assertValidity()` won't work: `isTorsionFree()` is not available at this point in bls12-381.
    // ProjectivePoint class has not been initialized yet.
    if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
        throw new Error('bad generator point: equation left != right');
    // Valid group elements reside in range 1..n-1
    function isWithinCurveOrder(num) {
        return inRange(num, _1n$2, CURVE.n);
    }
    // Validates if priv key is valid and converts it to bigint.
    // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
    function normPrivateKeyToScalar(key) {
        const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n: N } = CURVE;
        if (lengths && typeof key !== 'bigint') {
            if (isBytes(key))
                key = bytesToHex$1(key);
            // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
            if (typeof key !== 'string' || !lengths.includes(key.length))
                throw new Error('Invalid key');
            key = key.padStart(nByteLength * 2, '0');
        }
        let num;
        try {
            num =
                typeof key === 'bigint'
                    ? key
                    : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
        }
        catch (error) {
            throw new Error(`private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`);
        }
        if (wrapPrivateKey)
            num = mod(num, N); // disabled by default, enabled for BLS
        aInRange('private key', num, _1n$2, N); // num in range [1..N-1]
        return num;
    }
    function assertPrjPoint(other) {
        if (!(other instanceof Point))
            throw new Error('ProjectivePoint expected');
    }
    // Memoized toAffine / validity check. They are heavy. Points are immutable.
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    const toAffineMemo = memoized((p, iz) => {
        const { px: x, py: y, pz: z } = p;
        // Fast-path for normalized points
        if (Fp.eql(z, Fp.ONE))
            return { x, y };
        const is0 = p.is0();
        // If invZ was 0, we return zero point. However we still want to execute
        // all operations, so we replace invZ with a random number, 1.
        if (iz == null)
            iz = is0 ? Fp.ONE : Fp.inv(z);
        const ax = Fp.mul(x, iz);
        const ay = Fp.mul(y, iz);
        const zz = Fp.mul(z, iz);
        if (is0)
            return { x: Fp.ZERO, y: Fp.ZERO };
        if (!Fp.eql(zz, Fp.ONE))
            throw new Error('invZ was invalid');
        return { x: ax, y: ay };
    });
    // NOTE: on exception this will crash 'cached' and no value will be set.
    // Otherwise true will be return
    const assertValidMemo = memoized((p) => {
        if (p.is0()) {
            // (0, 1, 0) aka ZERO is invalid in most contexts.
            // In BLS, ZERO can be serialized, so we allow it.
            // (0, 0, 0) is wrong representation of ZERO and is always invalid.
            if (CURVE.allowInfinityPoint && !Fp.is0(p.py))
                return;
            throw new Error('bad point: ZERO');
        }
        // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
        const { x, y } = p.toAffine();
        // Check if x, y are valid field elements
        if (!Fp.isValid(x) || !Fp.isValid(y))
            throw new Error('bad point: x or y not FE');
        const left = Fp.sqr(y); // y²
        const right = weierstrassEquation(x); // x³ + ax + b
        if (!Fp.eql(left, right))
            throw new Error('bad point: equation left != right');
        if (!p.isTorsionFree())
            throw new Error('bad point: not in prime-order subgroup');
        return true;
    });
    /**
     * Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
     * Default Point works in 2d / affine coordinates: (x, y)
     * We're doing calculations in projective, because its operations don't require costly inversion.
     */
    class Point {
        constructor(px, py, pz) {
            this.px = px;
            this.py = py;
            this.pz = pz;
            if (px == null || !Fp.isValid(px))
                throw new Error('x required');
            if (py == null || !Fp.isValid(py))
                throw new Error('y required');
            if (pz == null || !Fp.isValid(pz))
                throw new Error('z required');
            Object.freeze(this);
        }
        // Does not validate if the point is on-curve.
        // Use fromHex instead, or call assertValidity() later.
        static fromAffine(p) {
            const { x, y } = p || {};
            if (!p || !Fp.isValid(x) || !Fp.isValid(y))
                throw new Error('invalid affine point');
            if (p instanceof Point)
                throw new Error('projective point not allowed');
            const is0 = (i) => Fp.eql(i, Fp.ZERO);
            // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
            if (is0(x) && is0(y))
                return Point.ZERO;
            return new Point(x, y, Fp.ONE);
        }
        get x() {
            return this.toAffine().x;
        }
        get y() {
            return this.toAffine().y;
        }
        /**
         * Takes a bunch of Projective Points but executes only one
         * inversion on all of them. Inversion is very slow operation,
         * so this improves performance massively.
         * Optimization: converts a list of projective points to a list of identical points with Z=1.
         */
        static normalizeZ(points) {
            const toInv = Fp.invertBatch(points.map((p) => p.pz));
            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
        }
        /**
         * Converts hash string or Uint8Array to Point.
         * @param hex short/long ECDSA hex
         */
        static fromHex(hex) {
            const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
            P.assertValidity();
            return P;
        }
        // Multiplies generator point by privateKey.
        static fromPrivateKey(privateKey) {
            return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
        }
        // Multiscalar Multiplication
        static msm(points, scalars) {
            return pippenger(Point, Fn, points, scalars);
        }
        // "Private method", don't use it directly
        _setWindowSize(windowSize) {
            wnaf.setWindowSize(this, windowSize);
        }
        // A point on curve is valid if it conforms to equation.
        assertValidity() {
            assertValidMemo(this);
        }
        hasEvenY() {
            const { y } = this.toAffine();
            if (Fp.isOdd)
                return !Fp.isOdd(y);
            throw new Error("Field doesn't support isOdd");
        }
        /**
         * Compare one point to another.
         */
        equals(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
            const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
            return U1 && U2;
        }
        /**
         * Flips point to one corresponding to (x, -y) in Affine coordinates.
         */
        negate() {
            return new Point(this.px, Fp.neg(this.py), this.pz);
        }
        // Renes-Costello-Batina exception-free doubling formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 3
        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
        double() {
            const { a, b } = CURVE;
            const b3 = Fp.mul(b, _3n);
            const { px: X1, py: Y1, pz: Z1 } = this;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            let t0 = Fp.mul(X1, X1); // step 1
            let t1 = Fp.mul(Y1, Y1);
            let t2 = Fp.mul(Z1, Z1);
            let t3 = Fp.mul(X1, Y1);
            t3 = Fp.add(t3, t3); // step 5
            Z3 = Fp.mul(X1, Z1);
            Z3 = Fp.add(Z3, Z3);
            X3 = Fp.mul(a, Z3);
            Y3 = Fp.mul(b3, t2);
            Y3 = Fp.add(X3, Y3); // step 10
            X3 = Fp.sub(t1, Y3);
            Y3 = Fp.add(t1, Y3);
            Y3 = Fp.mul(X3, Y3);
            X3 = Fp.mul(t3, X3);
            Z3 = Fp.mul(b3, Z3); // step 15
            t2 = Fp.mul(a, t2);
            t3 = Fp.sub(t0, t2);
            t3 = Fp.mul(a, t3);
            t3 = Fp.add(t3, Z3);
            Z3 = Fp.add(t0, t0); // step 20
            t0 = Fp.add(Z3, t0);
            t0 = Fp.add(t0, t2);
            t0 = Fp.mul(t0, t3);
            Y3 = Fp.add(Y3, t0);
            t2 = Fp.mul(Y1, Z1); // step 25
            t2 = Fp.add(t2, t2);
            t0 = Fp.mul(t2, t3);
            X3 = Fp.sub(X3, t0);
            Z3 = Fp.mul(t2, t1);
            Z3 = Fp.add(Z3, Z3); // step 30
            Z3 = Fp.add(Z3, Z3);
            return new Point(X3, Y3, Z3);
        }
        // Renes-Costello-Batina exception-free addition formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 1
        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
        add(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            const a = CURVE.a;
            const b3 = Fp.mul(CURVE.b, _3n);
            let t0 = Fp.mul(X1, X2); // step 1
            let t1 = Fp.mul(Y1, Y2);
            let t2 = Fp.mul(Z1, Z2);
            let t3 = Fp.add(X1, Y1);
            let t4 = Fp.add(X2, Y2); // step 5
            t3 = Fp.mul(t3, t4);
            t4 = Fp.add(t0, t1);
            t3 = Fp.sub(t3, t4);
            t4 = Fp.add(X1, Z1);
            let t5 = Fp.add(X2, Z2); // step 10
            t4 = Fp.mul(t4, t5);
            t5 = Fp.add(t0, t2);
            t4 = Fp.sub(t4, t5);
            t5 = Fp.add(Y1, Z1);
            X3 = Fp.add(Y2, Z2); // step 15
            t5 = Fp.mul(t5, X3);
            X3 = Fp.add(t1, t2);
            t5 = Fp.sub(t5, X3);
            Z3 = Fp.mul(a, t4);
            X3 = Fp.mul(b3, t2); // step 20
            Z3 = Fp.add(X3, Z3);
            X3 = Fp.sub(t1, Z3);
            Z3 = Fp.add(t1, Z3);
            Y3 = Fp.mul(X3, Z3);
            t1 = Fp.add(t0, t0); // step 25
            t1 = Fp.add(t1, t0);
            t2 = Fp.mul(a, t2);
            t4 = Fp.mul(b3, t4);
            t1 = Fp.add(t1, t2);
            t2 = Fp.sub(t0, t2); // step 30
            t2 = Fp.mul(a, t2);
            t4 = Fp.add(t4, t2);
            t0 = Fp.mul(t1, t4);
            Y3 = Fp.add(Y3, t0);
            t0 = Fp.mul(t5, t4); // step 35
            X3 = Fp.mul(t3, X3);
            X3 = Fp.sub(X3, t0);
            t0 = Fp.mul(t3, t1);
            Z3 = Fp.mul(t5, Z3);
            Z3 = Fp.add(Z3, t0); // step 40
            return new Point(X3, Y3, Z3);
        }
        subtract(other) {
            return this.add(other.negate());
        }
        is0() {
            return this.equals(Point.ZERO);
        }
        wNAF(n) {
            return wnaf.wNAFCached(this, n, Point.normalizeZ);
        }
        /**
         * Non-constant-time multiplication. Uses double-and-add algorithm.
         * It's faster, but should only be used when you don't care about
         * an exposed private key e.g. sig verification, which works over *public* keys.
         */
        multiplyUnsafe(sc) {
            aInRange('scalar', sc, _0n$1, CURVE.n);
            const I = Point.ZERO;
            if (sc === _0n$1)
                return I;
            if (sc === _1n$2)
                return this;
            const { endo } = CURVE;
            if (!endo)
                return wnaf.unsafeLadder(this, sc);
            // Apply endomorphism
            let { k1neg, k1, k2neg, k2 } = endo.splitScalar(sc);
            let k1p = I;
            let k2p = I;
            let d = this;
            while (k1 > _0n$1 || k2 > _0n$1) {
                if (k1 & _1n$2)
                    k1p = k1p.add(d);
                if (k2 & _1n$2)
                    k2p = k2p.add(d);
                d = d.double();
                k1 >>= _1n$2;
                k2 >>= _1n$2;
            }
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
            return k1p.add(k2p);
        }
        /**
         * Constant time multiplication.
         * Uses wNAF method. Windowed method may be 10% faster,
         * but takes 2x longer to generate and consumes 2x memory.
         * Uses precomputes when available.
         * Uses endomorphism for Koblitz curves.
         * @param scalar by which the point would be multiplied
         * @returns New point
         */
        multiply(scalar) {
            const { endo, n: N } = CURVE;
            aInRange('scalar', scalar, _1n$2, N);
            let point, fake; // Fake point is used to const-time mult
            if (endo) {
                const { k1neg, k1, k2neg, k2 } = endo.splitScalar(scalar);
                let { p: k1p, f: f1p } = this.wNAF(k1);
                let { p: k2p, f: f2p } = this.wNAF(k2);
                k1p = wnaf.constTimeNegate(k1neg, k1p);
                k2p = wnaf.constTimeNegate(k2neg, k2p);
                k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
                point = k1p.add(k2p);
                fake = f1p.add(f2p);
            }
            else {
                const { p, f } = this.wNAF(scalar);
                point = p;
                fake = f;
            }
            // Normalize `z` for both points, but return only real one
            return Point.normalizeZ([point, fake])[0];
        }
        /**
         * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
         * Not using Strauss-Shamir trick: precomputation tables are faster.
         * The trick could be useful if both P and Q are not G (not in our case).
         * @returns non-zero affine point
         */
        multiplyAndAddUnsafe(Q, a, b) {
            const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
            const mul = (P, a // Select faster multiply() method
            ) => (a === _0n$1 || a === _1n$2 || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a));
            const sum = mul(this, a).add(mul(Q, b));
            return sum.is0() ? undefined : sum;
        }
        // Converts Projective point to affine (x, y) coordinates.
        // Can accept precomputed Z^-1 - for example, from invertBatch.
        // (x, y, z) ∋ (x=x/z, y=y/z)
        toAffine(iz) {
            return toAffineMemo(this, iz);
        }
        isTorsionFree() {
            const { h: cofactor, isTorsionFree } = CURVE;
            if (cofactor === _1n$2)
                return true; // No subgroups, always torsion-free
            if (isTorsionFree)
                return isTorsionFree(Point, this);
            throw new Error('isTorsionFree() has not been declared for the elliptic curve');
        }
        clearCofactor() {
            const { h: cofactor, clearCofactor } = CURVE;
            if (cofactor === _1n$2)
                return this; // Fast-path
            if (clearCofactor)
                return clearCofactor(Point, this);
            return this.multiplyUnsafe(CURVE.h);
        }
        toRawBytes(isCompressed = true) {
            abool('isCompressed', isCompressed);
            this.assertValidity();
            return toBytes(Point, this, isCompressed);
        }
        toHex(isCompressed = true) {
            abool('isCompressed', isCompressed);
            return bytesToHex$1(this.toRawBytes(isCompressed));
        }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
    const _bits = CURVE.nBitLength;
    const wnaf = wNAF(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
    // Validate if generator point is on curve
    return {
        CURVE,
        ProjectivePoint: Point,
        normPrivateKeyToScalar,
        weierstrassEquation,
        isWithinCurveOrder,
    };
}
function validateOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        hash: 'hash',
        hmac: 'function',
        randomBytes: 'function',
    }, {
        bits2int: 'function',
        bits2int_modN: 'function',
        lowS: 'boolean',
    });
    return Object.freeze({ lowS: true, ...opts });
}
/**
 * Creates short weierstrass curve and ECDSA signature methods for it.
 * @example
 * import { Field } from '@noble/curves/abstract/modular';
 * // Before that, define BigInt-s: a, b, p, n, Gx, Gy
 * const curve = weierstrass({ a, b, Fp: Field(p), n, Gx, Gy, h: 1n })
 */
function weierstrass(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { Fp, n: CURVE_ORDER } = CURVE;
    const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
    const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
    function modN(a) {
        return mod(a, CURVE_ORDER);
    }
    function invN(a) {
        return invert(a, CURVE_ORDER);
    }
    const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder, } = weierstrassPoints({
        ...CURVE,
        toBytes(_c, point, isCompressed) {
            const a = point.toAffine();
            const x = Fp.toBytes(a.x);
            const cat = concatBytes$1;
            abool('isCompressed', isCompressed);
            if (isCompressed) {
                return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
            }
            else {
                return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
            }
        },
        fromBytes(bytes) {
            const len = bytes.length;
            const head = bytes[0];
            const tail = bytes.subarray(1);
            // this.assertValidity() is done inside of fromHex
            if (len === compressedLen && (head === 0x02 || head === 0x03)) {
                const x = bytesToNumberBE(tail);
                if (!inRange(x, _1n$2, Fp.ORDER))
                    throw new Error('Point is not on curve');
                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
                let y;
                try {
                    y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
                }
                catch (sqrtError) {
                    const suffix = sqrtError instanceof Error ? ': ' + sqrtError.message : '';
                    throw new Error('Point is not on curve' + suffix);
                }
                const isYOdd = (y & _1n$2) === _1n$2;
                // ECDSA
                const isHeadOdd = (head & 1) === 1;
                if (isHeadOdd !== isYOdd)
                    y = Fp.neg(y);
                return { x, y };
            }
            else if (len === uncompressedLen && head === 0x04) {
                const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
                const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
                return { x, y };
            }
            else {
                throw new Error(`Point of length ${len} was invalid. Expected ${compressedLen} compressed bytes or ${uncompressedLen} uncompressed bytes`);
            }
        },
    });
    const numToNByteStr = (num) => bytesToHex$1(numberToBytesBE(num, CURVE.nByteLength));
    function isBiggerThanHalfOrder(number) {
        const HALF = CURVE_ORDER >> _1n$2;
        return number > HALF;
    }
    function normalizeS(s) {
        return isBiggerThanHalfOrder(s) ? modN(-s) : s;
    }
    // slice bytes num
    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
    /**
     * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
     */
    class Signature {
        constructor(r, s, recovery) {
            this.r = r;
            this.s = s;
            this.recovery = recovery;
            this.assertValidity();
        }
        // pair (bytes of r, bytes of s)
        static fromCompact(hex) {
            const l = CURVE.nByteLength;
            hex = ensureBytes('compactSignature', hex, l * 2);
            return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
        }
        // DER encoded ECDSA signature
        // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
        static fromDER(hex) {
            const { r, s } = DER.toSig(ensureBytes('DER', hex));
            return new Signature(r, s);
        }
        assertValidity() {
            aInRange('r', this.r, _1n$2, CURVE_ORDER); // r in [1..N]
            aInRange('s', this.s, _1n$2, CURVE_ORDER); // s in [1..N]
        }
        addRecoveryBit(recovery) {
            return new Signature(this.r, this.s, recovery);
        }
        recoverPublicKey(msgHash) {
            const { r, s, recovery: rec } = this;
            const h = bits2int_modN(ensureBytes('msgHash', msgHash)); // Truncate hash
            if (rec == null || ![0, 1, 2, 3].includes(rec))
                throw new Error('recovery id invalid');
            const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
            if (radj >= Fp.ORDER)
                throw new Error('recovery id 2 or 3 invalid');
            const prefix = (rec & 1) === 0 ? '02' : '03';
            const R = Point.fromHex(prefix + numToNByteStr(radj));
            const ir = invN(radj); // r^-1
            const u1 = modN(-h * ir); // -hr^-1
            const u2 = modN(s * ir); // sr^-1
            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
            if (!Q)
                throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
            Q.assertValidity();
            return Q;
        }
        // Signatures should be low-s, to prevent malleability.
        hasHighS() {
            return isBiggerThanHalfOrder(this.s);
        }
        normalizeS() {
            return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
        }
        // DER-encoded
        toDERRawBytes() {
            return hexToBytes$1(this.toDERHex());
        }
        toDERHex() {
            return DER.hexFromSig({ r: this.r, s: this.s });
        }
        // padded bytes of r, then padded bytes of s
        toCompactRawBytes() {
            return hexToBytes$1(this.toCompactHex());
        }
        toCompactHex() {
            return numToNByteStr(this.r) + numToNByteStr(this.s);
        }
    }
    const utils = {
        isValidPrivateKey(privateKey) {
            try {
                normPrivateKeyToScalar(privateKey);
                return true;
            }
            catch (error) {
                return false;
            }
        },
        normPrivateKeyToScalar: normPrivateKeyToScalar,
        /**
         * Produces cryptographically secure private key from random of size
         * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
         */
        randomPrivateKey: () => {
            const length = getMinHashLength(CURVE.n);
            return mapHashToField(CURVE.randomBytes(length), CURVE.n);
        },
        /**
         * Creates precompute table for an arbitrary EC point. Makes point "cached".
         * Allows to massively speed-up `point.multiply(scalar)`.
         * @returns cached point
         * @example
         * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
         * fast.multiply(privKey); // much faster ECDH now
         */
        precompute(windowSize = 8, point = Point.BASE) {
            point._setWindowSize(windowSize);
            point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
            return point;
        },
    };
    /**
     * Computes public key for a private key. Checks for validity of the private key.
     * @param privateKey private key
     * @param isCompressed whether to return compact (default), or full key
     * @returns Public key, full when isCompressed=false; short when isCompressed=true
     */
    function getPublicKey(privateKey, isCompressed = true) {
        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
    }
    /**
     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
     */
    function isProbPub(item) {
        const arr = isBytes(item);
        const str = typeof item === 'string';
        const len = (arr || str) && item.length;
        if (arr)
            return len === compressedLen || len === uncompressedLen;
        if (str)
            return len === 2 * compressedLen || len === 2 * uncompressedLen;
        if (item instanceof Point)
            return true;
        return false;
    }
    /**
     * ECDH (Elliptic Curve Diffie Hellman).
     * Computes shared public key from private key and public key.
     * Checks: 1) private key validity 2) shared key is on-curve.
     * Does NOT hash the result.
     * @param privateA private key
     * @param publicB different public key
     * @param isCompressed whether to return compact (default), or full key
     * @returns shared public key
     */
    function getSharedSecret(privateA, publicB, isCompressed = true) {
        if (isProbPub(privateA))
            throw new Error('first arg must be private key');
        if (!isProbPub(publicB))
            throw new Error('second arg must be public key');
        const b = Point.fromHex(publicB); // check for being on-curve
        return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
    }
    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
    const bits2int = CURVE.bits2int ||
        function (bytes) {
            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
            // for some cases, since bytes.length * 8 is not actual bitLength.
            const num = bytesToNumberBE(bytes); // check for == u8 done here
            const delta = bytes.length * 8 - CURVE.nBitLength; // truncate to nBitLength leftmost bits
            return delta > 0 ? num >> BigInt(delta) : num;
        };
    const bits2int_modN = CURVE.bits2int_modN ||
        function (bytes) {
            return modN(bits2int(bytes)); // can't use bytesToNumberBE here
        };
    // NOTE: pads output with zero as per spec
    const ORDER_MASK = bitMask(CURVE.nBitLength);
    /**
     * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
     */
    function int2octets(num) {
        aInRange(`num < 2^${CURVE.nBitLength}`, num, _0n$1, ORDER_MASK);
        // works with order, can have different size than numToField!
        return numberToBytesBE(num, CURVE.nByteLength);
    }
    // Steps A, D of RFC6979 3.2
    // Creates RFC6979 seed; converts msg/privKey to numbers.
    // Used only in sign, not in verify.
    // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order, this will be wrong at least for P521.
    // Also it can be bigger for P224 + SHA256
    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
        if (['recovered', 'canonical'].some((k) => k in opts))
            throw new Error('sign() legacy options not supported');
        const { hash, randomBytes } = CURVE;
        let { lowS, prehash, extraEntropy: ent } = opts; // generates low-s sigs by default
        if (lowS == null)
            lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
        msgHash = ensureBytes('msgHash', msgHash);
        validateSigVerOpts(opts);
        if (prehash)
            msgHash = ensureBytes('prehashed msgHash', hash(msgHash));
        // We can't later call bits2octets, since nested bits2int is broken for curves
        // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
        const h1int = bits2int_modN(msgHash);
        const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
        const seedArgs = [int2octets(d), int2octets(h1int)];
        // extraEntropy. RFC6979 3.6: additional k' (optional).
        if (ent != null && ent !== false) {
            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
            const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
            seedArgs.push(ensureBytes('extraEntropy', e)); // check for being bytes
        }
        const seed = concatBytes$1(...seedArgs); // Step D of RFC6979 3.2
        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
        // Converts signature params into point w r/s, checks result for validity.
        function k2sig(kBytes) {
            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
            const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
            if (!isWithinCurveOrder(k))
                return; // Important: all mod() calls here must be done over N
            const ik = invN(k); // k^-1 mod n
            const q = Point.BASE.multiply(k).toAffine(); // q = Gk
            const r = modN(q.x); // r = q.x mod n
            if (r === _0n$1)
                return;
            // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
            // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
            const s = modN(ik * modN(m + r * d)); // Not using blinding here
            if (s === _0n$1)
                return;
            let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n$2); // recovery bit (2 or 3, when q.x > n)
            let normS = s;
            if (lowS && isBiggerThanHalfOrder(s)) {
                normS = normalizeS(s); // if lowS was passed, ensure s is always
                recovery ^= 1; // // in the bottom half of N
            }
            return new Signature(r, normS, recovery); // use normS, not s
        }
        return { seed, k2sig };
    }
    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
    /**
     * Signs message hash with a private key.
     * ```
     * sign(m, d, k) where
     *   (x, y) = G × k
     *   r = x mod n
     *   s = (m + dr)/k mod n
     * ```
     * @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
     * @param privKey private key
     * @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
     * @returns signature with recovery param
     */
    function sign(msgHash, privKey, opts = defaultSigOpts) {
        const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
        const C = CURVE;
        const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
        return drbg(seed, k2sig); // Steps B, C, D, E, F, G
    }
    // Enable precomputes. Slows down first publicKey computation by 20ms.
    Point.BASE._setWindowSize(8);
    // utils.precompute(8, ProjectivePoint.BASE)
    /**
     * Verifies a signature against message hash and public key.
     * Rejects lowS signatures by default: to override,
     * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
     *
     * ```
     * verify(r, s, h, P) where
     *   U1 = hs^-1 mod n
     *   U2 = rs^-1 mod n
     *   R = U1⋅G - U2⋅P
     *   mod(R.x, n) == r
     * ```
     */
    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
        const sg = signature;
        msgHash = ensureBytes('msgHash', msgHash);
        publicKey = ensureBytes('publicKey', publicKey);
        if ('strict' in opts)
            throw new Error('options.strict was renamed to lowS');
        validateSigVerOpts(opts);
        const { lowS, prehash } = opts;
        let _sig = undefined;
        let P;
        try {
            if (typeof sg === 'string' || isBytes(sg)) {
                // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
                // Since DER can also be 2*nByteLength bytes, we check for it first.
                try {
                    _sig = Signature.fromDER(sg);
                }
                catch (derError) {
                    if (!(derError instanceof DER.Err))
                        throw derError;
                    _sig = Signature.fromCompact(sg);
                }
            }
            else if (typeof sg === 'object' && typeof sg.r === 'bigint' && typeof sg.s === 'bigint') {
                const { r, s } = sg;
                _sig = new Signature(r, s);
            }
            else {
                throw new Error('PARSE');
            }
            P = Point.fromHex(publicKey);
        }
        catch (error) {
            if (error.message === 'PARSE')
                throw new Error(`signature must be Signature instance, Uint8Array or hex string`);
            return false;
        }
        if (lowS && _sig.hasHighS())
            return false;
        if (prehash)
            msgHash = CURVE.hash(msgHash);
        const { r, s } = _sig;
        const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
        const is = invN(s); // s^-1
        const u1 = modN(h * is); // u1 = hs^-1 mod n
        const u2 = modN(r * is); // u2 = rs^-1 mod n
        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
        if (!R)
            return false;
        const v = modN(R.x);
        return v === r;
    }
    return {
        CURVE,
        getPublicKey,
        getSharedSecret,
        sign,
        verify,
        ProjectivePoint: Point,
        Signature,
        utils,
    };
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// connects noble-curves to noble-hashes
function getHash(hash) {
    return {
        hash,
        hmac: (key, ...msgs) => hmac(hash, key, concatBytes$2(...msgs)),
        randomBytes,
    };
}
function createCurve(curveDef, defHash) {
    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
    return Object.freeze({ ...create(defHash), create });
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const _1n$1 = BigInt(1);
const _2n$1 = BigInt(2);
const divNearest = (a, b) => (a + b / _2n$1) / b;
/**
 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
 */
function sqrtMod(y) {
    const P = secp256k1P;
    // prettier-ignore
    const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    // prettier-ignore
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = (y * y * y) % P; // x^3, 11
    const b3 = (b2 * b2 * y) % P; // x^7
    const b6 = (pow2(b3, _3n, P) * b3) % P;
    const b9 = (pow2(b6, _3n, P) * b3) % P;
    const b11 = (pow2(b9, _2n$1, P) * b2) % P;
    const b22 = (pow2(b11, _11n, P) * b11) % P;
    const b44 = (pow2(b22, _22n, P) * b22) % P;
    const b88 = (pow2(b44, _44n, P) * b44) % P;
    const b176 = (pow2(b88, _88n, P) * b88) % P;
    const b220 = (pow2(b176, _44n, P) * b44) % P;
    const b223 = (pow2(b220, _3n, P) * b3) % P;
    const t1 = (pow2(b223, _23n, P) * b22) % P;
    const t2 = (pow2(t1, _6n, P) * b2) % P;
    const root = pow2(t2, _2n$1, P);
    if (!Fp.eql(Fp.sqr(root), y))
        throw new Error('Cannot find square root');
    return root;
}
const Fp = Field(secp256k1P, undefined, undefined, { sqrt: sqrtMod });
/**
 * secp256k1 short weierstrass curve and ECDSA signatures over it.
 */
const secp256k1 = createCurve({
    a: BigInt(0), // equation params: a, b
    b: BigInt(7), // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
    Fp, // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
    n: secp256k1N, // Curve order, total count of valid points in the field
    // Base point (x, y) aka generator point
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    h: BigInt(1), // Cofactor
    lowS: true, // Allow only low-S signatures by default in sign() and verify()
    /**
     * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
     * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
     * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
     * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
     */
    endo: {
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
        splitScalar: (k) => {
            const n = secp256k1N;
            const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
            const b1 = -_1n$1 * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
            const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
            const b2 = a1;
            const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
            const c1 = divNearest(b2 * k, n);
            const c2 = divNearest(-b1 * k, n);
            let k1 = mod(k - c1 * a1 - c2 * a2, n);
            let k2 = mod(-c1 * b1 - c2 * b2, n);
            const k1neg = k1 > POW_2_128;
            const k2neg = k2 > POW_2_128;
            if (k1neg)
                k1 = n - k1;
            if (k2neg)
                k2 = n - k2;
            if (k1 > POW_2_128 || k2 > POW_2_128) {
                throw new Error('splitScalar: Endomorphism failed, k=' + k);
            }
            return { k1neg, k1, k2neg, k2 };
        },
    },
}, sha256$1);
// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
BigInt(0);
secp256k1.ProjectivePoint;

const version = '2.21.44';

let errorConfig = {
    getDocsUrl: ({ docsBaseUrl, docsPath = '', docsSlug, }) => docsPath
        ? `${docsBaseUrl ?? 'https://viem.sh'}${docsPath}${docsSlug ? `#${docsSlug}` : ''}`
        : undefined,
    version: `viem@${version}`,
};
class BaseError extends Error {
    constructor(shortMessage, args = {}) {
        const details = (() => {
            if (args.cause instanceof BaseError)
                return args.cause.details;
            if (args.cause?.message)
                return args.cause.message;
            return args.details;
        })();
        const docsPath = (() => {
            if (args.cause instanceof BaseError)
                return args.cause.docsPath || args.docsPath;
            return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
            shortMessage || 'An error occurred.',
            '',
            ...(args.metaMessages ? [...args.metaMessages, ''] : []),
            ...(docsUrl ? [`Docs: ${docsUrl}`] : []),
            ...(details ? [`Details: ${details}`] : []),
            ...(errorConfig.version ? [`Version: ${errorConfig.version}`] : []),
        ].join('\n');
        super(message, args.cause ? { cause: args.cause } : undefined);
        Object.defineProperty(this, "details", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "docsPath", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "version", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'BaseError'
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
    }
    walk(fn) {
        return walk(this, fn);
    }
}
function walk(err, fn) {
    if (fn?.(err))
        return err;
    if (err &&
        typeof err === 'object' &&
        'cause' in err &&
        err.cause !== undefined)
        return walk(err.cause, fn);
    return fn ? null : err;
}

class IntegerOutOfRangeError extends BaseError {
    constructor({ max, min, signed, size, value, }) {
        super(`Number "${value}" is not in safe ${size ? `${size * 8}-bit ${signed ? 'signed' : 'unsigned'} ` : ''}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: 'IntegerOutOfRangeError' });
    }
}
class SizeOverflowError extends BaseError {
    constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: 'SizeOverflowError' });
    }
}

class SliceOffsetOutOfBoundsError extends BaseError {
    constructor({ offset, position, size, }) {
        super(`Slice ${position === 'start' ? 'starting' : 'ending'} at offset "${offset}" is out-of-bounds (size: ${size}).`, { name: 'SliceOffsetOutOfBoundsError' });
    }
}
class SizeExceedsPaddingSizeError extends BaseError {
    constructor({ size, targetSize, type, }) {
        super(`${type.charAt(0).toUpperCase()}${type
            .slice(1)
            .toLowerCase()} size (${size}) exceeds padding size (${targetSize}).`, { name: 'SizeExceedsPaddingSizeError' });
    }
}

function pad(hexOrBytes, { dir, size = 32 } = {}) {
    if (typeof hexOrBytes === 'string')
        return padHex(hexOrBytes, { dir, size });
    return padBytes(hexOrBytes, { dir, size });
}
function padHex(hex_, { dir, size = 32 } = {}) {
    if (size === null)
        return hex_;
    const hex = hex_.replace('0x', '');
    if (hex.length > size * 2)
        throw new SizeExceedsPaddingSizeError({
            size: Math.ceil(hex.length / 2),
            targetSize: size,
            type: 'hex',
        });
    return `0x${hex[dir === 'right' ? 'padEnd' : 'padStart'](size * 2, '0')}`;
}
function padBytes(bytes, { dir, size = 32 } = {}) {
    if (size === null)
        return bytes;
    if (bytes.length > size)
        throw new SizeExceedsPaddingSizeError({
            size: bytes.length,
            targetSize: size,
            type: 'bytes',
        });
    const paddedBytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        const padEnd = dir === 'right';
        paddedBytes[padEnd ? i : size - i - 1] =
            bytes[padEnd ? i : bytes.length - i - 1];
    }
    return paddedBytes;
}

function isHex(value, { strict = true } = {}) {
    if (!value)
        return false;
    if (typeof value !== 'string')
        return false;
    return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith('0x');
}

/**
 * @description Retrieves the size of the value (in bytes).
 *
 * @param value The value (hex or byte array) to retrieve the size of.
 * @returns The size of the value (in bytes).
 */
function size(value) {
    if (isHex(value, { strict: false }))
        return Math.ceil((value.length - 2) / 2);
    return value.length;
}

function trim(hexOrBytes, { dir = 'left' } = {}) {
    let data = typeof hexOrBytes === 'string' ? hexOrBytes.replace('0x', '') : hexOrBytes;
    let sliceLength = 0;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[dir === 'left' ? i : data.length - i - 1].toString() === '0')
            sliceLength++;
        else
            break;
    }
    data =
        dir === 'left'
            ? data.slice(sliceLength)
            : data.slice(0, data.length - sliceLength);
    if (typeof hexOrBytes === 'string') {
        if (data.length === 1 && dir === 'right')
            data = `${data}0`;
        return `0x${data.length % 2 === 1 ? `0${data}` : data}`;
    }
    return data;
}

const encoder$1 = /*#__PURE__*/ new TextEncoder();
/**
 * Encodes a UTF-8 string, hex value, bigint, number or boolean to a byte array.
 *
 * - Docs: https://viem.sh/docs/utilities/toBytes
 * - Example: https://viem.sh/docs/utilities/toBytes#usage
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Byte array value.
 *
 * @example
 * import { toBytes } from 'viem'
 * const data = toBytes('Hello world')
 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
 *
 * @example
 * import { toBytes } from 'viem'
 * const data = toBytes(420)
 * // Uint8Array([1, 164])
 *
 * @example
 * import { toBytes } from 'viem'
 * const data = toBytes(420, { size: 4 })
 * // Uint8Array([0, 0, 1, 164])
 */
function toBytes(value, opts = {}) {
    if (typeof value === 'number' || typeof value === 'bigint')
        return numberToBytes(value, opts);
    if (typeof value === 'boolean')
        return boolToBytes(value, opts);
    if (isHex(value))
        return hexToBytes(value, opts);
    return stringToBytes(value, opts);
}
/**
 * Encodes a boolean into a byte array.
 *
 * - Docs: https://viem.sh/docs/utilities/toBytes#booltobytes
 *
 * @param value Boolean value to encode.
 * @param opts Options.
 * @returns Byte array value.
 *
 * @example
 * import { boolToBytes } from 'viem'
 * const data = boolToBytes(true)
 * // Uint8Array([1])
 *
 * @example
 * import { boolToBytes } from 'viem'
 * const data = boolToBytes(true, { size: 32 })
 * // Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
 */
function boolToBytes(value, opts = {}) {
    const bytes = new Uint8Array(1);
    bytes[0] = Number(value);
    if (typeof opts.size === 'number') {
        assertSize(bytes, { size: opts.size });
        return pad(bytes, { size: opts.size });
    }
    return bytes;
}
// We use very optimized technique to convert hex string to byte array
const charCodeMap = {
    zero: 48,
    nine: 57,
    A: 65,
    F: 70,
    a: 97,
    f: 102,
};
function charCodeToBase16(char) {
    if (char >= charCodeMap.zero && char <= charCodeMap.nine)
        return char - charCodeMap.zero;
    if (char >= charCodeMap.A && char <= charCodeMap.F)
        return char - (charCodeMap.A - 10);
    if (char >= charCodeMap.a && char <= charCodeMap.f)
        return char - (charCodeMap.a - 10);
    return undefined;
}
/**
 * Encodes a hex string into a byte array.
 *
 * - Docs: https://viem.sh/docs/utilities/toBytes#hextobytes
 *
 * @param hex Hex string to encode.
 * @param opts Options.
 * @returns Byte array value.
 *
 * @example
 * import { hexToBytes } from 'viem'
 * const data = hexToBytes('0x48656c6c6f20776f726c6421')
 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
 *
 * @example
 * import { hexToBytes } from 'viem'
 * const data = hexToBytes('0x48656c6c6f20776f726c6421', { size: 32 })
 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
 */
function hexToBytes(hex_, opts = {}) {
    let hex = hex_;
    if (opts.size) {
        assertSize(hex, { size: opts.size });
        hex = pad(hex, { dir: 'right', size: opts.size });
    }
    let hexString = hex.slice(2);
    if (hexString.length % 2)
        hexString = `0${hexString}`;
    const length = hexString.length / 2;
    const bytes = new Uint8Array(length);
    for (let index = 0, j = 0; index < length; index++) {
        const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
        const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
        if (nibbleLeft === undefined || nibbleRight === undefined) {
            throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
        }
        bytes[index] = nibbleLeft * 16 + nibbleRight;
    }
    return bytes;
}
/**
 * Encodes a number into a byte array.
 *
 * - Docs: https://viem.sh/docs/utilities/toBytes#numbertobytes
 *
 * @param value Number to encode.
 * @param opts Options.
 * @returns Byte array value.
 *
 * @example
 * import { numberToBytes } from 'viem'
 * const data = numberToBytes(420)
 * // Uint8Array([1, 164])
 *
 * @example
 * import { numberToBytes } from 'viem'
 * const data = numberToBytes(420, { size: 4 })
 * // Uint8Array([0, 0, 1, 164])
 */
function numberToBytes(value, opts) {
    const hex = numberToHex(value, opts);
    return hexToBytes(hex);
}
/**
 * Encodes a UTF-8 string into a byte array.
 *
 * - Docs: https://viem.sh/docs/utilities/toBytes#stringtobytes
 *
 * @param value String to encode.
 * @param opts Options.
 * @returns Byte array value.
 *
 * @example
 * import { stringToBytes } from 'viem'
 * const data = stringToBytes('Hello world!')
 * // Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 33])
 *
 * @example
 * import { stringToBytes } from 'viem'
 * const data = stringToBytes('Hello world!', { size: 32 })
 * // Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
 */
function stringToBytes(value, opts = {}) {
    const bytes = encoder$1.encode(value);
    if (typeof opts.size === 'number') {
        assertSize(bytes, { size: opts.size });
        return pad(bytes, { dir: 'right', size: opts.size });
    }
    return bytes;
}

function assertSize(hexOrBytes, { size: size$1 }) {
    if (size(hexOrBytes) > size$1)
        throw new SizeOverflowError({
            givenSize: size(hexOrBytes),
            maxSize: size$1,
        });
}
/**
 * Decodes a hex value into a bigint.
 *
 * - Docs: https://viem.sh/docs/utilities/fromHex#hextobigint
 *
 * @param hex Hex value to decode.
 * @param opts Options.
 * @returns BigInt value.
 *
 * @example
 * import { hexToBigInt } from 'viem'
 * const data = hexToBigInt('0x1a4', { signed: true })
 * // 420n
 *
 * @example
 * import { hexToBigInt } from 'viem'
 * const data = hexToBigInt('0x00000000000000000000000000000000000000000000000000000000000001a4', { size: 32 })
 * // 420n
 */
function hexToBigInt(hex, opts = {}) {
    const { signed } = opts;
    if (opts.size)
        assertSize(hex, { size: opts.size });
    const value = BigInt(hex);
    if (!signed)
        return value;
    const size = (hex.length - 2) / 2;
    const max = (1n << (BigInt(size) * 8n - 1n)) - 1n;
    if (value <= max)
        return value;
    return value - BigInt(`0x${'f'.padStart(size * 2, 'f')}`) - 1n;
}
/**
 * Decodes a hex string into a number.
 *
 * - Docs: https://viem.sh/docs/utilities/fromHex#hextonumber
 *
 * @param hex Hex value to decode.
 * @param opts Options.
 * @returns Number value.
 *
 * @example
 * import { hexToNumber } from 'viem'
 * const data = hexToNumber('0x1a4')
 * // 420
 *
 * @example
 * import { hexToNumber } from 'viem'
 * const data = hexToBigInt('0x00000000000000000000000000000000000000000000000000000000000001a4', { size: 32 })
 * // 420
 */
function hexToNumber(hex, opts = {}) {
    return Number(hexToBigInt(hex, opts));
}

const hexes = /*#__PURE__*/ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, '0'));
/**
 * Encodes a string, number, bigint, or ByteArray into a hex string
 *
 * - Docs: https://viem.sh/docs/utilities/toHex
 * - Example: https://viem.sh/docs/utilities/toHex#usage
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Hex value.
 *
 * @example
 * import { toHex } from 'viem'
 * const data = toHex('Hello world')
 * // '0x48656c6c6f20776f726c6421'
 *
 * @example
 * import { toHex } from 'viem'
 * const data = toHex(420)
 * // '0x1a4'
 *
 * @example
 * import { toHex } from 'viem'
 * const data = toHex('Hello world', { size: 32 })
 * // '0x48656c6c6f20776f726c64210000000000000000000000000000000000000000'
 */
function toHex(value, opts = {}) {
    if (typeof value === 'number' || typeof value === 'bigint')
        return numberToHex(value, opts);
    if (typeof value === 'string') {
        return stringToHex(value, opts);
    }
    if (typeof value === 'boolean')
        return boolToHex(value, opts);
    return bytesToHex(value, opts);
}
/**
 * Encodes a boolean into a hex string
 *
 * - Docs: https://viem.sh/docs/utilities/toHex#booltohex
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Hex value.
 *
 * @example
 * import { boolToHex } from 'viem'
 * const data = boolToHex(true)
 * // '0x1'
 *
 * @example
 * import { boolToHex } from 'viem'
 * const data = boolToHex(false)
 * // '0x0'
 *
 * @example
 * import { boolToHex } from 'viem'
 * const data = boolToHex(true, { size: 32 })
 * // '0x0000000000000000000000000000000000000000000000000000000000000001'
 */
function boolToHex(value, opts = {}) {
    const hex = `0x${Number(value)}`;
    if (typeof opts.size === 'number') {
        assertSize(hex, { size: opts.size });
        return pad(hex, { size: opts.size });
    }
    return hex;
}
/**
 * Encodes a bytes array into a hex string
 *
 * - Docs: https://viem.sh/docs/utilities/toHex#bytestohex
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Hex value.
 *
 * @example
 * import { bytesToHex } from 'viem'
 * const data = bytesToHex(Uint8Array.from([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
 * // '0x48656c6c6f20576f726c6421'
 *
 * @example
 * import { bytesToHex } from 'viem'
 * const data = bytesToHex(Uint8Array.from([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]), { size: 32 })
 * // '0x48656c6c6f20576f726c64210000000000000000000000000000000000000000'
 */
function bytesToHex(value, opts = {}) {
    let string = '';
    for (let i = 0; i < value.length; i++) {
        string += hexes[value[i]];
    }
    const hex = `0x${string}`;
    if (typeof opts.size === 'number') {
        assertSize(hex, { size: opts.size });
        return pad(hex, { dir: 'right', size: opts.size });
    }
    return hex;
}
/**
 * Encodes a number or bigint into a hex string
 *
 * - Docs: https://viem.sh/docs/utilities/toHex#numbertohex
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Hex value.
 *
 * @example
 * import { numberToHex } from 'viem'
 * const data = numberToHex(420)
 * // '0x1a4'
 *
 * @example
 * import { numberToHex } from 'viem'
 * const data = numberToHex(420, { size: 32 })
 * // '0x00000000000000000000000000000000000000000000000000000000000001a4'
 */
function numberToHex(value_, opts = {}) {
    const { signed, size } = opts;
    const value = BigInt(value_);
    let maxValue;
    if (size) {
        if (signed)
            maxValue = (1n << (BigInt(size) * 8n - 1n)) - 1n;
        else
            maxValue = 2n ** (BigInt(size) * 8n) - 1n;
    }
    else if (typeof value_ === 'number') {
        maxValue = BigInt(Number.MAX_SAFE_INTEGER);
    }
    const minValue = typeof maxValue === 'bigint' && signed ? -maxValue - 1n : 0;
    if ((maxValue && value > maxValue) || value < minValue) {
        const suffix = typeof value_ === 'bigint' ? 'n' : '';
        throw new IntegerOutOfRangeError({
            max: maxValue ? `${maxValue}${suffix}` : undefined,
            min: `${minValue}${suffix}`,
            signed,
            size,
            value: `${value_}${suffix}`,
        });
    }
    const hex = `0x${(signed && value < 0 ? (1n << BigInt(size * 8)) + BigInt(value) : value).toString(16)}`;
    if (size)
        return pad(hex, { size });
    return hex;
}
const encoder = /*#__PURE__*/ new TextEncoder();
/**
 * Encodes a UTF-8 string into a hex string
 *
 * - Docs: https://viem.sh/docs/utilities/toHex#stringtohex
 *
 * @param value Value to encode.
 * @param opts Options.
 * @returns Hex value.
 *
 * @example
 * import { stringToHex } from 'viem'
 * const data = stringToHex('Hello World!')
 * // '0x48656c6c6f20576f726c6421'
 *
 * @example
 * import { stringToHex } from 'viem'
 * const data = stringToHex('Hello World!', { size: 32 })
 * // '0x48656c6c6f20576f726c64210000000000000000000000000000000000000000'
 */
function stringToHex(value_, opts = {}) {
    const value = encoder.encode(value_);
    return bytesToHex(value, opts);
}

class InvalidAddressError extends BaseError {
    constructor({ address }) {
        super(`Address "${address}" is invalid.`, {
            metaMessages: [
                '- Address must be a hex value of 20 bytes (40 hex characters).',
                '- Address must match its checksum counterpart.',
            ],
            name: 'InvalidAddressError',
        });
    }
}

/**
 * Map with a LRU (Least recently used) policy.
 *
 * @link https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
 */
class LruMap extends Map {
    constructor(size) {
        super();
        Object.defineProperty(this, "maxSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.maxSize = size;
    }
    get(key) {
        const value = super.get(key);
        if (super.has(key) && value !== undefined) {
            this.delete(key);
            super.set(key, value);
        }
        return value;
    }
    set(key, value) {
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
            const firstKey = this.keys().next().value;
            if (firstKey)
                this.delete(firstKey);
        }
        return this;
    }
}

// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
// It's called a sponge function.
// Various per round constants calculations
const SHA3_PI = [];
const SHA3_ROTL = [];
const _SHA3_IOTA = [];
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(0x71);
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
    // Pi
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    // Rotational
    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
    // Iota
    let t = _0n;
    for (let j = 0; j < 7; j++) {
        R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
        if (R & _2n)
            t ^= _1n << ((_1n << /* @__PURE__ */ BigInt(j)) - _1n);
    }
    _SHA3_IOTA.push(t);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
// Left rotation (without 0, 32, 64)
const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
// Same as keccakf1600, but allows to skip some rounds
function keccakP(s, rounds = 24) {
    const B = new Uint32Array(5 * 2);
    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
    for (let round = 24 - rounds; round < 24; round++) {
        // Theta θ
        for (let x = 0; x < 10; x++)
            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
        for (let x = 0; x < 10; x += 2) {
            const idx1 = (x + 8) % 10;
            const idx0 = (x + 2) % 10;
            const B0 = B[idx0];
            const B1 = B[idx0 + 1];
            const Th = rotlH(B0, B1, 1) ^ B[idx1];
            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
            for (let y = 0; y < 50; y += 10) {
                s[x + y] ^= Th;
                s[x + y + 1] ^= Tl;
            }
        }
        // Rho (ρ) and Pi (π)
        let curH = s[2];
        let curL = s[3];
        for (let t = 0; t < 24; t++) {
            const shift = SHA3_ROTL[t];
            const Th = rotlH(curH, curL, shift);
            const Tl = rotlL(curH, curL, shift);
            const PI = SHA3_PI[t];
            curH = s[PI];
            curL = s[PI + 1];
            s[PI] = Th;
            s[PI + 1] = Tl;
        }
        // Chi (χ)
        for (let y = 0; y < 50; y += 10) {
            for (let x = 0; x < 10; x++)
                B[x] = s[y + x];
            for (let x = 0; x < 10; x++)
                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        }
        // Iota (ι)
        s[0] ^= SHA3_IOTA_H[round];
        s[1] ^= SHA3_IOTA_L[round];
    }
    B.fill(0);
}
class Keccak extends Hash {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        // Can be passed from user as dkLen
        number(outputLen);
        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
        if (0 >= this.blockLen || this.blockLen >= 200)
            throw new Error('Sha3 supports only keccak-f1600 function');
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
    }
    keccak() {
        if (!isLE)
            byteSwap32(this.state32);
        keccakP(this.state32, this.rounds);
        if (!isLE)
            byteSwap32(this.state32);
        this.posOut = 0;
        this.pos = 0;
    }
    update(data) {
        exists(this);
        const { blockLen, state } = this;
        data = toBytes$1(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            for (let i = 0; i < take; i++)
                state[this.pos++] ^= data[pos++];
            if (this.pos === blockLen)
                this.keccak();
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        // Do the padding
        state[pos] ^= suffix;
        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
            this.keccak();
        state[blockLen - 1] ^= 0x80;
        this.keccak();
    }
    writeInto(out) {
        exists(this, false);
        bytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len;) {
            if (this.posOut >= blockLen)
                this.keccak();
            const take = Math.min(blockLen - this.posOut, len - pos);
            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
            this.posOut += take;
            pos += take;
        }
        return out;
    }
    xofInto(out) {
        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
        if (!this.enableXOF)
            throw new Error('XOF is not possible for this instance');
        return this.writeInto(out);
    }
    xof(bytes) {
        number(bytes);
        return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
        output(out, this);
        if (this.finished)
            throw new Error('digest() was already called');
        this.writeInto(out);
        this.destroy();
        return out;
    }
    digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
        this.destroyed = true;
        this.state.fill(0);
    }
    _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        // Suffix can change in cSHAKE
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
    }
}
const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
/**
 * keccak-256 hash function. Different from SHA3-256.
 * @param message - that would be hashed
 */
const keccak_256 = /* @__PURE__ */ gen(0x01, 136, 256 / 8);

function keccak256(value, to_) {
    const to = to_ || 'hex';
    const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
    if (to === 'bytes')
        return bytes;
    return toHex(bytes);
}

const checksumAddressCache = /*#__PURE__*/ new LruMap(8192);
function checksumAddress(address_, 
/**
 * Warning: EIP-1191 checksum addresses are generally not backwards compatible with the
 * wider Ethereum ecosystem, meaning it will break when validated against an application/tool
 * that relies on EIP-55 checksum encoding (checksum without chainId).
 *
 * It is highly recommended to not use this feature unless you
 * know what you are doing.
 *
 * See more: https://github.com/ethereum/EIPs/issues/1121
 */
chainId) {
    if (checksumAddressCache.has(`${address_}.${chainId}`))
        return checksumAddressCache.get(`${address_}.${chainId}`);
    const hexAddress = address_.substring(2).toLowerCase();
    const hash = keccak256(stringToBytes(hexAddress), 'bytes');
    const address = (hexAddress).split('');
    for (let i = 0; i < 40; i += 2) {
        if (hash[i >> 1] >> 4 >= 8 && address[i]) {
            address[i] = address[i].toUpperCase();
        }
        if ((hash[i >> 1] & 0x0f) >= 8 && address[i + 1]) {
            address[i + 1] = address[i + 1].toUpperCase();
        }
    }
    const result = `0x${address.join('')}`;
    checksumAddressCache.set(`${address_}.${chainId}`, result);
    return result;
}

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
/** @internal */
const isAddressCache = /*#__PURE__*/ new LruMap(8192);
function isAddress(address, options) {
    const { strict = true } = options ?? {};
    const cacheKey = `${address}.${strict}`;
    if (isAddressCache.has(cacheKey))
        return isAddressCache.get(cacheKey);
    const result = (() => {
        if (!addressRegex.test(address))
            return false;
        if (address.toLowerCase() === address)
            return true;
        if (strict)
            return checksumAddress(address) === address;
        return true;
    })();
    isAddressCache.set(cacheKey, result);
    return result;
}

// TODO(v3): Rename to `toLocalAccount` + add `source` property to define source (privateKey, mnemonic, hdKey, etc).
/**
 * @description Creates an Account from a custom signing implementation.
 *
 * @returns A Local Account.
 */
function toAccount(source) {
    if (typeof source === 'string') {
        if (!isAddress(source, { strict: false }))
            throw new InvalidAddressError({ address: source });
        return {
            address: source,
            type: 'json-rpc',
        };
    }
    if (!isAddress(source.address, { strict: false }))
        throw new InvalidAddressError({ address: source.address });
    return {
        address: source.address,
        nonceManager: source.nonceManager,
        sign: source.sign,
        experimental_signAuthorization: source.experimental_signAuthorization,
        signMessage: source.signMessage,
        signTransaction: source.signTransaction,
        signTypedData: source.signTypedData,
        source: 'custom',
        type: 'local',
    };
}

/**
 * @description Converts an ECDSA public key to an address.
 *
 * @param publicKey The public key to convert.
 *
 * @returns The address.
 */
function publicKeyToAddress(publicKey) {
    const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
    return checksumAddress(`0x${address}`);
}

/**
 * @description Converts a signature into hex format.
 *
 * @param signature The signature to convert.
 * @returns The signature in hex format.
 *
 * @example
 * serializeSignature({
 *   r: '0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf',
 *   s: '0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8',
 *   yParity: 1
 * })
 * // "0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db81c"
 */
function serializeSignature({ r, s, to = 'hex', v, yParity, }) {
    const yParity_ = (() => {
        if (yParity === 0 || yParity === 1)
            return yParity;
        if (v && (v === 27n || v === 28n || v >= 35n))
            return v % 2n === 0n ? 1 : 0;
        throw new Error('Invalid `v` or `yParity` value');
    })();
    const signature = `0x${new secp256k1.Signature(hexToBigInt(r), hexToBigInt(s)).toCompactHex()}${yParity_ === 0 ? '1b' : '1c'}`;
    if (to === 'hex')
        return signature;
    return hexToBytes(signature);
}

// TODO(v3): Convert to sync.
/**
 * @description Signs a hash with a given private key.
 *
 * @param hash The hash to sign.
 * @param privateKey The private key to sign with.
 *
 * @returns The signature.
 */
async function sign({ hash, privateKey, to = 'object', }) {
    const { r, s, recovery } = secp256k1.sign(hash.slice(2), privateKey.slice(2));
    const signature = {
        r: numberToHex(r, { size: 32 }),
        s: numberToHex(s, { size: 32 }),
        v: recovery ? 28n : 27n,
        yParity: recovery,
    };
    return (() => {
        if (to === 'bytes' || to === 'hex')
            return serializeSignature({ ...signature, to });
        return signature;
    })();
}

function concat(values) {
    if (typeof values[0] === 'string')
        return concatHex(values);
    return concatBytes(values);
}
function concatBytes(values) {
    let length = 0;
    for (const arr of values) {
        length += arr.length;
    }
    const result = new Uint8Array(length);
    let offset = 0;
    for (const arr of values) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
function concatHex(values) {
    return `0x${values.reduce((acc, x) => acc + x.replace('0x', ''), '')}`;
}

class NegativeOffsetError extends BaseError {
    constructor({ offset }) {
        super(`Offset \`${offset}\` cannot be negative.`, {
            name: 'NegativeOffsetError',
        });
    }
}
class PositionOutOfBoundsError extends BaseError {
    constructor({ length, position }) {
        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: 'PositionOutOfBoundsError' });
    }
}
class RecursiveReadLimitExceededError extends BaseError {
    constructor({ count, limit }) {
        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: 'RecursiveReadLimitExceededError' });
    }
}

const staticCursor = {
    bytes: new Uint8Array(),
    dataView: new DataView(new ArrayBuffer(0)),
    position: 0,
    positionReadCount: new Map(),
    recursiveReadCount: 0,
    recursiveReadLimit: Number.POSITIVE_INFINITY,
    assertReadLimit() {
        if (this.recursiveReadCount >= this.recursiveReadLimit)
            throw new RecursiveReadLimitExceededError({
                count: this.recursiveReadCount + 1,
                limit: this.recursiveReadLimit,
            });
    },
    assertPosition(position) {
        if (position < 0 || position > this.bytes.length - 1)
            throw new PositionOutOfBoundsError({
                length: this.bytes.length,
                position,
            });
    },
    decrementPosition(offset) {
        if (offset < 0)
            throw new NegativeOffsetError({ offset });
        const position = this.position - offset;
        this.assertPosition(position);
        this.position = position;
    },
    getReadCount(position) {
        return this.positionReadCount.get(position || this.position) || 0;
    },
    incrementPosition(offset) {
        if (offset < 0)
            throw new NegativeOffsetError({ offset });
        const position = this.position + offset;
        this.assertPosition(position);
        this.position = position;
    },
    inspectByte(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
    },
    inspectBytes(length, position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + length - 1);
        return this.bytes.subarray(position, position + length);
    },
    inspectUint8(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
    },
    inspectUint16(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 1);
        return this.dataView.getUint16(position);
    },
    inspectUint24(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 2);
        return ((this.dataView.getUint16(position) << 8) +
            this.dataView.getUint8(position + 2));
    },
    inspectUint32(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 3);
        return this.dataView.getUint32(position);
    },
    pushByte(byte) {
        this.assertPosition(this.position);
        this.bytes[this.position] = byte;
        this.position++;
    },
    pushBytes(bytes) {
        this.assertPosition(this.position + bytes.length - 1);
        this.bytes.set(bytes, this.position);
        this.position += bytes.length;
    },
    pushUint8(value) {
        this.assertPosition(this.position);
        this.bytes[this.position] = value;
        this.position++;
    },
    pushUint16(value) {
        this.assertPosition(this.position + 1);
        this.dataView.setUint16(this.position, value);
        this.position += 2;
    },
    pushUint24(value) {
        this.assertPosition(this.position + 2);
        this.dataView.setUint16(this.position, value >> 8);
        this.dataView.setUint8(this.position + 2, value & ~4294967040);
        this.position += 3;
    },
    pushUint32(value) {
        this.assertPosition(this.position + 3);
        this.dataView.setUint32(this.position, value);
        this.position += 4;
    },
    readByte() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectByte();
        this.position++;
        return value;
    },
    readBytes(length, size) {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectBytes(length);
        this.position += size ?? length;
        return value;
    },
    readUint8() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint8();
        this.position += 1;
        return value;
    },
    readUint16() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint16();
        this.position += 2;
        return value;
    },
    readUint24() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint24();
        this.position += 3;
        return value;
    },
    readUint32() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint32();
        this.position += 4;
        return value;
    },
    get remaining() {
        return this.bytes.length - this.position;
    },
    setPosition(position) {
        const oldPosition = this.position;
        this.assertPosition(position);
        this.position = position;
        return () => (this.position = oldPosition);
    },
    _touch() {
        if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
            return;
        const count = this.getReadCount();
        this.positionReadCount.set(this.position, count + 1);
        if (count > 0)
            this.recursiveReadCount++;
    },
};
function createCursor(bytes, { recursiveReadLimit = 8_192 } = {}) {
    const cursor = Object.create(staticCursor);
    cursor.bytes = bytes;
    cursor.dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    cursor.positionReadCount = new Map();
    cursor.recursiveReadLimit = recursiveReadLimit;
    return cursor;
}

function toRlp(bytes, to = 'hex') {
    const encodable = getEncodable(bytes);
    const cursor = createCursor(new Uint8Array(encodable.length));
    encodable.encode(cursor);
    if (to === 'hex')
        return bytesToHex(cursor.bytes);
    return cursor.bytes;
}
function getEncodable(bytes) {
    if (Array.isArray(bytes))
        return getEncodableList(bytes.map((x) => getEncodable(x)));
    return getEncodableBytes(bytes);
}
function getEncodableList(list) {
    const bodyLength = list.reduce((acc, x) => acc + x.length, 0);
    const sizeOfBodyLength = getSizeOfLength(bodyLength);
    const length = (() => {
        if (bodyLength <= 55)
            return 1 + bodyLength;
        return 1 + sizeOfBodyLength + bodyLength;
    })();
    return {
        length,
        encode(cursor) {
            if (bodyLength <= 55) {
                cursor.pushByte(0xc0 + bodyLength);
            }
            else {
                cursor.pushByte(0xc0 + 55 + sizeOfBodyLength);
                if (sizeOfBodyLength === 1)
                    cursor.pushUint8(bodyLength);
                else if (sizeOfBodyLength === 2)
                    cursor.pushUint16(bodyLength);
                else if (sizeOfBodyLength === 3)
                    cursor.pushUint24(bodyLength);
                else
                    cursor.pushUint32(bodyLength);
            }
            for (const { encode } of list) {
                encode(cursor);
            }
        },
    };
}
function getEncodableBytes(bytesOrHex) {
    const bytes = typeof bytesOrHex === 'string' ? hexToBytes(bytesOrHex) : bytesOrHex;
    const sizeOfBytesLength = getSizeOfLength(bytes.length);
    const length = (() => {
        if (bytes.length === 1 && bytes[0] < 0x80)
            return 1;
        if (bytes.length <= 55)
            return 1 + bytes.length;
        return 1 + sizeOfBytesLength + bytes.length;
    })();
    return {
        length,
        encode(cursor) {
            if (bytes.length === 1 && bytes[0] < 0x80) {
                cursor.pushBytes(bytes);
            }
            else if (bytes.length <= 55) {
                cursor.pushByte(0x80 + bytes.length);
                cursor.pushBytes(bytes);
            }
            else {
                cursor.pushByte(0x80 + 55 + sizeOfBytesLength);
                if (sizeOfBytesLength === 1)
                    cursor.pushUint8(bytes.length);
                else if (sizeOfBytesLength === 2)
                    cursor.pushUint16(bytes.length);
                else if (sizeOfBytesLength === 3)
                    cursor.pushUint24(bytes.length);
                else
                    cursor.pushUint32(bytes.length);
                cursor.pushBytes(bytes);
            }
        },
    };
}
function getSizeOfLength(length) {
    if (length < 2 ** 8)
        return 1;
    if (length < 2 ** 16)
        return 2;
    if (length < 2 ** 24)
        return 3;
    if (length < 2 ** 32)
        return 4;
    throw new BaseError('Length is too large.');
}

/**
 * Computes an Authorization hash in [EIP-7702 format](https://eips.ethereum.org/EIPS/eip-7702): `keccak256('0x05' || rlp([chain_id, address, nonce]))`.
 */
function hashAuthorization(parameters) {
    const { chainId, contractAddress, nonce, to } = parameters;
    const hash = keccak256(concatHex([
        '0x05',
        toRlp([
            chainId ? numberToHex(chainId) : '0x',
            contractAddress,
            nonce ? numberToHex(nonce) : '0x',
        ]),
    ]));
    if (to === 'bytes')
        return hexToBytes(hash);
    return hash;
}

/**
 * Signs an Authorization hash in [EIP-7702 format](https://eips.ethereum.org/EIPS/eip-7702): `keccak256('0x05' || rlp([chain_id, address, nonce]))`.
 */
async function experimental_signAuthorization(parameters) {
    const { contractAddress, chainId, nonce, privateKey, to = 'object', } = parameters;
    const signature = await sign({
        hash: hashAuthorization({ contractAddress, chainId, nonce }),
        privateKey,
        to,
    });
    if (to === 'object')
        return {
            contractAddress,
            chainId,
            nonce,
            ...signature,
        };
    return signature;
}

const presignMessagePrefix = '\x19Ethereum Signed Message:\n';

function toPrefixedMessage(message_) {
    const message = (() => {
        if (typeof message_ === 'string')
            return stringToHex(message_);
        if (typeof message_.raw === 'string')
            return message_.raw;
        return bytesToHex(message_.raw);
    })();
    const prefix = stringToHex(`${presignMessagePrefix}${size(message)}`);
    return concat([prefix, message]);
}

function hashMessage(message, to_) {
    return keccak256(toPrefixedMessage(message), to_);
}

/**
 * @description Calculates an Ethereum-specific signature in [EIP-191 format](https://eips.ethereum.org/EIPS/eip-191):
 * `keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))`.
 *
 * @returns The signature.
 */
async function signMessage({ message, privateKey, }) {
    return await sign({ hash: hashMessage(message), privateKey, to: 'hex' });
}

const gweiUnits = {
    ether: -9,
    wei: 9,
};

/**
 *  Divides a number by a given exponent of base 10 (10exponent), and formats it into a string representation of the number..
 *
 * - Docs: https://viem.sh/docs/utilities/formatUnits
 *
 * @example
 * import { formatUnits } from 'viem'
 *
 * formatUnits(420000000000n, 9)
 * // '420'
 */
function formatUnits(value, decimals) {
    let display = value.toString();
    const negative = display.startsWith('-');
    if (negative)
        display = display.slice(1);
    display = display.padStart(decimals, '0');
    let [integer, fraction] = [
        display.slice(0, display.length - decimals),
        display.slice(display.length - decimals),
    ];
    fraction = fraction.replace(/(0+)$/, '');
    return `${negative ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Converts numerical wei to a string representation of gwei.
 *
 * - Docs: https://viem.sh/docs/utilities/formatGwei
 *
 * @example
 * import { formatGwei } from 'viem'
 *
 * formatGwei(1000000000n)
 * // '1'
 */
function formatGwei(wei, unit = 'wei') {
    return formatUnits(wei, gweiUnits[unit]);
}

function prettyPrint(args) {
    const entries = Object.entries(args)
        .map(([key, value]) => {
        if (value === undefined || value === false)
            return null;
        return [key, value];
    })
        .filter(Boolean);
    const maxLength = entries.reduce((acc, [key]) => Math.max(acc, key.length), 0);
    return entries
        .map(([key, value]) => `  ${`${key}:`.padEnd(maxLength + 1)}  ${value}`)
        .join('\n');
}
class InvalidLegacyVError extends BaseError {
    constructor({ v }) {
        super(`Invalid \`v\` value "${v}". Expected 27 or 28.`, {
            name: 'InvalidLegacyVError',
        });
    }
}
class InvalidSerializableTransactionError extends BaseError {
    constructor({ transaction }) {
        super('Cannot infer a transaction type from provided transaction.', {
            metaMessages: [
                'Provided Transaction:',
                '{',
                prettyPrint(transaction),
                '}',
                '',
                'To infer the type, either provide:',
                '- a `type` to the Transaction, or',
                '- an EIP-1559 Transaction with `maxFeePerGas`, or',
                '- an EIP-2930 Transaction with `gasPrice` & `accessList`, or',
                '- an EIP-4844 Transaction with `blobs`, `blobVersionedHashes`, `sidecars`, or',
                '- an EIP-7702 Transaction with `authorizationList`, or',
                '- a Legacy Transaction with `gasPrice`',
            ],
            name: 'InvalidSerializableTransactionError',
        });
    }
}
class InvalidStorageKeySizeError extends BaseError {
    constructor({ storageKey }) {
        super(`Size for storage key "${storageKey}" is invalid. Expected 32 bytes. Got ${Math.floor((storageKey.length - 2) / 2)} bytes.`, { name: 'InvalidStorageKeySizeError' });
    }
}

/**
 * Compute commitments from a list of blobs.
 *
 * @example
 * ```ts
 * import { blobsToCommitments, toBlobs } from 'viem'
 * import { kzg } from './kzg'
 *
 * const blobs = toBlobs({ data: '0x1234' })
 * const commitments = blobsToCommitments({ blobs, kzg })
 * ```
 */
function blobsToCommitments(parameters) {
    const { kzg } = parameters;
    const to = parameters.to ?? (typeof parameters.blobs[0] === 'string' ? 'hex' : 'bytes');
    const blobs = (typeof parameters.blobs[0] === 'string'
        ? parameters.blobs.map((x) => hexToBytes(x))
        : parameters.blobs);
    const commitments = [];
    for (const blob of blobs)
        commitments.push(Uint8Array.from(kzg.blobToKzgCommitment(blob)));
    return (to === 'bytes'
        ? commitments
        : commitments.map((x) => bytesToHex(x)));
}

/**
 * Compute the proofs for a list of blobs and their commitments.
 *
 * @example
 * ```ts
 * import {
 *   blobsToCommitments,
 *   toBlobs
 * } from 'viem'
 * import { kzg } from './kzg'
 *
 * const blobs = toBlobs({ data: '0x1234' })
 * const commitments = blobsToCommitments({ blobs, kzg })
 * const proofs = blobsToProofs({ blobs, commitments, kzg })
 * ```
 */
function blobsToProofs(parameters) {
    const { kzg } = parameters;
    const to = parameters.to ?? (typeof parameters.blobs[0] === 'string' ? 'hex' : 'bytes');
    const blobs = (typeof parameters.blobs[0] === 'string'
        ? parameters.blobs.map((x) => hexToBytes(x))
        : parameters.blobs);
    const commitments = (typeof parameters.commitments[0] === 'string'
        ? parameters.commitments.map((x) => hexToBytes(x))
        : parameters.commitments);
    const proofs = [];
    for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        const commitment = commitments[i];
        proofs.push(Uint8Array.from(kzg.computeBlobKzgProof(blob, commitment)));
    }
    return (to === 'bytes'
        ? proofs
        : proofs.map((x) => bytesToHex(x)));
}

function sha256(value, to_) {
    const bytes = sha256$1(isHex(value, { strict: false }) ? toBytes(value) : value);
    return bytes;
}

/**
 * Transform a commitment to it's versioned hash.
 *
 * @example
 * ```ts
 * import {
 *   blobsToCommitments,
 *   commitmentToVersionedHash,
 *   toBlobs
 * } from 'viem'
 * import { kzg } from './kzg'
 *
 * const blobs = toBlobs({ data: '0x1234' })
 * const [commitment] = blobsToCommitments({ blobs, kzg })
 * const versionedHash = commitmentToVersionedHash({ commitment })
 * ```
 */
function commitmentToVersionedHash(parameters) {
    const { commitment, version = 1 } = parameters;
    const to = parameters.to ?? (typeof commitment === 'string' ? 'hex' : 'bytes');
    const versionedHash = sha256(commitment);
    versionedHash.set([version], 0);
    return (to === 'bytes' ? versionedHash : bytesToHex(versionedHash));
}

/**
 * Transform a list of commitments to their versioned hashes.
 *
 * @example
 * ```ts
 * import {
 *   blobsToCommitments,
 *   commitmentsToVersionedHashes,
 *   toBlobs
 * } from 'viem'
 * import { kzg } from './kzg'
 *
 * const blobs = toBlobs({ data: '0x1234' })
 * const commitments = blobsToCommitments({ blobs, kzg })
 * const versionedHashes = commitmentsToVersionedHashes({ commitments })
 * ```
 */
function commitmentsToVersionedHashes(parameters) {
    const { commitments, version } = parameters;
    const to = parameters.to ?? (typeof commitments[0] === 'string' ? 'hex' : 'bytes');
    const hashes = [];
    for (const commitment of commitments) {
        hashes.push(commitmentToVersionedHash({
            commitment,
            to,
            version,
        }));
    }
    return hashes;
}

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-4844.md#parameters
/** Blob limit per transaction. */
const blobsPerTransaction = 6;
/** The number of bytes in a BLS scalar field element. */
const bytesPerFieldElement = 32;
/** The number of field elements in a blob. */
const fieldElementsPerBlob = 4096;
/** The number of bytes in a blob. */
const bytesPerBlob = bytesPerFieldElement * fieldElementsPerBlob;
/** Blob bytes limit per transaction. */
const maxBytesPerTransaction = bytesPerBlob * blobsPerTransaction -
    // terminator byte (0x80).
    1 -
    // zero byte (0x00) appended to each field element.
    1 * fieldElementsPerBlob * blobsPerTransaction;

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-4844.md#parameters
const versionedHashVersionKzg = 1;

class BlobSizeTooLargeError extends BaseError {
    constructor({ maxSize, size }) {
        super('Blob size is too large.', {
            metaMessages: [`Max: ${maxSize} bytes`, `Given: ${size} bytes`],
            name: 'BlobSizeTooLargeError',
        });
    }
}
class EmptyBlobError extends BaseError {
    constructor() {
        super('Blob data must not be empty.', { name: 'EmptyBlobError' });
    }
}
class InvalidVersionedHashSizeError extends BaseError {
    constructor({ hash, size, }) {
        super(`Versioned hash "${hash}" size is invalid.`, {
            metaMessages: ['Expected: 32', `Received: ${size}`],
            name: 'InvalidVersionedHashSizeError',
        });
    }
}
class InvalidVersionedHashVersionError extends BaseError {
    constructor({ hash, version, }) {
        super(`Versioned hash "${hash}" version is invalid.`, {
            metaMessages: [
                `Expected: ${versionedHashVersionKzg}`,
                `Received: ${version}`,
            ],
            name: 'InvalidVersionedHashVersionError',
        });
    }
}

/**
 * Transforms arbitrary data to blobs.
 *
 * @example
 * ```ts
 * import { toBlobs, stringToHex } from 'viem'
 *
 * const blobs = toBlobs({ data: stringToHex('hello world') })
 * ```
 */
function toBlobs(parameters) {
    const to = parameters.to ?? (typeof parameters.data === 'string' ? 'hex' : 'bytes');
    const data = (typeof parameters.data === 'string'
        ? hexToBytes(parameters.data)
        : parameters.data);
    const size_ = size(data);
    if (!size_)
        throw new EmptyBlobError();
    if (size_ > maxBytesPerTransaction)
        throw new BlobSizeTooLargeError({
            maxSize: maxBytesPerTransaction,
            size: size_,
        });
    const blobs = [];
    let active = true;
    let position = 0;
    while (active) {
        const blob = createCursor(new Uint8Array(bytesPerBlob));
        let size = 0;
        while (size < fieldElementsPerBlob) {
            const bytes = data.slice(position, position + (bytesPerFieldElement - 1));
            // Push a zero byte so the field element doesn't overflow the BLS modulus.
            blob.pushByte(0x00);
            // Push the current segment of data bytes.
            blob.pushBytes(bytes);
            // If we detect that the current segment of data bytes is less than 31 bytes,
            // we can stop processing and push a terminator byte to indicate the end of the blob.
            if (bytes.length < 31) {
                blob.pushByte(0x80);
                active = false;
                break;
            }
            size++;
            position += 31;
        }
        blobs.push(blob);
    }
    return (to === 'bytes'
        ? blobs.map((x) => x.bytes)
        : blobs.map((x) => bytesToHex(x.bytes)));
}

/**
 * Transforms arbitrary data (or blobs, commitments, & proofs) into a sidecar array.
 *
 * @example
 * ```ts
 * import { toBlobSidecars, stringToHex } from 'viem'
 *
 * const sidecars = toBlobSidecars({ data: stringToHex('hello world') })
 * ```
 *
 * @example
 * ```ts
 * import {
 *   blobsToCommitments,
 *   toBlobs,
 *   blobsToProofs,
 *   toBlobSidecars,
 *   stringToHex
 * } from 'viem'
 *
 * const blobs = toBlobs({ data: stringToHex('hello world') })
 * const commitments = blobsToCommitments({ blobs, kzg })
 * const proofs = blobsToProofs({ blobs, commitments, kzg })
 *
 * const sidecars = toBlobSidecars({ blobs, commitments, proofs })
 * ```
 */
function toBlobSidecars(parameters) {
    const { data, kzg, to } = parameters;
    const blobs = parameters.blobs ?? toBlobs({ data: data, to });
    const commitments = parameters.commitments ?? blobsToCommitments({ blobs, kzg: kzg, to });
    const proofs = parameters.proofs ?? blobsToProofs({ blobs, commitments, kzg: kzg, to });
    const sidecars = [];
    for (let i = 0; i < blobs.length; i++)
        sidecars.push({
            blob: blobs[i],
            commitment: commitments[i],
            proof: proofs[i],
        });
    return sidecars;
}

/*
 * Serializes an EIP-7702 authorization list.
 */
function serializeAuthorizationList(authorizationList) {
    if (!authorizationList || authorizationList.length === 0)
        return [];
    const serializedAuthorizationList = [];
    for (const authorization of authorizationList) {
        const { contractAddress, chainId, nonce, ...signature } = authorization;
        serializedAuthorizationList.push([
            chainId ? toHex(chainId) : '0x',
            contractAddress,
            nonce ? toHex(nonce) : '0x',
            ...toYParitySignatureArray({}, signature),
        ]);
    }
    return serializedAuthorizationList;
}

const maxUint256 = 2n ** 256n - 1n;

class InvalidChainIdError extends BaseError {
    constructor({ chainId }) {
        super(typeof chainId === 'number'
            ? `Chain ID "${chainId}" is invalid.`
            : 'Chain ID is invalid.', { name: 'InvalidChainIdError' });
    }
}

class FeeCapTooHighError extends BaseError {
    constructor({ cause, maxFeePerGas, } = {}) {
        super(`The fee cap (\`maxFeePerGas\`${maxFeePerGas ? ` = ${formatGwei(maxFeePerGas)} gwei` : ''}) cannot be higher than the maximum allowed value (2^256-1).`, {
            cause,
            name: 'FeeCapTooHighError',
        });
    }
}
Object.defineProperty(FeeCapTooHighError, "nodeMessage", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: /max fee per gas higher than 2\^256-1|fee cap higher than 2\^256-1/
});
class TipAboveFeeCapError extends BaseError {
    constructor({ cause, maxPriorityFeePerGas, maxFeePerGas, } = {}) {
        super([
            `The provided tip (\`maxPriorityFeePerGas\`${maxPriorityFeePerGas
                ? ` = ${formatGwei(maxPriorityFeePerGas)} gwei`
                : ''}) cannot be higher than the fee cap (\`maxFeePerGas\`${maxFeePerGas ? ` = ${formatGwei(maxFeePerGas)} gwei` : ''}).`,
        ].join('\n'), {
            cause,
            name: 'TipAboveFeeCapError',
        });
    }
}
Object.defineProperty(TipAboveFeeCapError, "nodeMessage", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: /max priority fee per gas higher than max fee per gas|tip higher than fee cap/
});

/**
 * @description Returns a section of the hex or byte array given a start/end bytes offset.
 *
 * @param value The hex or byte array to slice.
 * @param start The start offset (in bytes).
 * @param end The end offset (in bytes).
 */
function slice(value, start, end, { strict } = {}) {
    if (isHex(value, { strict: false }))
        return sliceHex(value, start, end, {
            strict,
        });
    return sliceBytes(value, start, end, {
        strict,
    });
}
function assertStartOffset(value, start) {
    if (typeof start === 'number' && start > 0 && start > size(value) - 1)
        throw new SliceOffsetOutOfBoundsError({
            offset: start,
            position: 'start',
            size: size(value),
        });
}
function assertEndOffset(value, start, end) {
    if (typeof start === 'number' &&
        typeof end === 'number' &&
        size(value) !== end - start) {
        throw new SliceOffsetOutOfBoundsError({
            offset: end,
            position: 'end',
            size: size(value),
        });
    }
}
/**
 * @description Returns a section of the byte array given a start/end bytes offset.
 *
 * @param value The byte array to slice.
 * @param start The start offset (in bytes).
 * @param end The end offset (in bytes).
 */
function sliceBytes(value_, start, end, { strict } = {}) {
    assertStartOffset(value_, start);
    const value = value_.slice(start, end);
    if (strict)
        assertEndOffset(value, start, end);
    return value;
}
/**
 * @description Returns a section of the hex value given a start/end bytes offset.
 *
 * @param value The hex value to slice.
 * @param start The start offset (in bytes).
 * @param end The end offset (in bytes).
 */
function sliceHex(value_, start, end, { strict } = {}) {
    assertStartOffset(value_, start);
    const value = `0x${value_
        .replace('0x', '')
        .slice((start ?? 0) * 2, (end ?? value_.length) * 2)}`;
    if (strict)
        assertEndOffset(value, start, end);
    return value;
}

function assertTransactionEIP7702(transaction) {
    const { authorizationList } = transaction;
    if (authorizationList) {
        for (const authorization of authorizationList) {
            const { contractAddress, chainId } = authorization;
            if (!isAddress(contractAddress))
                throw new InvalidAddressError({ address: contractAddress });
            if (chainId < 0)
                throw new InvalidChainIdError({ chainId });
        }
    }
    assertTransactionEIP1559(transaction);
}
function assertTransactionEIP4844(transaction) {
    const { blobVersionedHashes } = transaction;
    if (blobVersionedHashes) {
        if (blobVersionedHashes.length === 0)
            throw new EmptyBlobError();
        for (const hash of blobVersionedHashes) {
            const size_ = size(hash);
            const version = hexToNumber(slice(hash, 0, 1));
            if (size_ !== 32)
                throw new InvalidVersionedHashSizeError({ hash, size: size_ });
            if (version !== versionedHashVersionKzg)
                throw new InvalidVersionedHashVersionError({
                    hash,
                    version,
                });
        }
    }
    assertTransactionEIP1559(transaction);
}
function assertTransactionEIP1559(transaction) {
    const { chainId, maxPriorityFeePerGas, maxFeePerGas, to } = transaction;
    if (chainId <= 0)
        throw new InvalidChainIdError({ chainId });
    if (to && !isAddress(to))
        throw new InvalidAddressError({ address: to });
    if (maxFeePerGas && maxFeePerGas > maxUint256)
        throw new FeeCapTooHighError({ maxFeePerGas });
    if (maxPriorityFeePerGas &&
        maxFeePerGas &&
        maxPriorityFeePerGas > maxFeePerGas)
        throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
}
function assertTransactionEIP2930(transaction) {
    const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
    if (chainId <= 0)
        throw new InvalidChainIdError({ chainId });
    if (to && !isAddress(to))
        throw new InvalidAddressError({ address: to });
    if (maxPriorityFeePerGas || maxFeePerGas)
        throw new BaseError('`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.');
    if (gasPrice && gasPrice > maxUint256)
        throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}
function assertTransactionLegacy(transaction) {
    const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
    if (to && !isAddress(to))
        throw new InvalidAddressError({ address: to });
    if (typeof chainId !== 'undefined' && chainId <= 0)
        throw new InvalidChainIdError({ chainId });
    if (maxPriorityFeePerGas || maxFeePerGas)
        throw new BaseError('`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.');
    if (gasPrice && gasPrice > maxUint256)
        throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}

function getTransactionType(transaction) {
    if (transaction.type)
        return transaction.type;
    if (typeof transaction.authorizationList !== 'undefined')
        return 'eip7702';
    if (typeof transaction.blobs !== 'undefined' ||
        typeof transaction.blobVersionedHashes !== 'undefined' ||
        typeof transaction.maxFeePerBlobGas !== 'undefined' ||
        typeof transaction.sidecars !== 'undefined')
        return 'eip4844';
    if (typeof transaction.maxFeePerGas !== 'undefined' ||
        typeof transaction.maxPriorityFeePerGas !== 'undefined') {
        return 'eip1559';
    }
    if (typeof transaction.gasPrice !== 'undefined') {
        if (typeof transaction.accessList !== 'undefined')
            return 'eip2930';
        return 'legacy';
    }
    throw new InvalidSerializableTransactionError({ transaction });
}

/*
 * Serialize an  EIP-2930 access list
 * @remarks
 * Use to create a transaction serializer with support for EIP-2930 access lists
 *
 * @param accessList - Array of objects of address and arrays of Storage Keys
 * @throws InvalidAddressError, InvalidStorageKeySizeError
 * @returns Array of hex strings
 */
function serializeAccessList(accessList) {
    if (!accessList || accessList.length === 0)
        return [];
    const serializedAccessList = [];
    for (let i = 0; i < accessList.length; i++) {
        const { address, storageKeys } = accessList[i];
        for (let j = 0; j < storageKeys.length; j++) {
            if (storageKeys[j].length - 2 !== 64) {
                throw new InvalidStorageKeySizeError({ storageKey: storageKeys[j] });
            }
        }
        if (!isAddress(address, { strict: false })) {
            throw new InvalidAddressError({ address });
        }
        serializedAccessList.push([address, storageKeys]);
    }
    return serializedAccessList;
}

function serializeTransaction(transaction, signature) {
    const type = getTransactionType(transaction);
    if (type === 'eip1559')
        return serializeTransactionEIP1559(transaction, signature);
    if (type === 'eip2930')
        return serializeTransactionEIP2930(transaction, signature);
    if (type === 'eip4844')
        return serializeTransactionEIP4844(transaction, signature);
    if (type === 'eip7702')
        return serializeTransactionEIP7702(transaction, signature);
    return serializeTransactionLegacy(transaction, signature);
}
function serializeTransactionEIP7702(transaction, signature) {
    const { authorizationList, chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
    assertTransactionEIP7702(transaction);
    const serializedAccessList = serializeAccessList(accessList);
    const serializedAuthorizationList = serializeAuthorizationList(authorizationList);
    return concatHex([
        '0x04',
        toRlp([
            toHex(chainId),
            nonce ? toHex(nonce) : '0x',
            maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : '0x',
            maxFeePerGas ? toHex(maxFeePerGas) : '0x',
            gas ? toHex(gas) : '0x',
            to ?? '0x',
            value ? toHex(value) : '0x',
            data ?? '0x',
            serializedAccessList,
            serializedAuthorizationList,
            ...toYParitySignatureArray(transaction, signature),
        ]),
    ]);
}
function serializeTransactionEIP4844(transaction, signature) {
    const { chainId, gas, nonce, to, value, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
    assertTransactionEIP4844(transaction);
    let blobVersionedHashes = transaction.blobVersionedHashes;
    let sidecars = transaction.sidecars;
    // If `blobs` are passed, we will need to compute the KZG commitments & proofs.
    if (transaction.blobs &&
        (typeof blobVersionedHashes === 'undefined' ||
            typeof sidecars === 'undefined')) {
        const blobs = (typeof transaction.blobs[0] === 'string'
            ? transaction.blobs
            : transaction.blobs.map((x) => bytesToHex(x)));
        const kzg = transaction.kzg;
        const commitments = blobsToCommitments({
            blobs,
            kzg,
        });
        if (typeof blobVersionedHashes === 'undefined')
            blobVersionedHashes = commitmentsToVersionedHashes({
                commitments,
            });
        if (typeof sidecars === 'undefined') {
            const proofs = blobsToProofs({ blobs, commitments, kzg });
            sidecars = toBlobSidecars({ blobs, commitments, proofs });
        }
    }
    const serializedAccessList = serializeAccessList(accessList);
    const serializedTransaction = [
        toHex(chainId),
        nonce ? toHex(nonce) : '0x',
        maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : '0x',
        maxFeePerGas ? toHex(maxFeePerGas) : '0x',
        gas ? toHex(gas) : '0x',
        to ?? '0x',
        value ? toHex(value) : '0x',
        data ?? '0x',
        serializedAccessList,
        maxFeePerBlobGas ? toHex(maxFeePerBlobGas) : '0x',
        blobVersionedHashes ?? [],
        ...toYParitySignatureArray(transaction, signature),
    ];
    const blobs = [];
    const commitments = [];
    const proofs = [];
    if (sidecars)
        for (let i = 0; i < sidecars.length; i++) {
            const { blob, commitment, proof } = sidecars[i];
            blobs.push(blob);
            commitments.push(commitment);
            proofs.push(proof);
        }
    return concatHex([
        '0x03',
        sidecars
            ? // If sidecars are enabled, envelope turns into a "wrapper":
                toRlp([serializedTransaction, blobs, commitments, proofs])
            : // If sidecars are disabled, standard envelope is used:
                toRlp(serializedTransaction),
    ]);
}
function serializeTransactionEIP1559(transaction, signature) {
    const { chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data, } = transaction;
    assertTransactionEIP1559(transaction);
    const serializedAccessList = serializeAccessList(accessList);
    const serializedTransaction = [
        toHex(chainId),
        nonce ? toHex(nonce) : '0x',
        maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : '0x',
        maxFeePerGas ? toHex(maxFeePerGas) : '0x',
        gas ? toHex(gas) : '0x',
        to ?? '0x',
        value ? toHex(value) : '0x',
        data ?? '0x',
        serializedAccessList,
        ...toYParitySignatureArray(transaction, signature),
    ];
    return concatHex([
        '0x02',
        toRlp(serializedTransaction),
    ]);
}
function serializeTransactionEIP2930(transaction, signature) {
    const { chainId, gas, data, nonce, to, value, accessList, gasPrice } = transaction;
    assertTransactionEIP2930(transaction);
    const serializedAccessList = serializeAccessList(accessList);
    const serializedTransaction = [
        toHex(chainId),
        nonce ? toHex(nonce) : '0x',
        gasPrice ? toHex(gasPrice) : '0x',
        gas ? toHex(gas) : '0x',
        to ?? '0x',
        value ? toHex(value) : '0x',
        data ?? '0x',
        serializedAccessList,
        ...toYParitySignatureArray(transaction, signature),
    ];
    return concatHex([
        '0x01',
        toRlp(serializedTransaction),
    ]);
}
function serializeTransactionLegacy(transaction, signature) {
    const { chainId = 0, gas, data, nonce, to, value, gasPrice } = transaction;
    assertTransactionLegacy(transaction);
    let serializedTransaction = [
        nonce ? toHex(nonce) : '0x',
        gasPrice ? toHex(gasPrice) : '0x',
        gas ? toHex(gas) : '0x',
        to ?? '0x',
        value ? toHex(value) : '0x',
        data ?? '0x',
    ];
    if (signature) {
        const v = (() => {
            // EIP-155 (inferred chainId)
            if (signature.v >= 35n) {
                const inferredChainId = (signature.v - 35n) / 2n;
                if (inferredChainId > 0)
                    return signature.v;
                return 27n + (signature.v === 35n ? 0n : 1n);
            }
            // EIP-155 (explicit chainId)
            if (chainId > 0)
                return BigInt(chainId * 2) + BigInt(35n + signature.v - 27n);
            // Pre-EIP-155 (no chainId)
            const v = 27n + (signature.v === 27n ? 0n : 1n);
            if (signature.v !== v)
                throw new InvalidLegacyVError({ v: signature.v });
            return v;
        })();
        const r = trim(signature.r);
        const s = trim(signature.s);
        serializedTransaction = [
            ...serializedTransaction,
            toHex(v),
            r === '0x00' ? '0x' : r,
            s === '0x00' ? '0x' : s,
        ];
    }
    else if (chainId > 0) {
        serializedTransaction = [
            ...serializedTransaction,
            toHex(chainId),
            '0x',
            '0x',
        ];
    }
    return toRlp(serializedTransaction);
}
function toYParitySignatureArray(transaction, signature_) {
    const signature = signature_ ?? transaction;
    const { v, yParity } = signature;
    if (typeof signature.r === 'undefined')
        return [];
    if (typeof signature.s === 'undefined')
        return [];
    if (typeof v === 'undefined' && typeof yParity === 'undefined')
        return [];
    const r = trim(signature.r);
    const s = trim(signature.s);
    const yParity_ = (() => {
        if (typeof yParity === 'number')
            return yParity ? toHex(1) : '0x';
        if (v === 0n)
            return '0x';
        if (v === 1n)
            return toHex(1);
        return v === 27n ? '0x' : toHex(1);
    })();
    return [yParity_, r === '0x00' ? '0x' : r, s === '0x00' ? '0x' : s];
}

async function signTransaction(parameters) {
    const { privateKey, transaction, serializer = serializeTransaction, } = parameters;
    const signableTransaction = (() => {
        // For EIP-4844 Transactions, we want to sign the transaction payload body (tx_payload_body) without the sidecars (ie. without the network wrapper).
        // See: https://github.com/ethereum/EIPs/blob/e00f4daa66bd56e2dbd5f1d36d09fd613811a48b/EIPS/eip-4844.md#networking
        if (transaction.type === 'eip4844')
            return {
                ...transaction,
                sidecars: false,
            };
        return transaction;
    })();
    const signature = await sign({
        hash: keccak256(serializer(signableTransaction)),
        privateKey,
    });
    return serializer(transaction, signature);
}

class AbiEncodingArrayLengthMismatchError extends BaseError {
    constructor({ expectedLength, givenLength, type, }) {
        super([
            `ABI encoding array length mismatch for type ${type}.`,
            `Expected length: ${expectedLength}`,
            `Given length: ${givenLength}`,
        ].join('\n'), { name: 'AbiEncodingArrayLengthMismatchError' });
    }
}
class AbiEncodingBytesSizeMismatchError extends BaseError {
    constructor({ expectedSize, value }) {
        super(`Size of bytes "${value}" (bytes${size(value)}) does not match expected size (bytes${expectedSize}).`, { name: 'AbiEncodingBytesSizeMismatchError' });
    }
}
class AbiEncodingLengthMismatchError extends BaseError {
    constructor({ expectedLength, givenLength, }) {
        super([
            'ABI encoding params/values length mismatch.',
            `Expected length (params): ${expectedLength}`,
            `Given length (values): ${givenLength}`,
        ].join('\n'), { name: 'AbiEncodingLengthMismatchError' });
    }
}
class BytesSizeMismatchError extends BaseError {
    constructor({ expectedSize, givenSize, }) {
        super(`Expected bytes${expectedSize}, got bytes${givenSize}.`, {
            name: 'BytesSizeMismatchError',
        });
    }
}
class InvalidAbiEncodingTypeError extends BaseError {
    constructor(type, { docsPath }) {
        super([
            `Type "${type}" is not a valid encoding type.`,
            'Please provide a valid ABI type.',
        ].join('\n'), { docsPath, name: 'InvalidAbiEncodingType' });
    }
}
class InvalidArrayError extends BaseError {
    constructor(value) {
        super([`Value "${value}" is not a valid array.`].join('\n'), {
            name: 'InvalidArrayError',
        });
    }
}

/**
 * @description Encodes a list of primitive values into an ABI-encoded hex value.
 *
 * - Docs: https://viem.sh/docs/abi/encodeAbiParameters#encodeabiparameters
 *
 *   Generates ABI encoded data using the [ABI specification](https://docs.soliditylang.org/en/latest/abi-spec), given a set of ABI parameters (inputs/outputs) and their corresponding values.
 *
 * @param params - a set of ABI Parameters (params), that can be in the shape of the inputs or outputs attribute of an ABI Item.
 * @param values - a set of values (values) that correspond to the given params.
 * @example
 * ```typescript
 * import { encodeAbiParameters } from 'viem'
 *
 * const encodedData = encodeAbiParameters(
 *   [
 *     { name: 'x', type: 'string' },
 *     { name: 'y', type: 'uint' },
 *     { name: 'z', type: 'bool' }
 *   ],
 *   ['wagmi', 420n, true]
 * )
 * ```
 *
 * You can also pass in Human Readable parameters with the parseAbiParameters utility.
 *
 * @example
 * ```typescript
 * import { encodeAbiParameters, parseAbiParameters } from 'viem'
 *
 * const encodedData = encodeAbiParameters(
 *   parseAbiParameters('string x, uint y, bool z'),
 *   ['wagmi', 420n, true]
 * )
 * ```
 */
function encodeAbiParameters(params, values) {
    if (params.length !== values.length)
        throw new AbiEncodingLengthMismatchError({
            expectedLength: params.length,
            givenLength: values.length,
        });
    // Prepare the parameters to determine dynamic types to encode.
    const preparedParams = prepareParams({
        params: params,
        values: values,
    });
    const data = encodeParams(preparedParams);
    if (data.length === 0)
        return '0x';
    return data;
}
function prepareParams({ params, values, }) {
    const preparedParams = [];
    for (let i = 0; i < params.length; i++) {
        preparedParams.push(prepareParam({ param: params[i], value: values[i] }));
    }
    return preparedParams;
}
function prepareParam({ param, value, }) {
    const arrayComponents = getArrayComponents(param.type);
    if (arrayComponents) {
        const [length, type] = arrayComponents;
        return encodeArray(value, { length, param: { ...param, type } });
    }
    if (param.type === 'tuple') {
        return encodeTuple(value, {
            param: param,
        });
    }
    if (param.type === 'address') {
        return encodeAddress(value);
    }
    if (param.type === 'bool') {
        return encodeBool(value);
    }
    if (param.type.startsWith('uint') || param.type.startsWith('int')) {
        const signed = param.type.startsWith('int');
        return encodeNumber(value, { signed });
    }
    if (param.type.startsWith('bytes')) {
        return encodeBytes(value, { param });
    }
    if (param.type === 'string') {
        return encodeString(value);
    }
    throw new InvalidAbiEncodingTypeError(param.type, {
        docsPath: '/docs/contract/encodeAbiParameters',
    });
}
function encodeParams(preparedParams) {
    // 1. Compute the size of the static part of the parameters.
    let staticSize = 0;
    for (let i = 0; i < preparedParams.length; i++) {
        const { dynamic, encoded } = preparedParams[i];
        if (dynamic)
            staticSize += 32;
        else
            staticSize += size(encoded);
    }
    // 2. Split the parameters into static and dynamic parts.
    const staticParams = [];
    const dynamicParams = [];
    let dynamicSize = 0;
    for (let i = 0; i < preparedParams.length; i++) {
        const { dynamic, encoded } = preparedParams[i];
        if (dynamic) {
            staticParams.push(numberToHex(staticSize + dynamicSize, { size: 32 }));
            dynamicParams.push(encoded);
            dynamicSize += size(encoded);
        }
        else {
            staticParams.push(encoded);
        }
    }
    // 3. Concatenate static and dynamic parts.
    return concat([...staticParams, ...dynamicParams]);
}
function encodeAddress(value) {
    if (!isAddress(value))
        throw new InvalidAddressError({ address: value });
    return { dynamic: false, encoded: padHex(value.toLowerCase()) };
}
function encodeArray(value, { length, param, }) {
    const dynamic = length === null;
    if (!Array.isArray(value))
        throw new InvalidArrayError(value);
    if (!dynamic && value.length !== length)
        throw new AbiEncodingArrayLengthMismatchError({
            expectedLength: length,
            givenLength: value.length,
            type: `${param.type}[${length}]`,
        });
    let dynamicChild = false;
    const preparedParams = [];
    for (let i = 0; i < value.length; i++) {
        const preparedParam = prepareParam({ param, value: value[i] });
        if (preparedParam.dynamic)
            dynamicChild = true;
        preparedParams.push(preparedParam);
    }
    if (dynamic || dynamicChild) {
        const data = encodeParams(preparedParams);
        if (dynamic) {
            const length = numberToHex(preparedParams.length, { size: 32 });
            return {
                dynamic: true,
                encoded: preparedParams.length > 0 ? concat([length, data]) : length,
            };
        }
        if (dynamicChild)
            return { dynamic: true, encoded: data };
    }
    return {
        dynamic: false,
        encoded: concat(preparedParams.map(({ encoded }) => encoded)),
    };
}
function encodeBytes(value, { param }) {
    const [, paramSize] = param.type.split('bytes');
    const bytesSize = size(value);
    if (!paramSize) {
        let value_ = value;
        // If the size is not divisible by 32 bytes, pad the end
        // with empty bytes to the ceiling 32 bytes.
        if (bytesSize % 32 !== 0)
            value_ = padHex(value_, {
                dir: 'right',
                size: Math.ceil((value.length - 2) / 2 / 32) * 32,
            });
        return {
            dynamic: true,
            encoded: concat([padHex(numberToHex(bytesSize, { size: 32 })), value_]),
        };
    }
    if (bytesSize !== Number.parseInt(paramSize))
        throw new AbiEncodingBytesSizeMismatchError({
            expectedSize: Number.parseInt(paramSize),
            value,
        });
    return { dynamic: false, encoded: padHex(value, { dir: 'right' }) };
}
function encodeBool(value) {
    if (typeof value !== 'boolean')
        throw new BaseError(`Invalid boolean value: "${value}" (type: ${typeof value}). Expected: \`true\` or \`false\`.`);
    return { dynamic: false, encoded: padHex(boolToHex(value)) };
}
function encodeNumber(value, { signed }) {
    return {
        dynamic: false,
        encoded: numberToHex(value, {
            size: 32,
            signed,
        }),
    };
}
function encodeString(value) {
    const hexValue = stringToHex(value);
    const partsLength = Math.ceil(size(hexValue) / 32);
    const parts = [];
    for (let i = 0; i < partsLength; i++) {
        parts.push(padHex(slice(hexValue, i * 32, (i + 1) * 32), {
            dir: 'right',
        }));
    }
    return {
        dynamic: true,
        encoded: concat([
            padHex(numberToHex(size(hexValue), { size: 32 })),
            ...parts,
        ]),
    };
}
function encodeTuple(value, { param }) {
    let dynamic = false;
    const preparedParams = [];
    for (let i = 0; i < param.components.length; i++) {
        const param_ = param.components[i];
        const index = Array.isArray(value) ? i : param_.name;
        const preparedParam = prepareParam({
            param: param_,
            value: value[index],
        });
        preparedParams.push(preparedParam);
        if (preparedParam.dynamic)
            dynamic = true;
    }
    return {
        dynamic,
        encoded: dynamic
            ? encodeParams(preparedParams)
            : concat(preparedParams.map(({ encoded }) => encoded)),
    };
}
function getArrayComponents(type) {
    const matches = type.match(/^(.*)\[(\d+)?\]$/);
    return matches
        ? // Return `null` if the array is dynamic.
            [matches[2] ? Number(matches[2]) : null, matches[1]]
        : undefined;
}

class InvalidPrimaryTypeError extends BaseError {
    constructor({ primaryType, types, }) {
        super(`Invalid primary type \`${primaryType}\` must be one of \`${JSON.stringify(Object.keys(types))}\`.`, {
            docsPath: '/api/glossary/Errors#typeddatainvalidprimarytypeerror',
            metaMessages: ['Check that the primary type is a key in `types`.'],
        });
    }
}
class InvalidStructTypeError extends BaseError {
    constructor({ type }) {
        super(`Struct type "${type}" is invalid.`, {
            metaMessages: ['Struct type must not be a Solidity type.'],
            name: 'InvalidStructTypeError',
        });
    }
}

// `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`
// https://regexr.com/6va55
const bytesRegex = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/;
// `(u)int<M>`: (un)signed integer type of `M` bits, `0 < M <= 256`, `M % 8 == 0`
// https://regexr.com/6v8hp
const integerRegex = /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;

function validateTypedData(parameters) {
    const { domain, message, primaryType, types } = parameters;
    const validateData = (struct, data) => {
        for (const param of struct) {
            const { name, type } = param;
            const value = data[name];
            const integerMatch = type.match(integerRegex);
            if (integerMatch &&
                (typeof value === 'number' || typeof value === 'bigint')) {
                const [_type, base, size_] = integerMatch;
                // If number cannot be cast to a sized hex value, it is out of range
                // and will throw.
                numberToHex(value, {
                    signed: base === 'int',
                    size: Number.parseInt(size_) / 8,
                });
            }
            if (type === 'address' && typeof value === 'string' && !isAddress(value))
                throw new InvalidAddressError({ address: value });
            const bytesMatch = type.match(bytesRegex);
            if (bytesMatch) {
                const [_type, size_] = bytesMatch;
                if (size_ && size(value) !== Number.parseInt(size_))
                    throw new BytesSizeMismatchError({
                        expectedSize: Number.parseInt(size_),
                        givenSize: size(value),
                    });
            }
            const struct = types[type];
            if (struct) {
                validateReference(type);
                validateData(struct, value);
            }
        }
    };
    // Validate domain types.
    if (types.EIP712Domain && domain)
        validateData(types.EIP712Domain, domain);
    // Validate message types.
    if (primaryType !== 'EIP712Domain') {
        if (types[primaryType])
            validateData(types[primaryType], message);
        else
            throw new InvalidPrimaryTypeError({ primaryType, types });
    }
}
function getTypesForEIP712Domain({ domain, }) {
    return [
        typeof domain?.name === 'string' && { name: 'name', type: 'string' },
        domain?.version && { name: 'version', type: 'string' },
        typeof domain?.chainId === 'number' && {
            name: 'chainId',
            type: 'uint256',
        },
        domain?.verifyingContract && {
            name: 'verifyingContract',
            type: 'address',
        },
        domain?.salt && { name: 'salt', type: 'bytes32' },
    ].filter(Boolean);
}
/** @internal */
function validateReference(type) {
    // Struct type must not be a Solidity type.
    if (type === 'address' ||
        type === 'bool' ||
        type === 'string' ||
        type.startsWith('bytes') ||
        type.startsWith('uint') ||
        type.startsWith('int'))
        throw new InvalidStructTypeError({ type });
}

// Implementation forked and adapted from https://github.com/MetaMask/eth-sig-util/blob/main/src/sign-typed-data.ts
function hashTypedData(parameters) {
    const { domain = {}, message, primaryType, } = parameters;
    const types = {
        EIP712Domain: getTypesForEIP712Domain({ domain }),
        ...parameters.types,
    };
    // Need to do a runtime validation check on addresses, byte ranges, integer ranges, etc
    // as we can't statically check this with TypeScript.
    validateTypedData({
        domain,
        message,
        primaryType,
        types,
    });
    const parts = ['0x1901'];
    if (domain)
        parts.push(hashDomain({
            domain,
            types: types,
        }));
    if (primaryType !== 'EIP712Domain')
        parts.push(hashStruct({
            data: message,
            primaryType,
            types: types,
        }));
    return keccak256(concat(parts));
}
function hashDomain({ domain, types, }) {
    return hashStruct({
        data: domain,
        primaryType: 'EIP712Domain',
        types,
    });
}
function hashStruct({ data, primaryType, types, }) {
    const encoded = encodeData({
        data,
        primaryType,
        types,
    });
    return keccak256(encoded);
}
function encodeData({ data, primaryType, types, }) {
    const encodedTypes = [{ type: 'bytes32' }];
    const encodedValues = [hashType({ primaryType, types })];
    for (const field of types[primaryType]) {
        const [type, value] = encodeField({
            types,
            name: field.name,
            type: field.type,
            value: data[field.name],
        });
        encodedTypes.push(type);
        encodedValues.push(value);
    }
    return encodeAbiParameters(encodedTypes, encodedValues);
}
function hashType({ primaryType, types, }) {
    const encodedHashType = toHex(encodeType({ primaryType, types }));
    return keccak256(encodedHashType);
}
function encodeType({ primaryType, types, }) {
    let result = '';
    const unsortedDeps = findTypeDependencies({ primaryType, types });
    unsortedDeps.delete(primaryType);
    const deps = [primaryType, ...Array.from(unsortedDeps).sort()];
    for (const type of deps) {
        result += `${type}(${types[type]
            .map(({ name, type: t }) => `${t} ${name}`)
            .join(',')})`;
    }
    return result;
}
function findTypeDependencies({ primaryType: primaryType_, types, }, results = new Set()) {
    const match = primaryType_.match(/^\w*/u);
    const primaryType = match?.[0];
    if (results.has(primaryType) || types[primaryType] === undefined) {
        return results;
    }
    results.add(primaryType);
    for (const field of types[primaryType]) {
        findTypeDependencies({ primaryType: field.type, types }, results);
    }
    return results;
}
function encodeField({ types, name, type, value, }) {
    if (types[type] !== undefined) {
        return [
            { type: 'bytes32' },
            keccak256(encodeData({ data: value, primaryType: type, types })),
        ];
    }
    if (type === 'bytes') {
        const prepend = value.length % 2 ? '0' : '';
        value = `0x${prepend + value.slice(2)}`;
        return [{ type: 'bytes32' }, keccak256(value)];
    }
    if (type === 'string')
        return [{ type: 'bytes32' }, keccak256(toHex(value))];
    if (type.lastIndexOf(']') === type.length - 1) {
        const parsedType = type.slice(0, type.lastIndexOf('['));
        const typeValuePairs = value.map((item) => encodeField({
            name,
            type: parsedType,
            types,
            value: item,
        }));
        return [
            { type: 'bytes32' },
            keccak256(encodeAbiParameters(typeValuePairs.map(([t]) => t), typeValuePairs.map(([, v]) => v))),
        ];
    }
    return [{ type }, value];
}

/**
 * @description Signs typed data and calculates an Ethereum-specific signature in [EIP-191 format](https://eips.ethereum.org/EIPS/eip-191):
 * `keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))`.
 *
 * @returns The signature.
 */
async function signTypedData(parameters) {
    const { privateKey, ...typedData } = parameters;
    return await sign({
        hash: hashTypedData(typedData),
        privateKey,
        to: 'hex',
    });
}

/**
 * @description Creates an Account from a private key.
 *
 * @returns A Private Key Account.
 */
function privateKeyToAccount(privateKey, options = {}) {
    const { nonceManager } = options;
    const publicKey = toHex(secp256k1.getPublicKey(privateKey.slice(2), false));
    const address = publicKeyToAddress(publicKey);
    const account = toAccount({
        address,
        nonceManager,
        async sign({ hash }) {
            return sign({ hash, privateKey, to: 'hex' });
        },
        async experimental_signAuthorization(authorization) {
            return experimental_signAuthorization({ ...authorization, privateKey });
        },
        async signMessage({ message }) {
            return signMessage({ message, privateKey });
        },
        async signTransaction(transaction, { serializer } = {}) {
            return signTransaction({ privateKey, transaction, serializer });
        },
        async signTypedData(typedData) {
            return signTypedData({ ...typedData, privateKey });
        },
    });
    return {
        ...account,
        publicKey,
        source: 'privateKey',
    };
}

const SequenceMarketplace_V2_ABI = [
    {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "acceptRequest",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "additionalFees",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "additionalFeeRecipients",
                "type": "address[]",
                "internalType": "address[]"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "acceptRequestBatch",
        "inputs": [
            {
                "name": "requestIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "quantities",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "recipients",
                "type": "address[]",
                "internalType": "address[]"
            },
            {
                "name": "additionalFees",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "additionalFeeRecipients",
                "type": "address[]",
                "internalType": "address[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "cancelRequest",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "cancelRequestBatch",
        "inputs": [
            {
                "name": "requestIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "createRequest",
        "inputs": [
            {
                "name": "request",
                "type": "tuple",
                "internalType": "struct ISequenceMarketStorage.RequestParams",
                "components": [
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "outputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "createRequestBatch",
        "inputs": [
            {
                "name": "requests",
                "type": "tuple[]",
                "internalType": "struct ISequenceMarketStorage.RequestParams[]",
                "components": [
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "outputs": [
            {
                "name": "requestIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "customRoyalties",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "fee",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRequest",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "request",
                "type": "tuple",
                "internalType": "struct ISequenceMarketStorage.Request",
                "components": [
                    {
                        "name": "creator",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRequestBatch",
        "inputs": [
            {
                "name": "requestIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [
            {
                "name": "requests",
                "type": "tuple[]",
                "internalType": "struct ISequenceMarketStorage.Request[]",
                "components": [
                    {
                        "name": "creator",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getRoyaltyInfo",
        "inputs": [
            {
                "name": "tokenContract",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "cost",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "royalty",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "invalidBeforeId",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "invalidTokenBeforeId",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "invalidateRequests",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "invalidateRequests",
        "inputs": [
            {
                "name": "tokenContract",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "isRequestValid",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "valid",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "request",
                "type": "tuple",
                "internalType": "struct ISequenceMarketStorage.Request",
                "components": [
                    {
                        "name": "creator",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isRequestValidBatch",
        "inputs": [
            {
                "name": "requestIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "quantities",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [
            {
                "name": "valid",
                "type": "bool[]",
                "internalType": "bool[]"
            },
            {
                "name": "requests",
                "type": "tuple[]",
                "internalType": "struct ISequenceMarketStorage.Request[]",
                "components": [
                    {
                        "name": "creator",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "isListing",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isERC1155",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "tokenContract",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "tokenId",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "quantity",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "expiry",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "currency",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "pricePerToken",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proxiableUUID",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setRoyaltyInfo",
        "inputs": [
            {
                "name": "tokenContract",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "fee",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "upgradeTo",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "upgradeToAndCall",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "event",
        "name": "AdminChanged",
        "inputs": [
            {
                "name": "previousAdmin",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "newAdmin",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "BeaconUpgraded",
        "inputs": [
            {
                "name": "beacon",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "CustomRoyaltyChanged",
        "inputs": [
            {
                "name": "tokenContract",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "recipient",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "fee",
                "type": "uint96",
                "indexed": false,
                "internalType": "uint96"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Initialized",
        "inputs": [
            {
                "name": "version",
                "type": "uint8",
                "indexed": false,
                "internalType": "uint8"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RequestAccepted",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "buyer",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenContract",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "recipient",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "quantityRemaining",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RequestCancelled",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "tokenContract",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RequestCreated",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            },
            {
                "name": "creator",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenContract",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "isListing",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "currency",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "pricePerToken",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "expiry",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RequestsInvalidated",
        "inputs": [
            {
                "name": "creator",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "invalidatedBefore",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RequestsInvalidated",
        "inputs": [
            {
                "name": "creator",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenContract",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "invalidatedBefore",
                "type": "uint256",
                "indexed": true,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Upgraded",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "InvalidAdditionalFees",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidBatchRequest",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidCurrency",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidCurrencyApproval",
        "inputs": [
            {
                "name": "currency",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidExpiry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidPrice",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidQuantity",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidRequestId",
        "inputs": [
            {
                "name": "requestId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidRoyalty",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidTokenApproval",
        "inputs": [
            {
                "name": "tokenContract",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "quantity",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "Invalidated",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UnsupportedContractInterface",
        "inputs": [
            {
                "name": "contractAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "interfaceId",
                "type": "bytes4",
                "internalType": "bytes4"
            }
        ]
    }
];

async function createListings(program, options) {
    let privateKey = options.key;
    let collectionAddress = options.address;
    let tokenId = options.token;
    let network = options.network;
    let currency = options.currency;
    let price = options.price;
    let quantity = options.quantity;
    const isERC1155 = options.type === 'ERC1155';
    if (!isERC1155) {
        // ERC721 must be always quantity = 1
        quantity = 1;
    }
    if (!privateKey) {
        privateKey = await password({
            message: 'Enter the private key for the wallet that holds the tokens',
        });
        if (!isValidPrivateKey(privateKey) && privateKey) {
            console.log('Please input a valid EVM Private key');
            process.exit();
        }
    }
    if (!collectionAddress) {
        collectionAddress = await input({
            message: 'Enter the address of the collection contract',
        });
    }
    if (tokenId === null || tokenId === undefined) {
        tokenId = await number$1({
            message: 'Enter the ID for the token to be listed',
        });
    }
    if (!network) {
        console.log('Please provide the Network for your project as a Sequence chain handle');
        console.log('Possible networks can be found at https://docs.sequence.xyz/solutions/technical-references/chain-support');
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)',
        });
    }
    if (!currency) {
        currency = await input({
            message: 'Enter either a well known currency code (USDC, MATIC, etc.) or a token address',
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
        console.log(`Using node URL: ${nodeUrl}`);
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
    let walletAddress = wallet.address;
    if (!walletAddress.startsWith('0x')) {
        walletAddress = `0x${walletAddress}`;
    }
    let marketplaceAddress = SEQUENCE_MARKETPLACE_V2_ADDRESS;
    if (options.marketplaceVersion === 'v1') {
        marketplaceAddress = SEQUENCE_MARKETPLACE_V1_ADDRESS;
    }
    const marketplaceABI = options.marketplaceVersion == 'v2'
        ? SequenceMarketplace_V2_ABI
        : SequenceMarketplace_V1_ABI;
    console.log(`Using EOA Wallet: ${walletAddress}`);
    console.log('Collection Address:', collectionAddress);
    console.log('Currency token address:', currency);
    console.log('Contract Type: %s, Is 1155', options.type, isERC1155);
    console.log('Using marketplace version', options.marketplaceVersion);
    const listingRequest = {
        collectionAddress,
        walletAddress,
        tokenId,
        currency,
        price,
        quantity,
        expiry: options.expireIn,
        marketplaceAddress: marketplaceAddress,
    };
    if (isERC1155) {
        try {
            await approvalERC1155(walletClient, listingRequest);
        }
        catch (e) {
            console.dir(e, { depth: null });
            return;
        }
    }
    else {
        try {
            await approvalERC721(walletClient, listingRequest);
        }
        catch (e) {
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
        console.log('Creating listing');
        const res = await marketplaceContract.write.createRequest([
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
        ], {
            account: walletClient.account,
            chain: walletClient.chain,
        });
        console.log('Listing created', res);
    }
    catch (error) {
        console.dir(error, { depth: null });
        program.error('Error processing transaction, please try again.');
    }
    console.log(`Listing created successfully for token ID ${tokenId}`);
}
async function approvalERC1155(client, input) {
    const collectionContract = getContract({
        address: input.collectionAddress,
        abi: ERC1155_ABI,
        client: client,
    });
    const isApprovedForAll = await collectionContract.read.isApprovedForAll([input.walletAddress, input.marketplaceAddress], {
        account: client.account,
    });
    if (!isApprovedForAll) {
        await collectionContract.write.setApprovalForAll([input.marketplaceAddress, true], {
            account: client.account,
            chain: client.chain,
        });
        console.log('ERC1155 setApprovalForAll executed successfully');
    }
}
async function approvalERC721(client, input) {
    const collectionContract = getContract({
        address: input.collectionAddress,
        abi: ERC721_ABI,
        client: client,
    });
    const isApprovedForAll = await collectionContract.read.isApprovedForAll([input.walletAddress, input.marketplaceAddress], {
        account: client.account,
    });
    if (!isApprovedForAll) {
        await collectionContract.write.setApprovalForAll([input.marketplaceAddress, true], { account: client.account, chain: client.chain });
        console.log('ERC721 setApprovalForAll executed successfully');
    }
}

var WalletTypes;
(function (WalletTypes) {
    WalletTypes["EmbeddedWallet"] = "waas";
    WalletTypes["UniversalWallet"] = "universal";
})(WalletTypes || (WalletTypes = {}));

const MARKETPLACE_BOILERPLATE_REPO_URL = "https://github.com/0xsequence/marketplace-boilerplate/";
async function createMarketplaceBoilerplate(program, options) {
    let walletType = options.walletType;
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let projectId = options.projectId;
    if (!walletType) {
        walletType = await select({
            message: "Please provide the Wallet Type for your project.\nFor more information on wallet types: https://docs.sequence.xyz/solutions/wallets/overview",
            choices: [
                {
                    name: "Embedded Wallet",
                    value: WalletTypes.EmbeddedWallet,
                },
                {
                    name: "Universal Wallet",
                    value: WalletTypes.UniversalWallet,
                },
            ],
        });
    }
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        {
            projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
            projectId = await promptForKeyWithLogs({ key: projectId, inputMessage: "Project ID:" }, [
                "Please provide the Project ID from your project.",
                "Your Project ID can be found in the URL within https://sequence.build, either in the cards of your projects or by entering one of the projects where it can also be found in the URL.",
                "To skip and use the default test projectId, press enter.",
            ]);
            if (walletType === WalletTypes.EmbeddedWallet) {
                waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
                googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
            }
        }
    }
    console.log("Cloning the repo to `marketplace-boilerplate`...");
    shell.exec(`git clone ${MARKETPLACE_BOILERPLATE_REPO_URL} marketplace-boilerplate`, { silent: !options.verbose });
    shell.cd("marketplace-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat(".env.example").toString();
    const envExampleLines = envExampleContent.split("\n");
    if (walletType === WalletTypes.EmbeddedWallet) {
        const envKeys = {
            "NEXT_PUBLIC_WALLET_TYPE": walletType || undefined,
            "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY": projectAccessKey || undefined,
            "NEXT_PUBLIC_SEQUENCE_PROJECT_ID": projectId || undefined,
            "NEXT_PUBLIC_WAAS_CONFIG_KEY": waasConfigKey || undefined,
            "NEXT_PUBLIC_GOOGLE_CLIENT_ID": googleClientId || undefined,
        };
        writeToEnvFile(envKeys, options);
        writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    }
    else if (walletType === WalletTypes.UniversalWallet) {
        const envKeys = {
            "NEXT_PUBLIC_WALLET_TYPE": walletType || undefined,
            "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY": projectAccessKey || undefined,
            "NEXT_PUBLIC_SEQUENCE_PROJECT_ID": projectId || undefined,
        };
        writeToEnvFile(envKeys, options);
        writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    }
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Marketplace boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const SEQUENCE_MARKETPLACE_V1_ADDRESS = '0xB537a160472183f2150d42EB1c3DD6684A55f74c';
const SEQUENCE_MARKETPLACE_V2_ADDRESS = '0xfdb42A198a932C8D3B506Ffa5e855bC4b348a712';
function makeCommandMarketplace(program) {
    const comm = new Command("marketplace");
    comm.action(() => {
        comm.help();
    });
    comm
        .command("create-listings")
        .description("Create listings for tokens in your wallet using the Sequence Marketplace contract")
        .option("--type <type>", "Collection type ERC1155 or ERC721", "ERC1155")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-a, --address <collection_address>", "Address of the collection contract")
        .option("-t, --token <token_id>", "ID for the token to be listed", parseInt)
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("-c, --currency <currency>", "Address for the currency token to be used for the listing")
        .option("-p, --price <price>", "Price per token, in the currency specified")
        .option("-q, --quantity <quantity>", "Number of tokens to be listed", parseInt, 1)
        .option("--expire-in <expiry_time>", "Days to expiry for the listing", parseInt, 7)
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--marketplace-version <version>", "Marketplace version", "v2")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createListings(program, options);
    });
    comm
        .command("create-marketplace-boilerplate")
        .description("Clone a starter boilerplate for Marketplace integrated with Next.js")
        .option("-wt, --wallet-type <wallet_type>", "Wallet type that you want to use. Possible values: 'waas' || 'universal'")
        .option("-pkey --project-access-key <access_key>", "Project access key for Sequence requests")
        .option("-pid --project-id <project_id>", "Project ID from your project")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createMarketplaceBoilerplate(program, options);
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
        if (!isValidPrivateKey(privateKey) && privateKey) {
            console.log('Please input a valid EVM Private key');
            process.exit();
        }
        console.log("");
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

const TXN_EXECUTED_LOG_TOPIC = "0x5c4eeb02dabf8976016ab414d617f9a162936dcace3cdef8c69ef6e262ad5ae7";
async function identifySequenceWallet(program, options) {
    let transactionHash = options.txn;
    let network = options.network;
    if (!transactionHash) {
        transactionHash = await input({
            message: 'Provide the transaction hash'
        });
    }
    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
        });
    }
    const chainConfig = findSupportedNetwork(network);
    if (chainConfig === undefined) {
        program.error(`Unsupported network ${network}, please select a valid network`);
    }
    let nodeUrl = chainConfig.rpcUrl;
    if (options.projectAccessKey) {
        nodeUrl += "/" + options.projectAccessKey;
    }
    if (options.verbose) {
        console.log(`Using node URL: ${nodeUrl}`);
    }
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const txReceipt = await provider.getTransactionReceipt(transactionHash);
    if (!txReceipt) {
        program.error("Transaction not found");
    }
    // Filter logs to find TxExecuted event log
    const txExecutedLog = txReceipt.logs.find((log) => log.topics[0] === TXN_EXECUTED_LOG_TOPIC);
    if (!txExecutedLog) {
        program.error("Sequence Wallet not found in the transaction logs");
    }
    console.log(`Transaction Origin (Relayer): ${txReceipt.from}`);
    console.log(`Sequence Wallet Address: ${txExecutedLog.address}`);
}

async function sendTx(program, options) {
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
        console.log('Please provide the Network for your project as a Sequence chain handle');
        console.log('Possible networks can be found at https://docs.sequence.xyz/solutions/technical-references/chain-support');
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
        const tx = { data: data, to: to, value: value };
        const res = await wallet.sendTransaction(tx);
        console.log("Transaction hash", res.hash);
    }
    catch (e) {
        console.error(e);
        return;
    }
}

function makeCommandWallet(program) {
    const comm = new Command("wallet");
    comm.action(() => {
        comm.help();
    });
    comm
        .command("send-tx")
        .description("Sign tx data coming from marketplace API and send it to chain")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-d, --data <data>", "TX data from marketplace API")
        .option("--to <to>", "Target address")
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("--marketplace-version <version>", "Marketplace version", "v2")
        .option("-v, --value <value>", "Tx value", "0")
        .action((options) => {
        sendTx(program, options);
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
    comm
        .command("identify-sequence-wallet")
        .description("Identify Sequence Wallet address from a transaction hash")
        .option("-t, --txn <txn>", "Transaction hash to be used")
        .option("-n, --network <network>", "Network to be used (mainnet, polygon, etc.)")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        identifySequenceWallet(program, options);
    });
    return comm;
}

const TX_MANAGER_REPO_URL = "https://github.com/0xsequence-demos/server-side-transactions-boilerplate";
async function createServerSideTx(program, options) {
    let privateKey = options.key;
    let projectAccessKey = options.projectAccessKey;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        privateKey = await promptForKeyWithLogs({ key: privateKey, inputMessage: "EVM Private Key:" }, [
            "Please provide a relayer private key for your project.",
            "You can obtain one for demo purposes here https://sequence-ethauthproof-viewer.vercel.app/",
            "To skip and use the default evm private key, press enter.",
            "",
            "Note: This private key's computed Sequence Wallet Address will have to have a Minter Role Granted on a Sequence standard contract in order for minting to work.",
        ]);
        if (!isValidPrivateKey(privateKey) && privateKey) {
            program.error('Please input a valid EVM Private key');
        }
        console.log("");
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }
    console.log("Cloning the repo to `server-side-transactions-boilerplate`...");
    shell.exec(`git clone ${TX_MANAGER_REPO_URL} server-side-transactions-boilerplate`, { silent: !options.verbose });
    shell.cd("server-side-transactions-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "PROJECT_ACCESS_KEY": privateKey || undefined,
        "EVM_PRIVATE_KEY": projectAccessKey || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Server side transactions boilerplate created successfully! 🔄");
    console.log("Starting development server...");
    shell.exec(`pnpm start`, { silent: false });
}

const EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/kit-embedded-wallet-react-boilerplate/";
async function createEmbeddedWalletReact(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }
    console.log("Cloning the repo to `embedded-wallet-react-boilerplate`...");
    shell.exec(`git clone ${EMBEDDED_WALLET_REACT_REPO_URL} embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("embedded-wallet-react-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const GOOGLE_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence-demos/google-embedded-wallet-react-boilerplate";
async function createGoogleEmbeddedWalletReact(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
    }
    console.log("Cloning the repo to `google-embedded-wallet-react-boilerplate`...");
    shell.exec(`git clone ${GOOGLE_EMBEDDED_WALLET_REACT_REPO_URL} google-embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("google-embedded-wallet-react-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Google Authenticated Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const EMAIL_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/email-embedded-wallet-react-boilerplate";
async function createEmailEmbeddedWalletReact(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }
    console.log("Cloning the repo to `email-embedded-wallet-react-boilerplate`...");
    shell.exec(`git clone ${EMAIL_EMBEDDED_WALLET_REACT_REPO_URL} email-embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("email-embedded-wallet-react-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Email Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const STYTCH_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/stytch-embedded-wallet-react-boilerplate/";
async function createStytchEmbeddedWalletReact(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let stytchPublicToken = options.stytchPublicToken;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        stytchPublicToken = await promptForStytchWithLogs(stytchPublicToken);
    }
    console.log("Cloning the repo to `stytch-embedded-wallet-react-boilerplate`...");
    shell.exec(`git clone ${STYTCH_EMBEDDED_WALLET_REACT_REPO_URL} stytch-embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("stytch-embedded-wallet-react-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_STYTCH_PUBLIC_TOKEN": stytchPublicToken || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Stytch Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const EMBEDDED_WALLET_NEXTJS_REPO_URL = "https://github.com/0xsequence/kit-embedded-wallet-nextjs-boilerplate/";
async function createEmbeddedWalletNextjs(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }
    console.log("Cloning the repo to `kit-embedded-wallet-nextjs-boilerplate`...");
    shell.exec(`git clone ${EMBEDDED_WALLET_NEXTJS_REPO_URL} kit-embedded-wallet-nextjs-boilerplate`, { silent: !options.verbose });
    shell.cd("kit-embedded-wallet-nextjs-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "NEXT_PUBLIC_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "NEXT_PUBLIC_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "NEXT_PUBLIC_APPLE_CLIENT_ID": appleClientId || undefined,
        "NEXT_PUBLIC_WALLET_CONNECT_ID": walletConnectId || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Kit Embedded Wallet Nextjs boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const WALLET_LINKING_EMBEDDED_WALLET_REPO_URL = "https://github.com/0xsequence-demos/demo-embedded-wallet-linking";
async function createWalletLinkingEmbeddedWallet(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let walletConnectId = options.walletConnectId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
    }
    console.log("Cloning the repo to `demo-embedded-wallet-linking`...");
    shell.exec(`git clone ${WALLET_LINKING_EMBEDDED_WALLET_REPO_URL} demo-embedded-wallet-linking`, { silent: !options.verbose });
    shell.cd("demo-embedded-wallet-linking");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Embedded Wallet Linking React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL = "https://github.com/0xsequence-demos/embedded-wallet-verify-session";
async function createEmbeddedWalletVerifySession(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let builderProjectId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }
    console.log("Cloning the repo to `embedded-wallet-verify-session-boilerplate`...");
    shell.exec(`git clone ${EMBEDDED_WALLET_VERIFY_SESSION_REPO_URL} embedded-wallet-verify-session-boilerplate`, { silent: !options.verbose });
    shell.cd("embedded-wallet-verify-session-boilerplate");
    shell.exec(`touch client/.env`, { silent: !options.verbose });
    shell.exec(`touch server/.env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envClientExampleContent = shell.cat('./client/.env.example').toString();
    const envClientExampleLines = envClientExampleContent.split('\n');
    const envKeysForFrontend = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
    };
    writeToEnvFile(envKeysForFrontend, { ...options, pathToWrite: "./client/.env" });
    writeDefaultKeysToEnvFileIfMissing(envClientExampleLines, envKeysForFrontend, { ...options, pathToWrite: "./client/.env" });
    const envKeysForBackend = {
        "BUILDER_PROJECT_ID": builderProjectId?.toString() || undefined,
    };
    const envServerExampleContent = shell.cat('./server/.env.example').toString();
    const envServerExampleLines = envServerExampleContent.split('\n');
    writeToEnvFile(envKeysForBackend, { ...options, pathToWrite: "./server/.env" });
    writeDefaultKeysToEnvFileIfMissing(envServerExampleLines, envKeysForBackend, { ...options, pathToWrite: "./server/.env" });
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Embedded Wallet Verify Session boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm start`, { silent: false });
}

const UNIVERSAL_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/universal-wallet-react-boilerplate/";
async function createUniversalWalletReact(program, options) {
    let projectAccessKey = options.projectAccessKey;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
    }
    console.log("Cloning the repo to `universal-wallet-react-boilerplate`...");
    shell.exec(`git clone ${UNIVERSAL_WALLET_REACT_REPO_URL} universal-wallet-react-boilerplate`, { silent: !options.verbose });
    shell.cd("universal-wallet-react-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Universal Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
}

const PRIMARY_DROP_SALES_ERC721_REPO_URL = "https://github.com/0xsequence/primary-drop-sale-721-boilerplate";
const REPOSITORY_FILENAME = "primary-drop-sales-erc721-boilerplate";
const SEQUENCE_DOCS_URL$1 = "https://docs.sequence.xyz/";
async function createPrimaryDropSalesErc721(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;
    let jwtAccessKey;
    cliConsole.sectionTitle("Initializing creation process for Primary Drop Sales ERC721 boilerplate 🚀");
    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey, { allowEmptyInput: false });
    googleClientId = await promptForGoogleClientIdWithLogs(googleClientId, { allowEmptyInput: true });
    appleClientId = await promptForAppleClientIdWithLogs(appleClientId, { allowEmptyInput: true });
    walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId, { allowEmptyInput: true });
    projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey, { allowEmptyInput: false });
    jwtAccessKey = await promptForJwtAccessKeyWithLogs(jwtAccessKey, { allowEmptyInput: false });
    if (projectAccessKey) {
        builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
        if (!builderProjectId) {
            console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
            process.exit();
        }
    }
    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);
    shell.exec(`git clone ${PRIMARY_DROP_SALES_ERC721_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });
    const directoryExists = checkIfDirectoryExists(REPOSITORY_FILENAME);
    if (!directoryExists) {
        cliConsole.error("Repository cloning failed. Please try again.");
        return;
    }
    shell.cd(REPOSITORY_FILENAME);
    shell.exec(`touch .env`, { silent: !options.verbose });
    cliConsole.loading("Configuring your project");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
        "JWT_ACCESS_KEY": jwtAccessKey || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    cliConsole.loading("Installing dependencies");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    cliConsole.done("Primary Drop Sales ERC721 boilerplate created successfully!");
    cliConsole.done(`Great! Now you can test the project with your Embedded Wallet. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL$1}guides/primary-drop-sales-erc721`);
    cliConsole.loading("Starting development server");
    cliConsole.info(`To know how to use this repository please go to the following link ${SEQUENCE_DOCS_URL$1}guides/primary-drop-sales-erc721`);
    shell.exec(`pnpm dev`, { silent: false });
}

const PRIMARY_SALES_ERC1155_REPO_URL = "https://github.com/0xsequence/primary-sale-1155-boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";
async function createPrimarySalesErc1155(program, options) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;
    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }
    console.log("Cloning the repo to `primary-sale-1155-boilerplate`...");
    shell.exec(`git clone ${PRIMARY_SALES_ERC1155_REPO_URL} primary-sale-1155-boilerplate`, { silent: !options.verbose });
    shell.cd("primary-sale-1155-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });
    console.log("Configuring your project...");
    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');
    const envKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
    };
    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    console.log("Installing dependencies...");
    shell.exec(`pnpm install`, { silent: !options.verbose });
    console.log("Primary Sales ERC1155 boilerplate created successfully! 🚀");
    console.log(`Great! Now you can test the project with your WaaS. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    console.log("Starting development server...");
    shell.exec(`pnpm dev`, { silent: false });
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
        .option("--wallet-connect-id <wallet_connect_id>", "Wallet Connect ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createEmbeddedWalletReact(program, options);
    });
    comm
        .command("create-google-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Google widget authenticated Sequence Embedded Wallet integrated with React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createGoogleEmbeddedWalletReact(program, options);
    });
    comm
        .command("create-server-side-transactions")
        .description("Create a server that has the ability to mint collectibles based on parameters")
        .option("-k, --key <private_key>", "Private key for the wallet that holds the tokens")
        .option("-pak, --project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createServerSideTx(program, options);
    });
    comm
        .command("create-kit-embedded-wallet-nextjs-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with Sequence Kit and Next.js")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--apple-client-id <apple_client_id>", "Apple client ID to be used during authentication")
        .option("--wallet-connect-id <wallet_connect_id>", "Wallet Connect ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createEmbeddedWalletNextjs(program, options);
    });
    comm
        .command("create-email-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for email authenticated Sequence Embedded Wallet integrated with React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createEmailEmbeddedWalletReact(program, options);
    });
    comm
        .command("create-stytch-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Stytch authenticated Sequence Embedded Wallet integrated with React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--stytch-public-token <stytch_public_token>", "Stytch Public Token for authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createStytchEmbeddedWalletReact(program, options);
    });
    comm
        .command("create-embedded-wallet-linking-starter")
        .description("Clone a starter boilerplate for Sequence Embedded wallet linking demo integrated with React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--wallet-connect-id <wallet_connect_id>", "Wallet Connect ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createWalletLinkingEmbeddedWallet(program, options);
    });
    comm
        .command("create-embedded-wallet-verify-session-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet verification from a server-side application")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createEmbeddedWalletVerifySession(program, options);
    });
    comm
        .command("create-universal-wallet-starter")
        .description("Clone a boilerplate for Sequence Universal Wallet")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createUniversalWalletReact(program, options);
    });
    comm
        .command("create-primary-sales-erc1155-starter")
        .description("Clone a starter boilerplate for Primary Sales integrated with WaaS")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--apple-client-id <apple_client_id>", "Apple client ID to be used during authentication")
        .option("--wallet-connect-id <wallet_connect_id>", "Wallet Connect ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createPrimarySalesErc1155(program, options);
    });
    comm
        .command("create-primary-drop-sales-erc721-starter")
        .description("Clone a starter boilerplate for NFT Drops using primary sales for NFTs ERC721, integrated with Sequence Kit and Embedded Wallet, using React")
        .option("--waas-config-key <waas_key>", "WaaS config key for this project")
        .option("--project-access-key <access_key>", "Project access key for Sequence requests")
        .option("--google-client-id <google_client_id>", "Google client ID to be used during authentication")
        .option("--apple-client-id <apple_client_id>", "Apple client ID to be used during authentication")
        .option("--wallet-connect-id <wallet_connect_id>", "Wallet Connect ID to be used during authentication")
        .option("--verbose", "Show additional information in the output")
        .action((options) => {
        createPrimaryDropSalesErc721(program, options);
    });
    return comm;
}

console.log(figlet.textSync("Sequence"));
console.log("");
const program = new Command();
program.version("0.4.0", "-v, --version", "Display the current version").action(
  () => {
    program.help();
  }
);
program.addCommand(makeCommandMarketplace(program));
program.addCommand(makeCommandWallet(program));
program.addCommand(makeCommandBoilerplates(program));
program.parse(process.argv);
