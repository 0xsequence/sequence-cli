
import { select } from "@inquirer/prompts";
import { Command } from "commander";
import { promptForGoogleClientIdWithLogs, promptForKeyWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys, WalletTypes } from "../utils/types";

import shell from "shelljs";

const MARKETPLACE_BOILERPLATE_REPO_URL = "https://github.com/0xsequence-demos/marketplace-boilerplate/";

export async function createMarketplaceBoilerplate(program: Command, options: any) {
    let walletType = options.walletType;
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let projectId = options.projectId;

    if (!walletType) {
        walletType = await select({
            message:
                "Please provide the Wallet Type for your project.\nFor more information on wallet types: https://docs.sequence.xyz/solutions/wallets/overview",
            choices: [
                {
                    name: "Embedded Wallet",
                    value: WalletTypes.EmbeddedWallet,
                },
                {
                    name: "Universal Wallet",
                    value: WalletTypes.UniversalWallet,
                },
            ],
        });
    }

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();

    if (userWantsToConfigureTheirKeys) {
        {
            projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);

            projectId = await promptForKeyWithLogs(
                { key: projectId, inputMessage: "Project ID:" },
                [
                    "Please provide the Project ID from your project.",
                    "Your Project ID can be found in the URL within https://sequence.build, either in the cards of your projects or by entering one of the projects where it can also be found in the URL.",
                    "To skip and use the default test projectId, press enter.",
                ]
            );
            
            if (walletType === WalletTypes.EmbeddedWallet) {
                waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
                googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);         
            }
        }
    }

    console.log("Cloning the repo to `marketplace-boilerplate`...");

    shell.exec(`git clone ${MARKETPLACE_BOILERPLATE_REPO_URL} marketplace-boilerplate`, { silent: !options.verbose });
    
    shell.cd("marketplace-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat(".env.example").toString();
    const envExampleLines = envExampleContent.split("\n");

    if (walletType === WalletTypes.EmbeddedWallet) {
        const envKeys: EnvKeys = {
            "NEXT_PUBLIC_WALLET_TYPE": walletType || undefined,
            "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY": projectAccessKey || undefined,
            "NEXT_PUBLIC_SEQUENCE_PROJECT_ID": projectId || undefined,
            "NEXT_PUBLIC_WAAS_CONFIG_KEY": waasConfigKey || undefined,
            "NEXT_PUBLIC_GOOGLE_CLIENT_ID": googleClientId || undefined,
        };

        writeToEnvFile(envKeys, options);
        writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    } else if (walletType === WalletTypes.UniversalWallet) {
        const envKeys: EnvKeys = {
            "NEXT_PUBLIC_WALLET_TYPE": walletType || undefined,
            "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY": projectAccessKey || undefined,
            "NEXT_PUBLIC_SEQUENCE_PROJECT_ID": projectId || undefined,
        };

        writeToEnvFile(envKeys, options);
        writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    }
    
    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Marketplace boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}