import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { findSupportedNetwork } from "@0xsequence/network";
import shell from "shelljs";
import { createTxManager } from "./create_tx_manager";
import { createEmbeddedWalletReact } from "./create_embedded_wallet_react";
import { createEmbeddedWalletNextjs } from "./create_embedded_wallet_nextjs";
import { createEmbeddedWalletVerifySession } from "./create_embedded_wallet_verify_session";

export function makeCommandBoilerplates(program: Command) {
    const comm = new Command("boilerplates");

    comm.action(() => {
        comm.help();
    });

    comm
        .command("create-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with React")
        .option(
            "--waas-config-key <waas_key>",
            "WaaS config key for this project"
        )
        .option(
            "--project-access-key <access_key>",
            "Project access key for Sequence requests"
        )
        .option(
            "--google-client-id <google_client_id>",
            "Google client ID to be used during authentication"
        )
        .option(
            "--apple-client-id <apple_client_id>",
            "Apple client ID to be used during authentication"
        )
        .option(
            "--verbose",
            "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletReact(program, options);
        })

    comm    
        .command("create-tx-manager")
        .description("Create a server that has the ability to mint collectibles based on parameters")
        .option(
            "-k, --key <private_key>",
            "Private key for the wallet that holds the tokens"
        )
        .option(
            "-pak, --project-access-key <access_key>",
            "Project access key for Sequence requests"
        )
        .option(
            "--verbose",
            "Show additional information in the output"
        )
        .action((options) => {
            createTxManager(program, options);
        })

    comm
        .command("create-kit-embedded-wallet-nextjs-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with Sequence Kit and Next.js")
        .option(
        "--waas-config-key <waas_key>",
        "WaaS config key for this project"
        )
        .option(
        "--project-access-key <access_key>",
        "Project access key for Sequence requests"
        )
        .option(
        "--google-client-id <google_client_id>",
        "Google client ID to be used during authentication"
        )
        .option(
        "--apple-client-id <apple_client_id>",
        "Apple client ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletNextjs(program, options);
        });

    comm
        .command("create-embedded-wallet-verify-session-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet integrated with Sequence Kit and Next.js")
        .option(
        "--waas-config-key <waas_key>",
        "WaaS config key for this project"
        )
        .option(
        "--project-access-key <access_key>",
        "Project access key for Sequence requests"
        )
        .option(
        "--google-client-id <google_client_id>",
        "Google client ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletVerifySession(program, options);
        });

    return comm;
}