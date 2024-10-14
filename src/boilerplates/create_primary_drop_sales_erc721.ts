
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { Command } from "commander";
import { promptForAppleClientIdWithLogs, promptForGoogleClientIdWithLogs, promptForKeyWithLogs, promptForWaaSConfigKeyWithLogs, promptForWalletConnectIdWithLogs, writeDefaultKeysToEnvFileIfMissing, writeToEnvFile, writeToWranglerEnvFile } from "../utils";
import { EnvKeys } from "../utils/types";
import chalk from 'chalk';
import shell from "shelljs";

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

    waasConfigKey = await promptForWaaSConfigKeyWithLogs(waasConfigKey);
    googleClientId = await promptForGoogleClientIdWithLogs(googleClientId);
    appleClientId = await promptForAppleClientIdWithLogs(appleClientId);
    walletConnectId = await promptForWalletConnectIdWithLogs(walletConnectId);

    projectAccessKey = await promptForKeyWithLogs(
        { key: projectAccessKey, inputMessage: "Project Access Key:" },
        [
            "Please provide the Project Access Key for your project.",
            "Your access key can be found at https://sequence.build under the project settings.",
        ]
    );

    if (!projectAccessKey) {
        console.log(chalk.red("You cannot leave projectAccessKey blank. Please try again."));
        return;
    }

    jwtAccessKey = await promptForKeyWithLogs(
        { key: jwtAccessKey, inputMessage: "JWT Access Key:" },
        ["To get your jwt access key follow the first step in https://docs.sequence.xyz/guides/metadata-guide/"]
    );

    if (!jwtAccessKey) {
        console.log(chalk.red("You cannot leave jwtAccessKey blank. Please try again."));
        return;
    }

    password = await promptForKeyWithLogs(
        { key: password, inputMessage: "Password for your API:" },
        ["Please create a password for your API; you will be able to modify it later."]
    );

    if (!password) {
        console.log(chalk.red("You cannot leave password blank. Please try again."));
        return;
    }
    
    if (projectAccessKey) {
        builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
        if (!builderProjectId) {
            console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
            process.exit();
        }
    }
    
    
    console.log("Cloning the repo to `primary-drop-sales-721-boilerplate`...");

    shell.exec(`git clone ${PRIMARY_DROP_SALES_ERC721_REPO_URL} primary-drop-sales-721-boilerplate`, { silent: !options.verbose });
    
    shell.cd("primary-drop-sales-721-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

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
    
    shell.exec(
        `echo [vars] >> ${wranglerConfigPath}`,
        { silent: !options.verbose }
    );
    writeToWranglerEnvFile(envKeysWrangler, { ...options, pathToWrite: wranglerConfigPath });

    shell.exec(
        `echo [dev] >> ${wranglerConfigPath}`,
        { silent: !options.verbose }
    );
    writeToWranglerEnvFile(portWrangler, { ...options, pathToWrite: wranglerConfigPath });
    
    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("NFT Drop boilerplate created successfully! 🚀");

    console.log(`Great! Now you can test the project with your WaaS. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    
    console.log("Starting development server...");
    
    shell.exec(`pnpm dev`, { silent: false });
}