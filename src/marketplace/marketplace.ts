import { Command } from "commander";
import { createListings } from "./create_listings";


export function makeCommandMarketplace(program: Command) {
    const comm = new Command("marketplace");

    comm.action(() => {
        comm.help();
    });

    comm
        .command("create-listings")
        .description("Create listings for tokens in your wallet using the Sequence Marketplace contract")
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
            "Address for the currency token to be used for the listing"
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
        .option(
            "--verbose",
            "Show additional information in the output"
        )
        .action((options) => {
            createListings(program, options);
        });

    return comm;
}
