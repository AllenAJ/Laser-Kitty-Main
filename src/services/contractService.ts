// src/services/contractService.ts

import { ethers } from 'ethers';
import { BodyType, PatternType, EyeType, MouthType } from '../types/types';

interface EthereumProvider extends ethers.providers.ExternalProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
}

interface MintKittyParams {
    bodyType: BodyType;
    pattern: PatternType;
    eyeType: EyeType;
    mouthType: MouthType;
    primaryColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    eyeColor: string;
}

export class ContractService {
    private CONTRACT_ADDRESS = "0x0122a11EbC7c99a599984B768DAB9d2189d3E006";
    private NFT_CONTRACT_ADDRESS = "0x84c911C2BB03c11DB0Cc9A9Da327418F26FabCdf";
    
    // Updated ABI with explicit parameter names and types
    private NFT_CONTRACT_ABI = [
        {
            "inputs": [
                {
                    "name": "owner",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "name": "balance",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    private CONTRACT_ABI = [
        "function mintKitty(bytes32 attributes, bytes32 colors) payable returns (uint256)",
        "function getKitty(uint256 tokenId) view returns (tuple(bytes32 attributes, bytes32 colors, uint256 interactionCount, uint256 lastInteractionTime, uint256 equippedKeyId, uint256 equippedEyeId, bool hasActiveKey, bool hasActiveEye))",
        "function checkExclusiveNFTAccess(address user) returns (bool)"
    ];

    async getProvider(): Promise<ethers.providers.Web3Provider> {
        if (typeof window === 'undefined') {
            throw new Error("Window is not defined");
        }

        const ethereum = window.ethereum as EthereumProvider | undefined;

        if (!ethereum || !ethereum.request) {
            throw new Error("MetaMask is not installed. Please install MetaMask to use this feature.");
        }

        try {
            await ethereum.request({ 
                method: 'eth_requestAccounts' 
            });

            return new ethers.providers.Web3Provider(ethereum);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('User rejected')) {
                    throw new Error("Please connect your MetaMask wallet to continue.");
                }
            }
            throw error;
        }
    }

    async checkExclusiveAccess(userAddress: string): Promise<boolean> {
        try {
            const provider = await this.getProvider();
            
            // Create contract instance with explicit typing
            const nftContract = new ethers.Contract(
                this.NFT_CONTRACT_ADDRESS,
                this.NFT_CONTRACT_ABI,
                provider
            );

            // Add error handling for address format
            if (!ethers.utils.isAddress(userAddress)) {
                throw new Error("Invalid Ethereum address");
            }

            // Call balanceOf with explicit error handling
            try {
                const balance = await nftContract.balanceOf(userAddress);
                console.log('NFT Balance:', balance.toString()); // Add logging
                return balance.gt(0);
            } catch (error) {
                console.error('NFT balance check error:', error);
                throw new Error(`Failed to check NFT balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error checking exclusive access:", error);
            return false;
        }
    }

    async mintKitty(params: MintKittyParams) {
        try {
            // Pack the data
            const attributes = this.packAttributes(
                params.bodyType,
                params.pattern,
                params.eyeType,
                params.mouthType
            );

            const colors = this.packColors(
                params.primaryColor,
                params.secondaryColor,
                params.tertiaryColor,
                params.eyeColor
            );

            // Verify exclusive access if using exclusive mouth
            if (params.mouthType === MouthType.exclusive) {
                const provider = await this.getProvider();
                const signer = provider.getSigner();
                const address = await signer.getAddress();
                const hasAccess = await this.checkExclusiveAccess(address);
                
                if (!hasAccess) {
                    throw new Error("Exclusive mouth type requires NFT ownership");
                }
            }

            const mintData = {
                attributes,
                colors,
                preview: {
                    body: params.bodyType,
                    pattern: params.pattern,
                    eyes: params.eyeType,
                    mouth: params.mouthType,
                    colors: {
                        primary: params.primaryColor,
                        secondary: params.secondaryColor,
                        tertiary: params.tertiaryColor,
                        eye: params.eyeColor
                    }
                },
                hasExclusiveMouth: params.mouthType === MouthType.exclusive
            };

            // Encode data for URL
            const encodedData = btoa(JSON.stringify(mintData));

            // Open minting website in new tab
            await chrome.tabs.create({
                url: `https://crypto-kitty-minter.vercel.app/?data=${encodedData}`,
                active: true
            });

            return { status: 'redirected' };
        } catch (error) {
            console.error('Minting error:', error);
            throw error;
        }
    }

    private packAttributes(
        bodyType: BodyType,
        pattern: PatternType,
        eyeType: EyeType,
        mouthType: MouthType
    ): string {
        // Pack attributes into bytes32
        return ethers.utils.solidityKeccak256(
            ['string', 'string', 'string', 'string'],
            [bodyType, pattern, eyeType, mouthType]
        );
    }

    private packColors(
        primary: string,
        secondary: string,
        tertiary: string,
        eye: string
    ): string {
        // Pack colors into bytes32
        return ethers.utils.solidityKeccak256(
            ['string', 'string', 'string', 'string'],
            [primary, secondary, tertiary, eye]
        );
    }


    async getKittyDetails(tokenId: number) {
        try {
            const provider = await this.getProvider();
            const contract = new ethers.Contract(
                this.CONTRACT_ADDRESS,
                this.CONTRACT_ABI,
                provider
            );

            const kitty = await contract.getKitty(tokenId);
            return kitty;
        } catch (error) {
            console.error("Error getting kitty details:", error);
            throw error;
        }
    }
}

export const contractService = new ContractService();