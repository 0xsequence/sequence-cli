import { Command } from "commander";
import { input, password, number } from "@inquirer/prompts";
import { ethers } from "ethers";
import { findSupportedNetwork } from '@0xsequence/network';

import { ERC1155_ABI } from "../abi/ERC_1155";
import { Orderbook_ABI } from "../abi/Orderbook";


const SEQUENCE_MARKETPLACE_V1_ADDRESS = "0xB537a160472183f2150d42EB1c3DD6684A55f74c";

export async function createListings(program: Command, options: any) {
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
        message:
          "Enter either a well known currency code (USDC, MATIC, etc.) or a token address",
      });
    }
  
    if (!price) {
      price = await input({
        message: "Enter the price per token, in the currency specified",
      });
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
  
    const provider = new ethers.JsonRpcProvider(nodeUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
  
    console.log(`Using EOA Wallet: ${wallet.address}`);
    console.log("Collection Address:", collectionAddress);
  
    console.log("Currency token address:", currency);
  
    const collectionContract = new ethers.Contract(
      collectionAddress,
      ERC1155_ABI,
      wallet
    );
  
    console.log("tokenId", tokenId);
  
    const balance = await collectionContract.balanceOf(wallet.address, tokenId);
    console.log("balance", balance.toString());
  
    let isApprovedForAll = false;
  
    try {
      isApprovedForAll = await collectionContract.isApprovedForAll(
        wallet.address,
        SEQUENCE_MARKETPLACE_V1_ADDRESS
      );
    } catch (error) {
      console.dir(error, { depth: null });
      program.error("Error checking approval.");
    }
  
    if (!isApprovedForAll) {
      const approveTxn = getErc1155ApproveAllTransaction(
        collectionAddress,
        SEQUENCE_MARKETPLACE_V1_ADDRESS
      );
  
      try {
        const res = await wallet.sendTransaction(approveTxn);
        console.log(`Approve transaction sent: ${res.hash}`);
  
        const receipt = await res.wait();
        console.dir(receipt, { depth: null });
      } catch (error) {
        console.dir(error, { depth: null });
        program.error("Error processing transaction, please try again.");
      }
    }
  
    const sequenceMarketplaceInterface = new ethers.Interface(Orderbook_ABI);
  
    const dataCreateRequest = sequenceMarketplaceInterface.encodeFunctionData(
      "createRequest",
      [
        {
          isListing: true,
          isERC1155: true,
          tokenContract: ethers.hexlify(collectionAddress),
          tokenId: BigInt(tokenId),
          quantity: BigInt(quantity),
          expiry: BigInt(
            Math.floor(new Date().getTime() / 1000) +
              options.expireIn * 24 * 60 * 60
          ),
          currency: ethers.hexlify(currency),
          pricePerToken: ethers.parseUnits(price, 6),
        },
      ]
    );
  
    const txn = {
      to: SEQUENCE_MARKETPLACE_V1_ADDRESS,
      data: dataCreateRequest,
    };
  
    try {
      const res = await wallet.sendTransaction(txn);
      console.log(`Create request transaction sent: ${res.hash}`);
  
      const receipt = await res.wait();
      console.dir(receipt, { depth: null });
    } catch (error) {
      console.dir(error, { depth: null });
      program.error("Error processing transaction, please try again.");
    }
  }
  
  const getErc1155ApproveAllTransaction = (
    tokenAddress: string,
    spender: string
  ): ethers.TransactionRequest => {
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
}
