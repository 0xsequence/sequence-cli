import { Command } from "commander";
import { createSingleSigner } from "./create_single_signer";
import { identifySequenceWallet } from "./identify_sequence_wallet";


export function makeCommandWallet(program: Command) {
    const comm = new Command("wallet");

    comm.action(() => {
        comm.help();
    });

    comm
        .command("create-single-signer")
        .description("Generate a Sequence Wallet Single Signer using an EOA wallet (i.e. MetaMask)")
        .option(
            "-k, --key <private_key>",
            "Private key for the wallet that holds the tokens"
        )
        .option(
            "-n, --network <network>",
            "Network to be used (mainnet, polygon, etc.)"
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
            createSingleSigner(program, options);
        });

    comm
        .command("identify-sequence-wallet")
        .description("Identify Sequence Wallet address from a transaction hash")
        .option(
            "-t, --txn <txn>",
            "Transaction hash to be used"
        )
        .option(
            "-n, --network <network>",
            "Network to be used (mainnet, polygon, etc.)"
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
            identifySequenceWallet(program, options);
        });

    return comm;
}
