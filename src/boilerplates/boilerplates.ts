import { Command } from "commander";
import { createServerSideTx } from "./create_server_side_transactions";
import { createEmbeddedWalletReact } from "./create_embedded_wallet_react";
import { createGoogleEmbeddedWalletReact } from './create_google_embedded_wallet_react'
import { createEmailEmbeddedWalletReact } from "./create_email_embedded_wallet_react"
import { createStytchEmbeddedWalletReact } from "./create_stytch_embedded_wallet_react"
import { createEmbeddedWalletNextjs } from "./create_embedded_wallet_nextjs";
import { createWalletLinkingEmbeddedWallet } from './create_wallet_linking_embedded_wallet_react'
import { createEmbeddedWalletVerifySession } from "./create_embedded_wallet_verify_session";
import { createUniversalWalletReact } from "./create_universal_wallet_react";
import { createPrimarySalesErc1155 } from "./create_primary_sales_erc1155";

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
        "--wallet-connect-id <wallet_connect_id>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletReact(program, options);
        })
    
    comm
        .command("create-google-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Google widget authenticated Sequence Embedded Wallet integrated with React")
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
            createGoogleEmbeddedWalletReact(program, options);
        })

    comm    
        .command("create-server-side-transactions")
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
            createServerSideTx(program, options);
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
        "--wallet-connect-id <wallet_connect_id>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createEmbeddedWalletNextjs(program, options);
        });

    comm
        .command("create-email-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for email authenticated Sequence Embedded Wallet integrated with React")
        .option(
        "--waas-config-key <waas_key>",
        "WaaS config key for this project"
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
            createEmailEmbeddedWalletReact(program, options);
        });

    comm
        .command("create-stytch-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for Stytch authenticated Sequence Embedded Wallet integrated with React")
        .option(
        "--waas-config-key <waas_key>",
        "WaaS config key for this project"
        )
        .option(
        "--project-access-key <access_key>",
        "Project access key for Sequence requests"
        )
        .option(
        "--stytch-public-token <stytch_public_token>",
        "Stytch Public Token for authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createStytchEmbeddedWalletReact(program, options);
        });
        
    comm
        .command("create-embedded-wallet-linking-starter")
        .description("Clone a starter boilerplate for Sequence Embedded wallet linking demo integrated with React")
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
        "--wallet-connect-id <wallet_connect_id>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createWalletLinkingEmbeddedWallet(program, options);
        })

    comm
        .command("create-embedded-wallet-verify-session-starter")
        .description("Clone a starter boilerplate for Sequence Embedded Wallet verification from a server-side application")
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

    comm
        .command("create-universal-wallet-starter")
        .description("Clone a boilerplate for Sequence Universal Wallet")
        .option(
        "--project-access-key <access_key>",
        "Project access key for Sequence requests"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createUniversalWalletReact(program, options);
        });

    comm
        .command("create-primary-sales-erc1155-starter")
        .description("Clone a starter boilerplate for Primary Sales integrated with WaaS")
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
        "--wallet-connect-id <wallet_connect_id>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createPrimarySalesErc1155(program, options);
        });

    return comm;
}