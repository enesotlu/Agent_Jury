import { ethers } from "ethers";

// ─── Contract Config ────────────────────────────────────────────────────────
// Update CONTRACT_ADDRESS after deployment
export const CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

export const CHAIN_ID = 10143; // Monad Testnet
export const CHAIN_NAME = "Monad Testnet";
export const CHAIN_RPC = "https://testnet-rpc.monad.xyz";
export const CHAIN_CURRENCY = { name: "MON", symbol: "MON", decimals: 18 };
export const CHAIN_EXPLORER = "https://testnet.monadexplorer.com";

export const ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "_caseHash", "type": "bytes32" },
            { "internalType": "uint8", "name": "_feasibility", "type": "uint8" },
            { "internalType": "uint8", "name": "_innovation", "type": "uint8" },
            { "internalType": "uint8", "name": "_risk", "type": "uint8" },
            { "internalType": "uint8", "name": "_finalScore", "type": "uint8" },
            { "internalType": "string", "name": "_shortVerdict", "type": "string" }
        ],
        "name": "saveVerdict",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
        "name": "getVerdict",
        "outputs": [
            {
                "components": [
                    { "internalType": "bytes32", "name": "caseHash", "type": "bytes32" },
                    { "internalType": "uint8", "name": "feasibilityScore", "type": "uint8" },
                    { "internalType": "uint8", "name": "innovationScore", "type": "uint8" },
                    { "internalType": "uint8", "name": "riskScore", "type": "uint8" },
                    { "internalType": "uint8", "name": "finalScore", "type": "uint8" },
                    { "internalType": "string", "name": "shortVerdict", "type": "string" },
                    { "internalType": "address", "name": "submitter", "type": "address" },
                    { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
                ],
                "internalType": "struct AgentJury.Verdict",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "verdictCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "verdictId", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "caseHash", "type": "bytes32" },
            { "indexed": false, "internalType": "uint8", "name": "finalScore", "type": "uint8" },
            { "indexed": false, "internalType": "string", "name": "shortVerdict", "type": "string" },
            { "indexed": true, "internalType": "address", "name": "submitter", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "VerdictSaved",
        "type": "event"
    }
];

// ─── Wallet Connection ──────────────────────────────────────────────────────
export function isMetaMaskInstalled() {
    return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("METAMASK_NOT_FOUND");
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No accounts found");

    // Switch / add Monad Testnet
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: `0x${CHAIN_ID.toString(16)}`,
                    chainName: CHAIN_NAME,
                    nativeCurrency: CHAIN_CURRENCY,
                    rpcUrls: [CHAIN_RPC],
                    blockExplorerUrls: [CHAIN_EXPLORER],
                }],
            });
        } else {
            throw switchError;
        }
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return { provider, signer, address };
}

// ─── Get Read-only Provider ─────────────────────────────────────────────────
export function getReadProvider() {
    // Always use a direct JsonRpcProvider for read-only calls.
    // BrowserProvider requires MetaMask and causes BAD_DATA errors on reads.
    return new ethers.JsonRpcProvider(CHAIN_RPC, {
        chainId: CHAIN_ID,
        name: CHAIN_NAME,
    });
}

// ─── Save Verdict On-chain ──────────────────────────────────────────────────
export async function saveVerdictOnChain({ caseText, feasibility, innovation, risk, finalScore, shortVerdict }) {
    const { signer } = await connectWallet();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const caseHash = ethers.keccak256(ethers.toUtf8Bytes(caseText));

    const tx = await contract.saveVerdict(
        caseHash,
        Math.round(feasibility),
        Math.round(innovation),
        Math.round(risk),
        Math.round(finalScore),
        shortVerdict
    );

    const receipt = await tx.wait();
    return { txHash: receipt.hash, caseHash };
}

// ─── Get Total Verdict Count ────────────────────────────────────────────────
export async function getVerdictCount() {
    const provider = getReadProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const count = await contract.verdictCount();
    return Number(count);
}

// ─── Get Single Verdict ─────────────────────────────────────────────────────
export async function getVerdictById(id) {
    const provider = getReadProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    const v = await contract.getVerdict(id);
    return {
        id,
        caseHash: v.caseHash,
        feasibilityScore: Number(v.feasibilityScore),
        innovationScore: Number(v.innovationScore),
        riskScore: Number(v.riskScore),
        finalScore: Number(v.finalScore),
        shortVerdict: v.shortVerdict,
        submitter: v.submitter,
        timestamp: Number(v.timestamp),
    };
}
