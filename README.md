# 🐱 Laser Kitty

Turn your browser into a playground with customizable crypto-kitties that can shoot lasers! Design your unique NFT kitty and use it to playfully "remove" elements from any webpage.

## 🎯 Project Overview

CryptoKitty Designer is a Web3-enabled browser extension that combines NFT customization with interactive webpage manipulation. Users can:
- Design and mint unique CryptoKitties as NFTs
- Deploy their kitty as an interactive webpage companion
- Use laser powers to playfully interact with web content
- Earn achievements through gameplay
- Access exclusive features through NFT ownership

### 🌟 Core Features

#### Designer Mode
- 8 unique body types
- 6 pattern variations
- 8 eye styles
- 10 mouth types (including exclusive NFT-gated options)
- Extensive color customization options
- Real-time preview
- Web3 minting capabilities

#### Gameplay Mode
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

## 🔧 Technical Architecture

### Extension Components
```
/
├── public/
│   ├── cattributes/      # SVG assets
│   ├── sounds/           # Audio effects
│   └── manifest.json     # Extension config
└── src/
    ├── components/       # React components
    ├── contexts/         # State management
    ├── services/         # Business logic
    └── types/           # TypeScript definitions
```

### Minting Page Components
```
/
├── public/
│   └── cattributes/     # Shared assets
└── src/
    └── app/
        ├── api/         # Backend endpoints
        └── components/  # React components
```

## 🎨 Creative Implementation

### Interactive Elements
- Dynamic eye tracking
- Physics-based laser animations
- Particle effects for destruction
- Adaptive color schemes
- Sound effects and visual feedback

### Achievement System
- Progression-based rewards
- Multiple achievement tiers:
  - Laser Newbie (10 zaps)
  - Zap Master (50 zaps)
  - Destruction King (100 zaps)

## 🔌 API Documentation

## Base URL
```
https://crypto-kitty-minter.vercel.app/api
```

## Endpoints

### List All Cattribute Types
Returns a list of all available cattribute types.

```
GET /cattributes
```

#### Response
```json
{
  "types": ["body", "colors", "eye", "mouth"]
}
```

### List Files by Type
Returns all available files for a specific cattribute type.

```
GET /cattributes?type={type}
```

#### Parameters
| Parameter | Type   | Description                                         |
|-----------|--------|-----------------------------------------------------|
| type      | string | Required. One of: "body", "colors", "eye", "mouth" |

#### Response
```json
{
  "type": "body",
  "files": ["mainecoon-calicool", "cymric-jaguar", ...],
  "count": 48,
  "urls": [
    "/api/cattributes?type=body&name=mainecoon-calicool",
    "/api/cattributes?type=body&name=cymric-jaguar",
    ...
  ]
}
```

### Get Specific SVG File
Returns the SVG content for a specific cattribute.

```
GET /cattributes?type={type}&name={name}
```

#### Parameters
| Parameter | Type   | Description                                         |
|-----------|--------|-----------------------------------------------------|
| type      | string | Required. One of: "body", "colors", "eye", "mouth" |
| name      | string | Required. Name of the specific file without .svg extension |

#### Response
Content-Type: image/svg+xml
```svg
<svg>...</svg>
```

## Available Cattributes

### Body Types (with Patterns)
Available combinations of body types and patterns:
- Body Types: mainecoon, cymric, laperm, munchkin, sphynx, ragamuffin, himalayan, chartreux
- Patterns: spock, tigerpunk, calicool, luckystripe, jaguar, totesbasic

Format: `{bodyType}-{pattern}`  
Example: `mainecoon-calicool`

### Eye Types
- wingtips
- fabulous
- otaku
- raisedbrow
- simple
- crazy
- thicccbrowz
- googly

### Mouth Types
- whixtensions
- dali
- saycheese
- beard
- tongue
- happygokitty
- pouty
- soserious
- gerbil
- exclusive (requires NFT ownership)

### Colors
Primary:
- mauveover (#ded0ee)
- cloudwhite (#ffffff)
- salmon (#f4a792)
- shadowgrey (#b1b1be)
- orangesoda (#f7bc56)
- aquamarine (#add5d2)
- greymatter (#d1dadf)
- oldlace (#ffebe9)
- cottoncandy (#ecd1eb)

Secondary:
- peach (#f9cfad)
- bloodred (#ff7a7a)
- emeraldgreen (#8be179)
- granitegrey (#b1aeb9)
- kittencream (#f7ebda)

Tertiary:
- barkbrown (#886662)
- cerulian (#385877)
- scarlet (#ea5f5a)
- skyblue (#83d5ff)
- coffee (#756650)
- royalpurple (#cf5be8)
- lemonade (#ffef85)
- swampgreen (#44e192)
- chocolate (#c47e33)
- royalblue (#5b6ee8)
- wolfgrey (#737184)

Eye Colors:
- gold (#fcdf35)
- bubblegum (#ef52d1)
- limegreen (#aef72f)
- chestnut (#a56429)
- topaz (#0ba09c)
- mintgreen (#43edac)
- strawberry (#ef4b62)
- sizzurp (#7c40ff)

## Error Responses

### 400 Bad Request
Returned when the request parameters are invalid.
```json
{
  "error": "Invalid type. Must be one of: body, colors, eye, mouth"
}
```

### 404 Not Found
Returned when the requested file doesn't exist.
```json
{
  "error": "File mainecoon-calicool.svg not found in body"
}
```

### 500 Internal Server Error
Returned when there's a server-side error.
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting
Currently no rate limiting is implemented, but please be mindful of request frequency.

## CORS
The API is CORS-enabled and can be accessed from any origin.

## Caching
SVG responses include cache headers with a max age of 1 year (31536000 seconds).

## Example Usage

### JavaScript/Fetch
```javascript
// List all cattribute types
fetch('https://crypto-kitty-minter.vercel.app/api/cattributes')
  .then(response => response.json())
  .then(data => console.log(data.types));

// Get all body types
fetch('https://crypto-kitty-minter.vercel.app/api/cattributes?type=body')
  .then(response => response.json())
  .then(data => console.log(data.files));

// Get specific SVG
fetch('https://crypto-kitty-minter.vercel.app/api/cattributes?type=body&name=mainecoon-calicool')
  .then(response => response.text())
  .then(svg => console.log(svg));
```

### cURL
```bash
# List all types
curl https://crypto-kitty-minter.vercel.app/api/cattributes

# Get all body types
curl https://crypto-kitty-minter.vercel.app/api/cattributes?type=body

# Get specific SVG
curl https://crypto-kitty-minter.vercel.app/api/cattributes?type=body&name=mainecoon-calicool
```

## 🔗 Resources

- [GitHub Repository](https://github.com/AllenAJ/Laser-Kitty-Main)
- [API Documentation](https://crypto-kitty-minter.vercel.app/cattributes)
