
import { Command } from "commander";
import { promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForKeyWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, promptUserKeyCustomizationDecision, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const GOOGLE_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence-demos/google-embedded-wallet-react-boilerplate";

export async function createGoogleEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();
    
    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
    }

    console.log("Cloning the repo to `google-embedded-wallet-react-boilerplate`...");

    shell.exec(`git clone ${GOOGLE_EMBEDDED_WALLET_REACT_REPO_URL} google-embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("google-embedded-wallet-react-boilerplate");

    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Google Authenticated Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}