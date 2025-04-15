import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { ethers } from "ethers";
import { Session } from '@0xsequence/auth';
import { findSupportedNetwork } from '@0xsequence/network';


const TXN_EXECUTED_LOG_TOPIC = "0x5c4eeb02dabf8976016ab414d617f9a162936dcace3cdef8c69ef6e262ad5ae7";
const GUEST_MODULE_ADDRESS = "0xfea230Ee243f88BC698dD8f1aE93F8301B6cdfaE";

export async function identifySequenceWallet(program: Command, options: any) {
    let transactionHash = options.txn;
    let network = options.network;

    if (!transactionHash) {
        transactionHash = await input({
            message: 'Provide the transaction hash'
        })
    }

    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
        })
    }

    const chainConfig = findSupportedNetwork(network);

    if (chainConfig === undefined) {
        program.error(`Unsupported network ${network}, please select a valid network`)
    }

    let nodeUrl = chainConfig.rpcUrl

    if (options.projectAccessKey) {
        nodeUrl += "/" + options.projectAccessKey
    }
    
    if (options.verbose) {
        console.log(`Using node URL: ${nodeUrl}`)
    }
  
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const txReceipt = await provider.getTransactionReceipt(transactionHash);

    if (!txReceipt) {
        program.error("Transaction not found");
    }

    // Filter logs to find TxExecuted event log, ignoring logs with the GUEST_MODULE_ADDRESS
    const txExecutedLog = txReceipt.logs.find(
        (log) => log.topics[0] === TXN_EXECUTED_LOG_TOPIC && log.address !== GUEST_MODULE_ADDRESS
    );

    if (!txExecutedLog) {
        program.error("Sequence Wallet not found in the transaction logs");
    }

    console.log(`Transaction Origin (Relayer): ${txReceipt.from}`);
    console.log(`Sequence Wallet Address: ${txExecutedLog.address}`);
}
