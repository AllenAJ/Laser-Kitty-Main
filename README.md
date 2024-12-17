# 🐱 Laser Kitty

![gameplay image](https://media.discordapp.net/attachments/1288447112035696660/1318508640474234890/image.png?ex=6762945c&is=676142dc&hm=a8d57a2fc8b8fca4dc33a94917bb500ea62775fd63bda5ccdd1059feda83887e&=&format=webp&quality=lossless&width=674&height=1022)

Turn your browser into a playground with customizable crypto-kitties that can shoot lasers! Design your unique NFT kitty and use it to playfully "remove" elements from any webpage.

## 🎯 Project Overview

CryptoKitty Designer is a Web3-enabled browser extension that combines NFT customization with interactive webpage manipulation. Users can:
- Design and mint unique CryptoKitties as NFTs
- Deploy their kitty as an interactive webpage companion
- Use laser powers to playfully interact with web content
- Earn achievements through gameplay
- Access exclusive features through NFT ownership

## 🌟 Core Features

### Designer Mode
- 8 unique body types
- 6 pattern variations
- 8 eye styles
- 10 mouth types (including exclusive NFT-gated options)
- Extensive color customization options
- Real-time preview
- Web3 minting capabilities

### Gameplay Mode
- Interactive laser shooting mechanics
- Physics-based eye tracking
- Achievement system
- Score tracking
- Audio-visual feedback
- Cross-website compatibility

## 🎮 How to Use

1. **Install the Extension**
   - Load the extension
   - Pin to toolbar for easy access

2. **Design Your Kitty**
   - Launch the designer interface
   - Choose body type, patterns, and colors
   - Preview in real-time
   - Save your preferences

3. **Activate Gameplay Mode**
   - Visit any website
   - Click "Activate Kitty"
   - Click anywhere to shoot lasers
   - Watch elements disappear with style!

## 🔨 Building on Laser Kitty

### Platform Components

#### 1. Smart Contracts
```solidity
// Core contract address (Sepolia testnet)
0x0122a11EbC7c99a599984B768DAB9d2189d3E006

// NFT contract address for exclusive features
0x84c911C2BB03c11DB0Cc9A9Da327418F26FabCdf
```

#### 2. Public APIs
Base URL: `https://crypto-kitty-minter.vercel.app/api`
- Cattributes API (SVG assets)
- Achievement System
- Kitty Metadata
- User Preferences

#### 3. Asset System
- Modular SVG components
- Color replacement system
- Animation framework
- Sound effects library

### Integration Examples

#### 1. Build a Game
```javascript
// Subscribe to laser events
window.addEventListener('kitty-laser', (event) => {
  const { position, power, kittyId } = event.detail;
  // Add game mechanics based on laser shots
});

// Add custom achievements
KittyAchievements.register({
  id: 'SUPER_SHOOTER',
  threshold: 200,
  title: 'Super Shooter',
  reward: {
    type: 'equipment',
    item: 'golden-laser'
  }
});
```

#### 2. Create Equipment NFTs
```solidity
// Example: Create compatible equipment
contract KittyEquipment is ERC721 {
    function equip(uint256 kittyId, uint256 equipmentId) external {
        require(CryptoKitty(KITTY_CONTRACT).ownerOf(kittyId) == msg.sender);
        // Equipment logic
    }
}
```

#### 3. Custom Visualization
```typescript
// Use our SVG manipulation API
const customKitty = await fetch('/api/cattributes/combine', {
  method: 'POST',
  body: JSON.stringify({
    body: 'mainecoon-calicool',
    eyes: 'googly',
    mouth: 'beard',
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      tertiary: '#0000ff'
    },
    // Add custom layers
    extras: [{
      type: 'hat',
      svg: '<svg>...</svg>'
    }]
  })
});
```

## 🔌 API Documentation

### Base URL
```
https://crypto-kitty-minter.vercel.app/api
```

### Endpoints

#### List All Cattribute Types
```http
GET /cattributes
```

Response:
```json
{
  "types": ["body", "colors", "eye", "mouth"]
}
```

#### List Files by Type
```http
GET /cattributes?type={type}
```

Parameters:
| Parameter | Type   | Description                                         |
|-----------|--------|-----------------------------------------------------|
| type      | string | Required. One of: "body", "colors", "eye", "mouth" |

Response:
```json
{
  "type": "body",
  "files": ["mainecoon-calicool", "cymric-jaguar"],
  "count": 48,
  "urls": [
    "/api/cattributes?type=body&name=mainecoon-calicool",
    "/api/cattributes?type=body&name=cymric-jaguar"
  ]
}
```

#### Get Specific SVG File
```http
GET /cattributes?type={type}&name={name}
```

Response: SVG content (image/svg+xml)

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid type. Must be one of: body, colors, eye, mouth"
}
```

#### 404 Not Found
```json
{
  "error": "File mainecoon-calicool.svg not found in body"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### API Features
- CORS enabled
- 1-year cache for SVG responses
- No rate limiting (please be mindful)

### Example Usage
```javascript
// List all cattribute types
fetch('https://crypto-kitty-minter.vercel.app/api/cattributes')
  .then(response => response.json())
  .then(data => console.log(data.types));

// Get specific SVG
fetch('https://crypto-kitty-minter.vercel.app/api/cattributes?type=body&name=mainecoon-calicool')
  .then(response => response.text())
  .then(svg => console.log(svg));
```

## 🔗 Resources

- [GitHub Repository](https://github.com/AllenAJ/Laser-Kitty-Main)
- [API Documentation](https://crypto-kitty-minter.vercel.app/cattributes)
