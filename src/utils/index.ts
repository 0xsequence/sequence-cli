import { Wallet } from 'ethers'
import { select, input } from '@inquirer/prompts';

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
  prompt: { key: string | undefined, inputMessage: string },
  logs: string[]
): Promise<string | undefined> {
  if (!prompt.key) {
      logs.forEach(log => console.log(log));
      const inputKey = await input({
          message: prompt.inputMessage,
      });
      console.log("");
      return inputKey || prompt.key;
  }
  return prompt.key;
}