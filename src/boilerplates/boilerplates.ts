import { Command } from "commander";
import { createEmbeddedWalletReact } from "./create_embedded_wallet_react";
import { createEmbeddedWalletNextjs } from "./create_embedded_wallet_nextjs";

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
        });

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

    return comm;
}
