
import { input } from "@inquirer/prompts";
import { Command } from "commander";

import shell from "shelljs";


const EMBEDDED_WALLET_REACT_REPO_URL = "https://github.com/0xsequence/kit-embedded-wallet-react-boilerplate/";


export async function createEmbeddedWalletReact(program: Command, options: any) {
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let appleClientId = options.appleClientId;

    if (!waasConfigKey) {
        console.log("Please provide the WaaS Config Key for your project.");
        console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
        console.log("To skip and use the default test config key, press enter.");
 
        waasConfigKey = await input({
            message: "WaaS Config Key:",
        });

        console.log("");
    }

    if (!projectAccessKey && waasConfigKey != '') {
        console.log("Please provide the Project Access Key for your project.");
        console.log("Your access key can be found at https://sequence.build under the project settings.");
        console.log("To skip and use the default test access key, press enter.");
 
        projectAccessKey = await input({
            message: "Project Access Key:",
        });

        console.log("");
    }

    if (!googleClientId && waasConfigKey != '') {
        console.log("Please provide the Google Client ID for your project.");
        console.log("Your client ID can be found at https://console.cloud.google.com/apis/credentials");
        console.log("To skip and use the default test client ID, press enter.");
 
        googleClientId = await input({
            message: "Google Client ID:",
        });

        console.log("");
    }

    if (!appleClientId && waasConfigKey != '') {
        console.log("Please provide the Apple Client ID for your project.");
        console.log("Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId");
        console.log("To skip and use the default test client ID, press enter.");
 
        appleClientId = await input({
            message: "Apple Client ID:",
        });

        console.log("");
    }

    console.log("Cloning the repo to `embedded-wallet-react-boilerplate`...");

    shell.exec(`git clone ${EMBEDDED_WALLET_REACT_REPO_URL} embedded-wallet-react-boilerplate`, { silent: !options.verbose });
    
    shell.cd("embedded-wallet-react-boilerplate");

    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    for (let i = 0; i < envExampleLines.length; i++) {
        if (envExampleLines[i].includes('VITE_WAAS_CONFIG_KEY') && waasConfigKey != '') {
            shell.exec(`echo VITE_WAAS_CONFIG_KEY=${waasConfigKey} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_PROJECT_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
            shell.exec(`echo VITE_PROJECT_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_GOOGLE_CLIENT_ID') && googleClientId != '' && googleClientId != undefined) {
            shell.exec(`echo VITE_GOOGLE_CLIENT_ID=${googleClientId} >> .env`, { silent: !options.verbose });
        } else if (envExampleLines[i].includes('VITE_APPLE_CLIENT_ID') && appleClientId != '' && appleClientId != undefined) {
            shell.exec(`echo VITE_APPLE_CLIENT_ID=${appleClientId} >> .env`, { silent: !options.verbose });
        } else {
            shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
        }
    }

    console.log("Embedded Wallet React boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}