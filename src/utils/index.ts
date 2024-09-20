import { Wallet } from 'ethers'
import { select } from '@inquirer/prompts';

export function isValidPrivateKey(privateKey: string) {
    try {
        new Wallet(privateKey);
        return true;
    } catch (error) {
        return false;
    }
}

export async function promptUserKeyCustomizationDecision () : Promise<boolean> {
    return await select({
        message:
          "Would you like to use test configuration keys for testing, or customize your configuration keys?",
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