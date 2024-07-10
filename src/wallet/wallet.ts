import { Command } from "commander";
import { createSingleSigner } from "./create_single_signer";


export function makeCommandWallet(program: Command) {
    const comm = new Command("wallet");

    comm.action(() => {
        comm.help();
    });

    comm
        .command("create-single-signer")
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
        .action((options) => {
            createSingleSigner(program, options);
        });

    return comm;
}