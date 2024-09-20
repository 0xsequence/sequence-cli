
import { input, select } from "@inquirer/prompts";
import { Command } from "commander";
import { promptUserKeyCustomizationDecision } from "../utils";

import shell from "shelljs";

const MARKETPLACE_BOILERPLATE_REPO_URL = "https://github.com/0xsequence/marketplace-boilerplate/";

export async function createMarketplaceBoilerplate(program: Command, options: any) {
    let walletType = options.walletType;
    let waasConfigKey = options.waasConfigKey;
    let projectAccessKey = options.projectAccessKey;
    let googleClientId = options.googleClientId;
    let projectId = options.projectId;

    if (!walletType) {
        walletType = await select({
            message:
                "Please provide the Wallet Type for your project.\nYou can use 'waas' for Embedded Wallet and 'universal' for Universal Wallet.\nFor more information on wallet types: https://docs.sequence.xyz/solutions/wallets/overview",
            choices: [
                {
                    name: "waas",
                    value: "waas",
                },
                {
                    name: "universal",
                    value: "universal",
                },
            ],
        });
    }

    const userWantsToConfigureTheirKeys = await promptUserKeyCustomizationDecision();

    if (userWantsToConfigureTheirKeys) {
        {
            if (!projectAccessKey) {
                console.log("Please provide the Project Access Key for your project.");
                console.log("Your access key can be found at https://sequence.build under the project settings.");
                console.log("To skip and use the default test access key, press enter.");
         
                projectAccessKey = await input({
                    message: "Project Access Key:",
                });
        
                console.log("");
            }
        
            if (!projectId) {
                console.log("Please provide the Project ID from your project.");
                console.log("Your Project ID can be found in the URL within https://sequence.build, either in the cards of your projects or by entering one of the projects where it can also be found in the URL.");
                console.log("To skip and use the default test projectId, press enter.");
         
                projectId = await input({
                    message: "Project ID:",
                });
        
                console.log("");
            }
        
            if (walletType === "waas") {
                if (!waasConfigKey) {
                    console.log("Please provide the WaaS Config Key for your project.");
                    console.log("Your config key can be found at https://sequence.build under the embedded wallet settings.");
                    console.log("To skip and use the default test config key, press enter.");
             
                    waasConfigKey = await input({
                        message: "WaaS Config Key:",
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
            }
        }
    }

    console.log("Cloning the repo to `marketplace-boilerplate`...");

    shell.exec(`git clone ${MARKETPLACE_BOILERPLATE_REPO_URL} marketplace-boilerplate`, { silent: !options.verbose });
    
    shell.cd("marketplace-boilerplate");
    shell.exec(`touch .env`, { silent: !options.verbose });

    console.log("Configuring your project...");

    const envExampleContent = shell.cat('.env.example').toString();
    const envExampleLines = envExampleContent.split('\n');

    for (let i = 0; i < envExampleLines.length; i++) {
        const isValidEnv = !envExampleLines[i].split(" ").join().startsWith("#");
        if (!isValidEnv || envExampleLines[i].trim() === "") {
            continue;
        } else if (walletType === "waas") {
            if (userWantsToConfigureTheirKeys === false && [
                  "NEXT_PUBLIC_WALLET_TYPE=",
                  "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=",
                  "NEXT_PUBLIC_SEQUENCE_PROJECT_ID=",
                  "NEXT_PUBLIC_WAAS_CONFIG_KEY=",
                  "NEXT_PUBLIC_GOOGLE_CLIENT_ID=",
                ].some((currentEnvironment) =>
                  envExampleLines[i].includes(currentEnvironment)
                )
              ) {
                shell.exec(`echo ${envExampleLines[i]} >> .env`, {
                  silent: !options.verbose,
                })
            }
              else if (envExampleLines[i].includes('NEXT_PUBLIC_WALLET_TYPE') && walletType === "waas") {
                shell.exec(`echo NEXT_PUBLIC_WALLET_TYPE=${walletType} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_SEQUENCE_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
                shell.exec(`echo NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_SEQUENCE_PROJECT_ID') && projectId != '' && projectId != undefined) {
                shell.exec(`echo NEXT_PUBLIC_SEQUENCE_PROJECT_ID=${projectId} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_WAAS_CONFIG_KEY') && waasConfigKey != '') {
                shell.exec(`echo NEXT_PUBLIC_WAAS_CONFIG_KEY=${waasConfigKey} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID') && googleClientId != '' && googleClientId != undefined) {
                shell.exec(`echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=${googleClientId} >> .env`, { silent: !options.verbose });
            } else if (
                [
                  "NEXT_PUBLIC_WALLET_TYPE=",
                  "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=",
                  "NEXT_PUBLIC_SEQUENCE_PROJECT_ID=",
                  "NEXT_PUBLIC_WAAS_CONFIG_KEY=",
                  "NEXT_PUBLIC_GOOGLE_CLIENT_ID=",
                ].some((currentEnvironment) => envExampleLines[i].includes(currentEnvironment))
              )
              { shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose }); }
        } else if (walletType === "universal") {
            if (userWantsToConfigureTheirKeys === false && ["NEXT_PUBLIC_WALLET_TYPE=", "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=", "NEXT_PUBLIC_SEQUENCE_PROJECT_ID="].some(currentEnvironment => envExampleLines[i].includes(currentEnvironment))) {
                shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_WALLET_TYPE') && walletType === "universal") {
                shell.exec(`echo NEXT_PUBLIC_WALLET_TYPE=${walletType} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_SEQUENCE_ACCESS_KEY') && projectAccessKey != '' && projectAccessKey != undefined) {
                shell.exec(`echo NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=${projectAccessKey} >> .env`, { silent: !options.verbose });
            } else if (envExampleLines[i].includes('NEXT_PUBLIC_SEQUENCE_PROJECT_ID') && projectId != '' && projectId != undefined) {
                shell.exec(`echo NEXT_PUBLIC_SEQUENCE_PROJECT_ID=${projectId} >> .env`, { silent: !options.verbose });
            } else if (["NEXT_PUBLIC_WALLET_TYPE=", "NEXT_PUBLIC_SEQUENCE_ACCESS_KEY=", "NEXT_PUBLIC_SEQUENCE_PROJECT_ID="].some(currentEnvironment => envExampleLines[i].includes(currentEnvironment))) {
                shell.exec(`echo ${envExampleLines[i]} >> .env`, { silent: !options.verbose });
            }
        }
    }
    
    console.log("Installing dependencies...");
    
    shell.exec(`pnpm install`, { silent: !options.verbose });

    console.log("Marketplace boilerplate created successfully! 🚀");
    console.log("Starting development server...");

    shell.exec(`pnpm dev`, { silent: false });
}