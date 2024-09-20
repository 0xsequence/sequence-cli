
import { extractProjectIdFromAccessKey } from "@0xsequence/utils";
import { input } from "@inquirer/prompts";
import { Command } from "commander";
import { promptUserKeyCustomizationDecision } from "../utils";

import shell from "shelljs";

const PRIMARY_DROP_SALE_REPO_URL = "https://github.com/0xsequence/primary-drop-sale-boilerplate/";
const SEQUENCE_DOCS_URL = "https://docs.sequence.xyz/";

export async function createPrimaryDropSale(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;
    let walletConnectId = options.walletConnectId;
    let builderProjectId;

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();

    if (userWantsToConfigureTheirKeys) {
        if (!waasConfigKey) {
            console.log("Please provide the WaaS Config Key for your project.");
            console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
            console.log("To skip and use the default test config key, press enter.");
     
            waasConfigKey = await input({
                message: "WaaS Config Key:",
            });
    
            console.log("");
        }
    
        if (!projectAccessKey) {
            console.log("Please provide the Project Access Key for your project.");
            console.log("Your access key can be found at https://sequence.build under the project settings.");
            console.log("To skip and use the default test access key, press enter.");
     
            projectAccessKey = await input({
                message: "Project Access Key:",
            });
    
            console.log("");
        }
    
        if (!googleClientId) {
            console.log("Please provide the Google Client ID for your project.");
            console.log("Your client ID can be found at https://console.cloud.google.com/apis/credentials");
            console.log("To skip and use the default test client ID, press enter.");
     
            googleClientId = await input({
                message: "Google Client ID:",
            });
    
            console.log("");
        }
    
        if (!appleClientId) {
            console.log("Please provide the Apple Client ID for your project.");
            console.log("Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId");
            console.log("To skip and use the default test client ID, press enter.");
     
            appleClientId = await input({
                message: "Apple Client ID:",
            });
    
            console.log("");
        }
    
        if (!walletConnectId) {
            console.log("Please provide the Wallet Connect ID for your project.");
            console.log("Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId");
            console.log("To skip and use the default test client ID, press enter.");
     
            walletConnectId = await input({
                message: "Wallet Connect ID:",
            });
    
            console.log("");
        }
        
        if (projectAccessKey) {
            builderProjectId = extractProjectIdFromAccessKey(projectAccessKey);
            if (!builderProjectId) {
                console.log("Invalid Project Access Key provided. Please provide a valid Project Access Key.");
                process.exit();
            }
        }
    }
    
    console.log("Cloning the repo to `primary-drop-sale-boilerplate`...");

    shell.exec(`git clone ${PRIMARY_DROP_SALE_REPO_URL} primary-drop-sale-boilerplate`, { silent: !options.verbose });
    
    shell.cd("primary-drop-sale-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '' && waasConfigKey != undefined) {
            shell.exec(`echo VITE_WAAS_CONFIG_KEY=${waasConfigKey} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo VITE_PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_GOOGLE_CLIENT_ID') && googleClientId != '' && googleClientId != undefined) {
            shell.exec(`echo VITE_GOOGLE_CLIENT_ID=${googleClientId} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_APPLE_CLIENT_ID') && appleClientId != '' && appleClientId != undefined) {
            shell.exec(`echo VITE_APPLE_CLIENT_ID=${appleClientId} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_WALLET_CONNECT_ID') && walletConnectId != '' && walletConnectId != undefined) {
            shell.exec(`echo VITE_WALLET_CONNECT_ID=${walletConnectId} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_PROJECT_ID') && builderProjectId?.toString() != '' && builderProjectId?.toString() != undefined) {
            shell.exec(`echo VITE_PROJECT_ID=${builderProjectId?.toString()} >> .env`, { silent: !options.verbose });
        } else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Primary Drop Sale boilerplate created successfully! 🚀");

    console.log(`Great! Now you can test the project with your WaaS. If you want to take it to the next level by using your own Primary Sales Contracts in the project, go to the following link and we can set it up: ${SEQUENCE_DOCS_URL}guides/primary-sales`);
    
    console.log("Starting development server...");
    
    shell.exec(`pnpm dev`, { silent: false });
}