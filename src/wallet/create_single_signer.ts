import { Command } from "commander";
import { password, input } from "@inquirer/prompts";
import { ethers } from "ethers";
import { Session } from '@0xsequence/auth';
import { findSupportedNetwork } from '@0xsequence/network';
import { isValidPrivateKey } from '../utils/'

export async function createSingleSigner(program: Command, options: any) {
    let privateKey = options.key;
    let network = options.network

    if (!privateKey) {
        privateKey = await password({
          message: "Enter the private key for an EOA wallet (i.e. MetaMask)",
        });
  
        if(!isValidPrivateKey(privateKey) && privateKey){
            console.log('Please input a valid EVM Private key')
            process.exit()
        }
  
        console.log("");
    }

    if (!network) {
        network = await input({
            message: 'Enter the network to be used (mainnet, polygon, etc.)'
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
    
    if (options.verbose) {
        console.log(`Using node URL: ${nodeUrl}`)
    }
  
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const session = await Session.singleSigner({
        signer: wallet,
        projectAccessKey: options.projectAccessKey,
    });
  
    console.log(`Your EOA Wallet: ${wallet.address}`);
    console.log(`Your Sequence Wallet Single Signer: ${session.account.address}`)
}
