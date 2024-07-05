#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import { input, password, number } from "@inquirer/prompts";
import { ethers } from "ethers";

import figlet from "figlet";
import { ERC1155_ABI } from "./abi/ERC_1155";
import { Orderbook_ABI } from "./abi/Orderbook";

const SEQUENCE_MARKETPLACE_V1_ADDRESS =
  "0xB537a160472183f2150d42EB1c3DD6684A55f74c";

console.log(figlet.textSync("Sequence"));
console.log("");

const program = new Command();

program
  .version("0.1.0", "-v, --version", "Display the current version")
  .action(() => {
    program.help();
  });

async function createListings(options: any) {
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

  const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
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
};

function makeCommandMarketplace() {
  const comm = new Command("marketplace");

  comm.action(() => {
    comm.help();
  });

  comm
    .command("create-listings")
    .option(
      "-k, --key <private_key>",
      "Private key for the wallet that holds the tokens"
    )
    .option(
      "-a, --address <collection_address>",
      "Address of the collection contract"
    )
    .option("-t, --token <token_id>", "ID for the token to be listed", parseInt)
    .option(
      "-n, --network <network>",
      "Network to be used (mainnet, polygon, etc.)"
    )
    .option(
      "-c, --currency <currency>",
      "Either a well known currency code (USDC, MATIC, etc.) or a token address"
    )
    .option("-p, --price <price>", "Price per token, in the currency specified")
    .option(
      "-q, --quantity <quantity>",
      "Number of tokens to be listed",
      parseInt,
      1
    )
    .option(
      "--expire-in <expiry_time>",
      "Days to expiry for the listing",
      parseInt,
      7
    )
    .option(
      "--project-access-key <access_key>",
      "Project access key for Sequence requests"
    )
    .action((options) => {
      createListings(options);
    });

  return comm;
}

program.addCommand(makeCommandMarketplace());

program.parse(process.argv);
