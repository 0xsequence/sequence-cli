import { Wallet } from 'ethers'

export function isValidPrivateKey(privateKey: string) {
    try {
        new Wallet(privateKey);
        return true;
    } catch (error) {
        return false;
    }
}