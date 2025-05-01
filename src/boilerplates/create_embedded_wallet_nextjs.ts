
import { Command } from "commander";
import { checkIfDirectoryExists, cliConsole, promptForAppleClientIdWithLogs, promptForChainsWithLogs, promptForGoogleClientIdWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const EMBEDDED_WALLET_NEXTJS_REPO_URL = "https://github.com/0xsequence-demos/kit-embedded-wallet-nextjs-boilerplate/";
const REPOSITORY_FILENAME = "kit-embedded-wallet-nextjs-boilerplate";
const REPOSITORY_REFERENCE = "Kit Embedded Wallet Nextjs boilerplate";

export async function createEmbeddedWalletNextjs(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let chains = options.chains;

    cliConsole.sectionTitle(`Initializing creation process for ${REPOSITORY_REFERENCE} 🚀`);

    const userWantsToConfigureTheirKeys = false

    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey);
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
        walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);
        chains = await promptForChainsWithLogs(chains);
    }

    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${EMBEDDED_WALLET_NEXTJS_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });
    
    const directoryExists = checkIfDirectoryExists(REPOSITORY_FILENAME);
    if (!directoryExists) {
        cliConsole.error("Repository cloning failed. Please try again.");
        return;
    }

    shell.cd(REPOSITORY_FILENAME);
    shell.exec(`touch .env`, { silent: !options.verbose });

    cliConsole.loading("Configuring your project");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "NEXT_PUBLIC_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "NEXT_PUBLIC_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "NEXT_PUBLIC_APPLE_CLIENT_ID": appleClientId || undefined,
        "NEXT_PUBLIC_WALLET_CONNECT_ID": walletConnectId || undefined,
        "NEXT_PUBLIC_CHAINS": chains || "arbitrum-sepolia",
    };

    if (envKeys.NEXT_PUBLIC_CHAINS) {
        const chainsArray = typeof envKeys.NEXT_PUBLIC_CHAINS === 'string' ? envKeys.NEXT_PUBLIC_CHAINS.split(',') : [];
        envKeys.NEXT_PUBLIC_DEFAULT_CHAIN = chainsArray[0].trim();
    }

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    cliConsole.loading("Installing dependencies");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done(`${REPOSITORY_REFERENCE} created successfully! 🚀`);
    cliConsole.loading("Starting development server");

    shell.exec(`pnpm dev`, { silent: false });
}