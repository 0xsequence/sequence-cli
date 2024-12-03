import { Command } from "commander";
import {
    addDevToWranglerConfig,
    addVarsToWranglerConfig,
    checkIfDirectoryExists,
    cliConsole,
    executePromptWithRetry,
    promptForAppleClientIdWithLogs,
    promptForGoogleClientIdWithLogs,
    promptForKeyWithLogs,
    promptForProjectAccessKeyWithLogs,
    promptForWaaSConfigKeyWithLogs,
    writeDefaultKeysToEnvFileIfMissing,
    writeToEnvFile,
    writeToWranglerEnvFile,
} from '../utils';
import { EnvKeys } from "../utils/types";

import shell from "shelljs";

const TELEGRAM_KIT_EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence-demos/telegram-kit-embedded-wallet-react-boilerplate";
const REPOSITORY_FILENAME = "telegram-kit-embedded-wallet-react-boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createTelegramKitEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let botToken = options.botToken;
    let botSecret = options.botSecret;
    let wranglerEnvName = "telegrambot";
    let compatibilityDate = "2024-03-25";
    let pagesBuildOutputDir = "./dist";
    let port = 4444;

    cliConsole.sectionTitle("Initializing creation process for Kit Telegram Embedded Wallet React boilerplate 🚀")

    const userWantsToConfigureTheirKeys = true;

    if (userWantsToConfigureTheirKeys) {
        waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey, { allowEmptyInput: false });
        projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey, { allowEmptyInput: false });
        googleClientId = await promptForGoogleClientIdWithLogs(googleClientId, { allowEmptyInput: false });
        appleClientId = await promptForAppleClientIdWithLogs(appleClientId, { allowEmptyInput: false });

        botToken = await executePromptWithRetry(
            promptForKeyWithLogs,
            {   key: botToken, inputMessage: 'Bot token:' },
            ['Bot token to access the HTTP API.'],
            { allowEmptyInput: false }
        );

        botSecret = await executePromptWithRetry(
            promptForKeyWithLogs,
            {   key: botSecret, inputMessage: 'Bot secret:' },
            ['Enter a random value of your choice. This value should be unique and generated by you.'],
            { allowEmptyInput: false }
        );
    }

    cliConsole.loading(`Cloning the repo to '${REPOSITORY_FILENAME}'`);

    shell.exec(`git clone ${TELEGRAM_KIT_EMBEDDED_WALLET_REACT_REPO_URL} ${REPOSITORY_FILENAME}`, { silent: !options.verbose });

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
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);
    
    const wranglerConfigPath = "wrangler.toml";
    
    const globalConfigWrangler: EnvKeys = {
        "name": wranglerEnvName || undefined,
        "compatibility_date": compatibilityDate || undefined,
        "pages_build_output_dir": pagesBuildOutputDir || undefined,
    };

    const envKeysWrangler: EnvKeys = {
        "BOT_TOKEN": botToken || undefined,
        "BOT_SECRET": botSecret || undefined,
    };

    const portWrangler: EnvKeys = {
        "port": port || 4444,
    }

    writeToWranglerEnvFile(globalConfigWrangler, { verbose: !options.verbose, pathToWrite: wranglerConfigPath });
    addVarsToWranglerConfig(wranglerConfigPath, !options.verbose);
    writeToWranglerEnvFile(envKeysWrangler, { verbose: !options.verbose, pathToWrite: wranglerConfigPath });
    addDevToWranglerConfig(wranglerConfigPath, !options.verbose);
    writeToWranglerEnvFile(portWrangler, { verbose: !options.verbose, pathToWrite: wranglerConfigPath });

    cliConsole.loading("Installing dependencies");

    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done("Telegram Kit Embedded Wallet React boilerplate created successfully! 🚀");

    cliConsole.done(`Great! Now you can test the project with your WaaS. Here is the guide for the repository ${SEQUENCE_DOCS_URL}guides/telegram-integration/`);

    cliConsole.loading("Starting development server");

    shell.exec(`pnpm dev:vite`, { silent: false });
}