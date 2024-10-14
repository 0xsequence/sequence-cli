import { Wallet } from "ethers";
import { select, input } from "@inquirer/prompts";
import { EnvKeys, EnvWriteOptions } from "./types";
import shell from "shelljs";

export function isValidPrivateKey(privateKey: string) {
    try {
        new Wallet(privateKey);
        return true;
    } catch (error) {
        return false;
    }
}

export async function promptUserKeyCustomizationDecision(): Promise<boolean> {
    return await select({
        message:
            "Would you like to use the default configuration keys for testing?",
        choices: [
            {
                name: "Use test keys",
                value: false,
            },
            {
                name: "I'll provide my own keys",
                value: true,
            },
        ],
    });
}

export async function promptForKeyWithLogs(
    prompt: { key: string | undefined; inputMessage: string },
    logs: string[]
): Promise<string | undefined> {
    if (!prompt.key) {
        logs.forEach((log) => console.log(log));
        const inputKey = await input({
            message: prompt.inputMessage,
        });
        console.log("");
        return inputKey || prompt.key;
    }
    return prompt.key;
}

export async function promptForProjectAccessKeyWithLogs(
    projectAccessKey: string | undefined
): Promise<string | undefined> {
    return await promptForKeyWithLogs(
        { key: projectAccessKey, inputMessage: "Project Access Key:" },
        [
            "Please provide the Project Access Key for your project.",
            "Your access key can be found at https://sequence.build under the project settings.",
            "To skip and use the default test access key, press enter.",
        ]
    );
}

export async function promptForWaaSConfigKeyWithLogs(
    waasConfigKey: string | undefined
): Promise<string | undefined> {
    return await promptForKeyWithLogs(
        { key: waasConfigKey, inputMessage: "WaaS Config Key:" },
        [
            "Please provide the WaaS Config Key for your project.",
            "Your config key can be found at https://sequence.build under the embedded wallet settings.",
            "To skip and use the default test config key, press enter.",
        ]
    );
}

export async function promptForGoogleClientIdWithLogs(
    googleClientId: string | undefined
): Promise<string | undefined> {
    return await promptForKeyWithLogs(
        { key: googleClientId, inputMessage: "Google Client ID:" },
        [
            "Please provide the Google Client ID for your project.",
            "Your client ID can be found at https://console.cloud.google.com/apis/credentials.",
            "To skip and use the default test client ID, press enter.",
        ]
    );
}

export async function promptForAppleClientIdWithLogs(
    appleClientId: string | undefined
): Promise<string | undefined> {
    return await promptForKeyWithLogs(
        { key: appleClientId, inputMessage: "Apple Client ID:" },
        [
            "Please provide the Apple Client ID for your project.",
            "Your client ID can be found at https://developer.apple.com/account/resources/identifiers/list/serviceId",
            "To skip and use the default test client ID, press enter.",
        ]
    );
}

export async function promptForWalletConnectIdWithLogs(
    walletConnectId: string | undefined
): Promise<string | undefined> {
    return await promptForKeyWithLogs(
        { key: walletConnectId, inputMessage: "Wallet Connect ID:" },
        [
            "Please provide the Wallet Connect ID for your project.",
            "To skip and use the default test client ID, press enter.",
        ]
    );
}

export function writeToEnvFile(envKeys: EnvKeys, options: EnvWriteOptions) {
    Object.entries(envKeys).forEach(([key, value]) => {
        if (value && value !== "") {
            shell.exec(
                `echo ${key}=${value} >> ${
                    options.pathToWrite ? options.pathToWrite : ".env"
                }`,
                { silent: !options.verbose }
            );
        }
    });
}

export function writeToWranglerEnvFile(envKeys: EnvKeys, options: EnvWriteOptions) {
    Object.entries(envKeys).forEach(([key, value]) => {
        if (value && value !== "") {
            shell.exec(
                `echo ${key} = ${value} >> ${
                    options.pathToWrite ? options.pathToWrite : "wrangler.toml"
                }`,
                { silent: !options.verbose }
            );
        }
    });
}

export function writeDefaultKeysToEnvFileIfMissing(
    envExampleLines: string[],
    envKeys: EnvKeys,
    options: EnvWriteOptions
) {
    const missingKeys = Object.entries(envKeys)
        .filter(([_, value]) => value === undefined || value === "")
        .map(([key, _]) => key);

    envExampleLines.forEach((line) => {
        if (missingKeys.some((key) => line.includes(key))) {
            shell.exec(
                `echo ${line} >> ${
                    options.pathToWrite ? options.pathToWrite : ".env"
                }`,
                { silent: !options.verbose }
            );
        }
    });
}
