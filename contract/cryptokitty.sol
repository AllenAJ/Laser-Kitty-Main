// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IGasback {
    function register(address owner, address contractAddress) external;
    function reward(address user, uint256 amount) external;
    function getRewardBalance(address user) external view returns (uint256);
}

contract CryptoKittyDesigner is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    // Core contracts
    IGasback public gasback;
    Counters.Counter private _tokenIds;

    // External NFT contracts
    address public constant SHAPECRAFT_KEY_CONTRACT = 0x01eB5CF188ba7d075FDf7eDF2BB8426b17CA3320;
    address public constant SHAPECRAFT_EYE_CONTRACT = 0xAA394da7d62E502a7E3dA7e11d21A74c277143d5;
    address public constant SHAPECRAFT_KEY_CONTRACT_testnet = 0x05aA491820662b131d285757E5DA4b74BD0F0e5F;

    // Core kitty data structure
    struct Kitty {
        bytes32 attributes;  // Packed attributes (bodyType, pattern, eyeType, mouthType)
        bytes32 colors;     // Packed colors (primary, secondary, tertiary, eye)
        uint256 interactionCount;
        uint256 lastInteractionTime;
        uint256 equippedKeyId;  // ShapeCraft Key NFT
        uint256 equippedEyeId;  // ShapeCraft Eye NFT
        bool hasActiveKey;
        bool hasActiveEye;
    }

    // Mappings
    mapping(uint256 => Kitty) public kitties;
    mapping(address => bool) public approvedInteractors;
    mapping(address => uint256) public lastNFTCheck;
    mapping(address => bool) public hasExclusiveAccess;

    // Events
    event KittyMinted(uint256 indexed tokenId, address indexed minter);
    event KittyInteraction(uint256 indexed kittyId, address indexed interactor, bytes data);
    event ShapeCraftKeyEquipped(uint256 indexed kittyId, uint256 indexed keyId);
    event ShapeCraftEyeEquipped(uint256 indexed kittyId, uint256 indexed eyeId);
    event ShapeCraftItemUnequipped(uint256 indexed kittyId, address indexed nftContract, uint256 indexed itemId);
    event ExclusiveAccessUpdated(address indexed user, bool hasAccess);

    constructor(address _gasback) ERC721("CryptoKitty", "CKT") Ownable(msg.sender) {
        gasback = IGasback(_gasback);
    }

    // Helper function to check if a token exists
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function mintKitty(bytes32 attributes, bytes32 colors) public payable returns (uint256) {
        require(msg.value >= 0.001 ether, "Insufficient payment");
        
        _tokenIds.increment();
        uint256 newKittyId = _tokenIds.current();
        _safeMint(msg.sender, newKittyId);
        
        kitties[newKittyId] = Kitty({
            attributes: attributes,
            colors: colors,
            interactionCount: 0,
            lastInteractionTime: block.timestamp,
            equippedKeyId: 0,
            equippedEyeId: 0,
            hasActiveKey: false,
            hasActiveEye: false
        });

        emit KittyMinted(newKittyId, msg.sender);
        return newKittyId;
    }

    function equipShapeCraftKey(uint256 kittyId, uint256 keyId) external {
        require(exists(kittyId), "Kitty does not exist");
        require(ownerOf(kittyId) == msg.sender, "Not kitty owner");
        
        IERC721 keyContract = IERC721(SHAPECRAFT_KEY_CONTRACT);
        require(keyContract.ownerOf(keyId) == msg.sender, "Not key owner");
        
        Kitty storage kitty = kitties[kittyId];
        
        if (kitty.hasActiveKey) {
            _unequipShapeCraftItem(kittyId, SHAPECRAFT_KEY_CONTRACT, kitty.equippedKeyId);
        }
        
        kitty.equippedKeyId = keyId;
        kitty.hasActiveKey = true;
        
        emit ShapeCraftKeyEquipped(kittyId, keyId);
    }
    
    function equipShapeCraftEye(uint256 kittyId, uint256 eyeId) external {
        require(exists(kittyId), "Kitty does not exist");
        require(ownerOf(kittyId) == msg.sender, "Not kitty owner");
        
        IERC721 eyeContract = IERC721(SHAPECRAFT_EYE_CONTRACT);
        require(eyeContract.ownerOf(eyeId) == msg.sender, "Not eye owner");
        
        Kitty storage kitty = kitties[kittyId];
        
        if (kitty.hasActiveEye) {
            _unequipShapeCraftItem(kittyId, SHAPECRAFT_EYE_CONTRACT, kitty.equippedEyeId);
        }
        
        kitty.equippedEyeId = eyeId;
        kitty.hasActiveEye = true;
        
        emit ShapeCraftEyeEquipped(kittyId, eyeId);
    }

    function checkExclusiveNFTAccess(address user) public returns (bool) {
        if (block.timestamp - lastNFTCheck[user] < 1 hours) {
            return hasExclusiveAccess[user];
        }
        
        IERC721 exclusiveNFT = IERC721(SHAPECRAFT_KEY_CONTRACT_testnet);
        bool hasNFT = exclusiveNFT.balanceOf(user) > 0;
        
        lastNFTCheck[user] = block.timestamp;
        hasExclusiveAccess[user] = hasNFT;
        
        emit ExclusiveAccessUpdated(user, hasNFT);
        return hasNFT;
    }

    function interact(uint256 kittyId, bytes calldata data) external {
        require(exists(kittyId), "Kitty does not exist");
        require(approvedInteractors[msg.sender], "Unauthorized");
        
        Kitty storage kitty = kitties[kittyId];
        kitty.interactionCount++;
        kitty.lastInteractionTime = block.timestamp;
        
        emit KittyInteraction(kittyId, msg.sender, data);
    }

    function getKitty(uint256 tokenId) public view returns (Kitty memory) {
        require(exists(tokenId), "Kitty does not exist");
        return kitties[tokenId];
    }
    
    function getKittyShapeCraftItems(uint256 kittyId) external view returns (
        uint256 keyId,
        uint256 eyeId,
        bool hasKey,
        bool hasEye
    ) {
        require(exists(kittyId), "Kitty does not exist");
        Kitty storage kitty = kitties[kittyId];
        return (
            kitty.equippedKeyId,
            kitty.equippedEyeId,
            kitty.hasActiveKey,
            kitty.hasActiveEye
        );
    }

    function setGasbackContract(address _newGasback) external onlyOwner {
        gasback = IGasback(_newGasback);
    }

    function setApprovedInteractor(address interactor, bool approved) external onlyOwner {
        approvedInteractors[interactor] = approved;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    function _unequipShapeCraftItem(uint256 kittyId, address nftContract, uint256 itemId) internal {
        emit ShapeCraftItemUnequipped(kittyId, nftContract, itemId);
    }
}