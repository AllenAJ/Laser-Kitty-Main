// src/services/contractService.ts

import { ethers } from 'ethers';
import { BodyType, PatternType, EyeType, MouthType } from '../types/types';

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
    private CONTRACT_ABI = [
        "function mintKitty(bytes32 attributes, bytes32 colors) payable returns (uint256)",
        "function getKitty(uint256 tokenId) view returns (tuple(bytes32 attributes, bytes32 colors, uint256 interactionCount, uint256 lastInteractionTime, uint256 equippedKeyId, uint256 equippedEyeId, bool hasActiveKey, bool hasActiveEye))",
        "function checkExclusiveNFTAccess(address user) returns (bool)"
    ];

    async getProvider() {
        if (!window.ethereum) {
            throw new Error("MetaMask is not installed");
        }
        // Using Web3Provider for browser environments
        return new ethers.providers.Web3Provider(window.ethereum);
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
            },  // Add comma here
            hasExclusiveMouth: params.mouthType === 'exclusive'
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

    async checkExclusiveAccess(userAddress: string): Promise<boolean> {
        try {
            const provider = await this.getProvider();
            const contract = new ethers.Contract(
                this.CONTRACT_ADDRESS,
                this.CONTRACT_ABI,
                provider
            );

            return await contract.checkExclusiveNFTAccess(userAddress);
        } catch (error) {
            console.error("Error checking exclusive access:", error);
            return false;
        }
    }
}

export const contractService = new ContractService();