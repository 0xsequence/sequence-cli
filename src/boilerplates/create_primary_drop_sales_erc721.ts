
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { Command } from "commander";
import { addDevToWranglerConfig, addVarsToWranglerConfig, cliConsole, executePromptWithRetry, promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForJwtAccessKeyWithLogs, promptForKeyWithLogs, promptForProjectAccessKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile, writeToWranglerEnvFile } from "../utils";
import { EnvKeys, PromptForKeysWithLogsOptions } from "../utils/types";
import shell from "shelljs";

async function promptForPasswordWithLogs(
    password: string | undefined,
    options: PromptForKeysWithLogsOptions = { allowEmptyInput: true },
): Promise<string | undefined> {
    const logsArray = [
        "Please create a password for your API; you will be able to modify it later.",
    ];

    if (options.allowEmptyInput) {
        logsArray.push("To skip and use the default password, press enter.")
    }
    
    return await executePromptWithRetry(
        promptForKeyWithLogs,
        { key: password, inputMessage: "Password for your API:" },
        logsArray,
        options
    );
}

const PRIMARY_DROP_SALES_ERC721_REPO_URL = "https://github.com/0xsequence/primary-drop-sale-721-boilerplate";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createPrimaryDropSalesErc721(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;
    let password;
    let jwtAccessKey;

    cliConsole.sectionTitle("Initializing creation process for Primary Drop Sales ERC721 boilerplate 🚀");

    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey, { allowEmptyInput: false });
    googleClientId = await promptForGoogleClientIdWithLogs(googleClientId, { allowEmptyInput: true });
    appleClientId = await promptForAppleClientIdWithLogs(appleClientId, { allowEmptyInput: true });
    walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId, { allowEmptyInput: true });
    projectAccessKey = await promptForProjectAccessKeyWithLogs(projectAccessKey, { allowEmptyInput: false });
    jwtAccessKey = await promptForJwtAccessKeyWithLogs(jwtAccessKey, { allowEmptyInput: false });
    password = await promptForPasswordWithLogs(password, { allowEmptyInput: false });
    
    if (projectAccessKey) {
        builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
        if (!builderProjectId) {
            console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
            process.exit();
        }
    }
    
    
    cliConsole.loading("Cloning the repo to `primary-drop-sales-erc721-boilerplate`");

    shell.exec(`git clone ${PRIMARY_DROP_SALES_ERC721_REPO_URL} primary-drop-sales-erc721-boilerplate`, { silent: !options.verbose });
    
    shell.cd("primary-drop-sales-erc721-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    cliConsole.loading("Configuring your project");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    const envKeys: EnvKeys = {
        "VITE_WAAS_CONFIG_KEY": waasConfigKey || undefined,
        "VITE_PROJECT_ACCESS_KEY": projectAccessKey || undefined,
        "VITE_GOOGLE_CLIENT_ID": googleClientId || undefined,
        "VITE_APPLE_CLIENT_ID": appleClientId || undefined,
        "VITE_WALLET_CONNECT_ID": walletConnectId || undefined,
        "VITE_PROJECT_ID": builderProjectId?.toString() || undefined,
    };

    writeToEnvFile(envKeys, options);
    writeDefaultKeysToEnvFileIfMissing(envExampleLines, envKeys, options);

    const wranglerGlobalConfig: EnvKeys = {
        "compatibility_date": "2024-09-25",
        "pages_build_output_dir": "./dist",
        "name": "primary-drop-sale-boilerplate-721",
    }

    const envKeysWrangler: EnvKeys = {
        "JWT_ACCESS_KEY": jwtAccessKey || undefined,
        "PROJECT_ID": builderProjectId?.toString() || undefined,
        "PROJECT_ACCESS_KEY": projectAccessKey?.toString() || undefined,
        "PASSWORD": password?.toString() || undefined,
    };

    const portWrangler: EnvKeys = {
        "port": "4445",
    };

    const wranglerConfigPath = "wrangler.toml";

    writeToWranglerEnvFile(wranglerGlobalConfig, { ...options, pathToWrite: wranglerConfigPath });

    // [vars]
    addVarsToWranglerConfig(wranglerConfigPath, options.verbose);
    writeToWranglerEnvFile(envKeysWrangler, { ...options, pathToWrite: wranglerConfigPath });

    // [dev]
    addDevToWranglerConfig(wranglerConfigPath, options.verbose);
    writeToWranglerEnvFile(portWrangler, { ...options, pathToWrite: wranglerConfigPath });
    
    cliConsole.loading("Installing dependencies");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    cliConsole.done("Primary Drop Sales ERC721 boilerplate created successfully!");

    cliConsole.done(`Great! Now you can test the project with your Embedded Wallet. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    
    cliConsole.loading("Starting development server");
    
    shell.exec(`pnpm dev`, { silent: false });
}