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
import { createPrimaryDropSalesErc721 } from "./create_primary_drop_sales_erc721";
import { createPrimarySalesErc1155 } from "./create_primary_sales_erc1155";
import { createSequencePay } from "./create_sequence_pay";
import { createTelegramKitEmbeddedWalletReact } from "./create_kit_telegram_embedded_wallet_react";
import { createAllowlistStarter } from "./allowlist-starter";
import { createCryptoOnramp } from "./create_crypto_onramp";

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
        "--chains <chains>",
        "Chain names to be used, separated by commas. Example: 'arbitrum-sepolia,mainnet'"
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

    comm
        .command("create-primary-drop-sales-erc721-starter")
        .description("Clone a starter boilerplate for NFT Drops using primary sales for NFTs ERC721, integrated with Sequence Kit and Embedded Wallet, using React")
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
        "--chains <chains> chains",
        "List of the available chains for your project"
        )
        .option(
        "--default-chain <default_chain> defaultChain",
        "Default chain for your project"
        )
        .option(
        "--sales-contract-address <sales_contract_address> salesContractAddress",
        "Sales Contract Address for your project"
        )
        .option(
        "--nft-token-address <nft-token-address> nftTokenAddress",
        "Nft Token Address linked to your Primary Sales Contract"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createPrimaryDropSalesErc721(program, options);
        });

    comm
        .command("create-telegram-kit-embedded-wallet-react-starter")
        .description("Clone a starter boilerplate for telegram, integrated with Sequence Kit and Embedded Wallet, using React")
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
        "--bot-token <bot_token>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--bot-secret <bot_secret>",
        "Wallet Connect ID to be used during authentication"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createTelegramKitEmbeddedWalletReact(program, options);
        });

    comm
        .command("create-sequence-pay-starter")
        .description("Clone a starter boilerplate for Sequence Pay, integrated with Sequence Kit and Embedded Wallet, using React")
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
            createSequencePay(program, options);
        });

    comm
        .command("create-allowlist-starter")
        .description("Clone a starter boilerplate for allowlist, integrated with Sequence Kit and Embedded Wallet or Universal Wallet, using React")
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
        "--audience-id <audience_id>",
        "Audience ID"
        )
        .option(
        "--chain-id <chain_id>",
        "Chain ID to be used"
        )
        .option(
        "--verbose",
        "Show additional information in the output"
        )
        .action((options) => {
            createAllowlistStarter(program, options);
        });

    comm
        .command("create-crypto-onramp-starter")
        .description("Clone a starter boilerplate for Crypto Onramp integrated with Embedded Wallet, using React")
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
            createCryptoOnramp(program, options);
        });


    return comm;
}