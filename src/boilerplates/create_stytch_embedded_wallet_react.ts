
import { Command } from "commander";
import { promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForStytchWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const STYTCH_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence-demos/stytch-embedded-wallet-react-boilerplate/";

export async function createStytchEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let stytchPublicToken = options.stytchPublicToken;

    const userWantsToConfigureTheirKeys = false
    
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        stytchPublicToken = await promptForStytchWithLogs(stytchPublicToken);
    }

    console.log("Cloning the repo to `stytch-embedded-wallet-react-boilerplate`...");

    shell.exec(`git clone ${STYTCH_EMBEDDED_WALLET_REACT_REPO_URL} stytch-embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("stytch-embedded-wallet-react-boilerplate");

    
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_STYTCH_PUBLIC_TOKEN": stytchPublicToken || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Stytch Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}