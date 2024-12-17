# .gitignore

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

node_modules
.env

# Hardhat files
/cache
/artifacts

# TypeChain files
/typechain
/typechain-types

# solidity-coverage files
/coverage
/coverage.json

# Hardhat Ignition default folder for deployments against a local node
ignition/deployments/chain-31337

node_modules
.env

# Hardhat files
/cache
/artifacts

# TypeChain files
/typechain
/typechain-types

# solidity-coverage files
/coverage
/coverage.json

# Hardhat Ignition default folder for deployments against a local node
ignition/deployments/chain-31337

node_modules
.env

# Hardhat files
/cache
/artifacts

# TypeChain files
/typechain
/typechain-types

# solidity-coverage files
/coverage
/coverage.json

# Hardhat Ignition default folder for deployments against a local node
ignition/deployments/chain-31337

```

# contract/cryptokitty.sol

```sol
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
```

# package.json

```json
{
  "name": "cryptokitty-designer",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@nomiclabs/hardhat-ethers": "^2.2.3",
    "@nomiclabs/hardhat-waffle": "^2.0.6",
    "@openzeppelin/contracts": "^5.1.0",
    "ethers": "^5.7.2",
    "firebase": "^11.0.2",
    "hardhat": "^2.22.17",
    "lucide-react": "^0.462.0",
    "magic-sdk": "^28.19.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "copy-webpack-plugin": "^12.0.2",
    "css-loader": "^6.11.0",
    "dotenv-webpack": "^8.1.0",
    "html-webpack-plugin": "^5.6.3",
    "postcss-loader": "^8.1.1",
    "style-loader": "^3.3.4",
    "tailwindcss": "^3.4.15",
    "ts-loader": "^9.5.1",
    "typescript": "^4.9.5",
    "webpack": "^5.97.0",
    "webpack-cli": "^5.1.4"
  },
  "scripts": {
    "start": "webpack --watch --mode=development",
    "build": "webpack --mode=production",
    "clean": "rm -rf build"
  }
}

```

# postcss.config.js

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

# public/background.js

```js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
```

# public/cattributes/body/chartreux-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/chartreux-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/chartreux-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/chartreux-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/chartreux-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/chartreux-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/cymric-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/himalayan-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/laperm-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/mainecoon-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/munchkin-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/ragamuffin-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-calicool.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-jaguar.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-luckystripe.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-spock.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-tigerpunk.svg

This is a file of the type: SVG Image

# public/cattributes/body/sphynx-totesbasic.svg

This is a file of the type: SVG Image

# public/cattributes/colors/barkbrown.svg

This is a file of the type: SVG Image

# public/cattributes/colors/cerulian.svg

This is a file of the type: SVG Image

# public/cattributes/colors/chocolate.svg

This is a file of the type: SVG Image

# public/cattributes/colors/coffee.svg

This is a file of the type: SVG Image

# public/cattributes/colors/cottoncandy.svg

This is a file of the type: SVG Image

# public/cattributes/colors/lemonade.svg

This is a file of the type: SVG Image

# public/cattributes/colors/oldlace.svg

This is a file of the type: SVG Image

# public/cattributes/colors/royalblue.svg

This is a file of the type: SVG Image

# public/cattributes/colors/royalpurple.svg

This is a file of the type: SVG Image

# public/cattributes/colors/scarlet.svg

This is a file of the type: SVG Image

# public/cattributes/colors/wolfgrey.svg

This is a file of the type: SVG Image

# public/cattributes/eye/crazy.svg

This is a file of the type: SVG Image

# public/cattributes/eye/fabulous.svg

This is a file of the type: SVG Image

# public/cattributes/eye/googly.svg

This is a file of the type: SVG Image

# public/cattributes/eye/otaku.svg

This is a file of the type: SVG Image

# public/cattributes/eye/raisedbrow.svg

This is a file of the type: SVG Image

# public/cattributes/eye/simple.svg

This is a file of the type: SVG Image

# public/cattributes/eye/thicccbrowz.svg

This is a file of the type: SVG Image

# public/cattributes/eye/wingtips.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/beard.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/dali.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/exclusive.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/gerbil.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/happygokitty.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/pouty.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/saycheese.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/soserious.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/tongue.svg

This is a file of the type: SVG Image

# public/cattributes/mouth/whixtensions.svg

This is a file of the type: SVG Image

# public/cattributes/nullcat.svg

This is a file of the type: SVG Image

# public/favicon.ico

This is a binary file of the type: Binary

# public/icon.png

This is a binary file of the type: Image

# public/icons/favicon.ico

This is a binary file of the type: Binary

# public/icons/icon.svg

This is a file of the type: SVG Image

# public/icons/icon16.png

This is a binary file of the type: Image

# public/icons/icon32.png

This is a binary file of the type: Image

# public/icons/icon48.png

This is a binary file of the type: Image

# public/icons/icon128.png

This is a binary file of the type: Image

# public/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <!--
      manifest.json provides metadata used when your web app is installed on a
      user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/
    -->
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <!--
      Notice the use of %PUBLIC_URL% in the tags above.
      It will be replaced with the URL of the `public` folder during the build.
      Only files inside the `public` folder can be referenced from the HTML.

      Unlike "/favicon.ico" or "favicon.ico", "%PUBLIC_URL%/favicon.ico" will
      work correctly both with client-side routing and a non-root public URL.
      Learn how to configure a non-root public URL by running `npm run build`.
    -->
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <!--
      This HTML file is a template.
      If you open it directly in the browser, you will see an empty page.

      You can add webfonts, meta tags, or analytics to this file.
      The build step will place the bundled scripts into the <body> tag.

      To begin the development, run `npm start` or `yarn start`.
      To create a production bundle, use `npm run build` or `yarn build`.
    -->
  </body>
</html>

```

# public/logo192.png

This is a binary file of the type: Image

# public/logo512.png

This is a binary file of the type: Image

# public/manifest.json

```json
{
  "manifest_version": 3,
  "name": "CryptoKitty Designer",
  "version": "1.0.0",
  "description": "Design your own CryptoKitties",
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "128": "icon.png"
    },
    "default_width": 800,
    "default_height": 600
  },
  "icons": {
    "128": "icon.png"
  },
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "web_accessible_resources": [{
    "resources": [
      "sounds/*",
      "cattributes/*"
    ],
    "matches": ["<all_urls>"]
  }],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_end"
    }
  ]
}
```

# public/robots.txt

```txt
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:

```

# public/sounds/laser.mp3

This is a binary file of the type: Binary

# README.md

```md
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

```

# src/App.css

```css
.App {
  text-align: center;
}

.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

```

# src/App.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import MenuScreen from './components/MenuScreen';
import { useAuth } from './contexts/AuthContext';
import CryptoKittyDesigner from './components/CryptoKittyDesigner';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'designer'>('menu');
  const [isKittyActive, setKittyActive] = useState(false);

  // Check if kitty can be activated on current tab
  const checkTabCompatibility = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url?.startsWith('chrome://') || tab?.url?.startsWith('https://chrome.google.com/webstore')) {
        throw new Error('Cannot activate on Chrome pages');
      }
      
      // Check if background script is alive
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_ALIVE' });
      return response?.alive === true;
    } catch (err) {
      console.error('Tab compatibility check failed:', err);
      return false;
    }
  };

  const activateKitty = async (kittyData: any) => {
    const isCompatible = await checkTabCompatibility();
    if (!isCompatible) {
      console.error('Tab not compatible for kitty activation');
      return;
    }

    try {
      await chrome.runtime.sendMessage({ 
        type: 'ACTIVATE_KITTY',
        kittyData 
      });
      setKittyActive(true);
      window.close(); // Close popup after activation
    } catch (err) {
      console.error('Failed to activate kitty:', err);
    }
  };

  const deactivateKitty = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'DEACTIVATE_KITTY' });
      setKittyActive(false);
    } catch (err) {
      console.error('Failed to deactivate kitty:', err);
    }
  };

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="h-[600px] bg-gray-50 flex flex-col overflow-hidden">
{currentScreen === 'menu' ? (
  <MenuScreen 
    onCustomize={() => setCurrentScreen('designer')}
    onActivate={activateKitty}
    onDeactivate={deactivateKitty}
    isKittyActive={isKittyActive}
  />
) : (
  <CryptoKittyDesigner onBack={() => setCurrentScreen('menu')} />
)}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

# src/background.js

```js
// background.js
let loginTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_AUTH_TAB') {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('index.html?auth=true'),
      active: true
    }, (tab) => {
      loginTabId = tab.id;
    });
  }
  
  if (request.type === 'LOGIN_SUCCESS') {
    // The tab will close itself after showing success message
    // Focus the extension popup
    chrome.action.openPopup();
  }
});

// background.js

let activeTabId = null;

// Listen for messages from popup/content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'ACTIVATE_KITTY':
      // When popup wants to activate kitty, open on current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          activeTabId = tabs[0].id;
          chrome.tabs.sendMessage(activeTabId, { 
            type: 'SHOW_KITTY',
            kittyData: request.kittyData 
          });
        }
      });
      break;

    case 'DEACTIVATE_KITTY':
      // When deactivating, remove kitty from active tab
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { type: 'HIDE_KITTY' });
        activeTabId = null;
      }
      break;
      
    case 'CHECK_ALIVE':
      // Heartbeat check from popup
      sendResponse({ alive: true });
      break;
  }
});

// Clean up when tab closes/changes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (activeTabId && tabId !== activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { type: 'HIDE_KITTY' });
    activeTabId = null;
  }
});
```

# src/components/Alert.tsx

```tsx
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import React from "react";

const variants = {
  default: "bg-gray-50 text-gray-900",
  destructive: "bg-red-50 text-red-900",
  success: "bg-green-50 text-green-900",
  warning: "bg-yellow-50 text-yellow-900",
};

const icons = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

export function Alert({ className = "", variant = "default", children, ...props }: AlertProps) {
  const Icon = icons[variant];
  
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant]} ${className}`}
      {...props}
    >
      <Icon className="h-5 w-5" />
      {children}
    </div>
  );
}

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", children, ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = "AlertDescription";
```

# src/components/AuthScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './Alert';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullPage, setIsFullPage] = useState(false);
  const { login, logout, user, isAuthenticated } = useAuth();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    setIsFullPage(window.innerWidth > 400);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await login(email);
      setLoginSuccess(true);
      
      // Only handle auto-close in the full page auth view
      if (window.location.search.includes('auth=true')) {
        // Wait 5 seconds before closing
        setTimeout(() => {
          try {
            window.close();
            // Fallback for browsers that block window.close()
            window.location.href = chrome.runtime.getURL('index.html');
          } catch (err) {
            console.error('Error closing window:', err);
          }
        }, 5000);
      }
    } catch (err) {
      setError('Failed to log in. Please check your email and try again.');
      setLoginSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuth = () => {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('index.html?auth=true'),
      active: true
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening auth tab:', chrome.runtime.lastError);
        return;
      }
      window.close();
    });
  };

  const handleLogout = async () => {
    try {
      setLogoutError(null);
      await logout();
    } catch (err) {
      const errorMessage = 'Failed to sign out. Please try again.';
      setLogoutError(errorMessage);
      console.error('Error logging out:', err);
    }
  };

  const SuccessMessage = () => (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center p-6 max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Successfully Logged In!
        </h3>
        <p className="text-gray-600 mb-6">
          You can now continue using the CryptoKitty Designer in your extension.
          This window will close in a few seconds.
        </p>
        <div className="animate-pulse flex justify-center">
          <div className="h-2 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

  // Show success message immediately after successful login in full page mode
  if (loginSuccess && window.location.search.includes('auth=true')) {
    return <SuccessMessage />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="w-full px-4 py-2 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
            <Mail className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{user}</span>
        </div>
        <div className="flex items-center gap-2">
          {logoutError && (
            <span className="text-xs text-red-500">{logoutError}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!isFullPage) {
    return (
      <div className="fixed inset-0 w-[400px] h-[600px] flex flex-col items-center justify-center bg-white">
        <div className="w-full max-w-[320px] flex flex-col items-center px-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-8">
            <Mail className="h-10 w-10 text-purple-600" />
          </div>

          <div className="text-center space-y-3 mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome to CryptoKitty Designer
            </h1>
            <p className="text-gray-600">
              Login to start creating your unique kitties
            </p>
          </div>

          <button
            onClick={handleOpenAuth}
            className="w-full flex items-center justify-center gap-3 bg-purple-600 
              text-white hover:bg-purple-700 py-4 rounded-2xl font-medium 
              transition-all duration-300 hover:shadow-lg"
          >
            <Mail className="h-5 w-5" />
            <span>Login with Email</span>
          </button>

          <p className="text-sm text-gray-500 mt-6">
            Secure, passwordless login
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="fixed bottom-4 mx-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 mx-auto">
          <div className="text-left space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create Your Kitty
            </h1>
            <p className="text-gray-600">
              Sign in with magic link to start designing
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-base font-medium text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 rounded-2xl focus:outline-none 
                    focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                  placeholder="you@example.com"
                  required
                />
                <Mail className="absolute right-4 top-4 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white
                py-4 px-4 rounded-2xl font-medium transition-all hover:bg-purple-700
                disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue with Email
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            We'll send you a magic link for password-free sign in
          </p>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
```

# src/components/bg.webp

This is a binary file of the type: Image

# src/components/bg1.webp

This is a binary file of the type: Image

# src/components/CryptoKittyDesigner.tsx

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveUserPreferences, getUserPreferences } from '../services/userPreferences';
import { Mail, LogOut, ArrowLeft } from 'lucide-react';
import { contractService } from '../services/contractService';
import { Alert, AlertTitle, AlertDescription } from './Alert';
import { ethers } from 'ethers';

// Enums
enum BodyType {
  mainecoon = 'mainecoon',
  cymric = 'cymric',
  laperm = 'laperm',
  munchkin = 'munchkin',
  sphynx = 'sphynx',
  ragamuffin = 'ragamuffin',
  himalayan = 'himalayan',
  chartreux = 'chartreux',
}

enum PatternType {
  spock = 'spock',
  tigerpunk = 'tigerpunk',
  calicool = 'calicool',
  luckystripe = 'luckystripe',
  jaguar = 'jaguar',
  totesbasic = 'totesbasic',
}

enum EyeType {
  wingtips = 'wingtips',
  fabulous = 'fabulous',
  otaku = 'otaku',
  raisedbrow = 'raisedbrow',
  simple = 'simple',
  crazy = 'crazy',
  thicccbrowz = 'thicccbrowz',
  googly = 'googly',
}

enum MouthType {
  whixtensions = 'whixtensions',
  dali = 'dali',
  saycheese = 'saycheese',
  beard = 'beard',
  tongue = 'tongue',
  happygokitty = 'happygokitty',
  pouty = 'pouty',
  soserious = 'soserious',
  gerbil = 'gerbil',
  exclusive = 'exclusive' // New exclusive mouth type
}

interface KittyParts {
  body: string;
  eyes: string;
  mouth: string;
}

interface CryptoKittyDesignerProps {
  onBack: () => void;
}

const CryptoKittyDesigner: React.FC<CryptoKittyDesignerProps> = ({ onBack }) => {
  const { isAuthenticated, user, userId } = useAuth();
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);
  //const [hasExclusiveAccess, setHasExclusiveAccess] = useState(false);
  // Color definitions
  const Colors = {
    primary: {
      mauveover: '#ded0ee',
      cloudwhite: '#ffffff',
      salmon: '#f4a792',
      shadowgrey: '#b1b1be',
      orangesoda: '#f7bc56',
      aquamarine: '#add5d2',
      greymatter: '#d1dadf',
      oldlace: '#ffebe9',
      cottoncandy: '#ecd1eb'
    },
    secondary: {
      peach: '#f9cfad',
      bloodred: '#ff7a7a',
      emeraldgreen: '#8be179',
      granitegrey: '#b1aeb9',
      kittencream: '#f7ebda'
    },
    tertiary: {
      barkbrown: '#886662',
      cerulian: '#385877',
      scarlet: '#ea5f5a',
      skyblue: '#83d5ff',
      coffee: '#756650',
      royalpurple: '#cf5be8',
      lemonade: '#ffef85',
      swampgreen: '#44e192',
      chocolate: '#c47e33',
      royalblue: '#5b6ee8',
      wolfgrey: '#737184'
    },
    eyeColor: {
      gold: '#fcdf35',
      bubblegum: '#ef52d1',
      limegreen: '#aef72f',
      chestnut: '#a56429',
      topaz: '#0ba09c',
      mintgreen: '#43edac',
      strawberry: '#ef4b62',
      sizzurp: '#7c40ff'
    }
  };

  // State
  const [kittyParts, setKittyParts] = useState<KittyParts>({ body: '', eyes: '', mouth: '' });
  const [selectedBody, setSelectedBody] = useState<BodyType>(BodyType.cymric);
  const [selectedPattern, setSelectedPattern] = useState<PatternType>(PatternType.jaguar);
  const [selectedEye, setSelectedEye] = useState<EyeType>(EyeType.fabulous);
  const [selectedMouth, setSelectedMouth] = useState<MouthType>(MouthType.soserious);
  const [selectedColors, setSelectedColors] = useState({
    primary: 'mauveover',
    secondary: 'peach',
    tertiary: 'royalpurple',
    eyeColor: 'bubblegum'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const velocityRef = useRef({ x: 0, y: 0 });
  
  // Eye movement constants
const SPRING_STRENGTH = 0.2;  // Reduced from 0.3
const DAMPING = 0.8;         // Increased from 0.75 for more stability
const MAX_VELOCITY = 0.3;    // Reduced from 0.5
const MAX_DISTANCE = 0.1;    // Reduced from 3
const IDLE_MOVEMENT_RADIUS = 0.2; // Reduced from 0.3
  const IDLE_MOVEMENT_SPEED = 0.001;

    // Function to calculate distance between two points
    const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };
    
    // Function to limit a value between min and max
    const clamp = (value: number, min: number, max: number) => {
      return Math.min(Math.max(value, min), max);
    };
    
    // Function to simulate natural eye movement when idle
    const getIdlePosition = (time: number) => {
      const angle = time * IDLE_MOVEMENT_SPEED;
      return {
        x: Math.cos(angle) * IDLE_MOVEMENT_RADIUS,
        y: Math.sin(angle * 1.5) * IDLE_MOVEMENT_RADIUS // Use different frequency for y to create more natural movement
      };
    };

      // Check if user has the exclusive NFT
      const checkNFTAccess = async (userAddress: string): Promise<boolean> => {
        if (!window.ethereum) return false;
        
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const nftContract = new ethers.Contract(
            '0x05aA491820662b131d285757E5DA4b74BD0F0e5F',
            ['function balanceOf(address owner) view returns (uint256)'],
            provider
          );
          
          const balance = await nftContract.balanceOf(userAddress);
          return balance > BigInt(0);
        } catch (error) {
          console.error('Error checking NFT access:', error);
          return false;
        }
      };
      // Update the Mouth section render logic
      const getMouthOptions = () => {
        const baseMouths = Object.values(MouthType);
        return baseMouths;
      };
  
    const handleLogout = async () => {
      // Get logout function from auth context
      const { logout } = useAuth();
      try {
        await logout();
      } catch (error) {
        console.error('Error logging out:', error);
      }
    };

    const handleMint = async () => {
      setIsMinting(true);
      setMintError(null);
      setMintSuccess(null);
    
      try {
        const result = await contractService.mintKitty({
          bodyType: selectedBody,
          pattern: selectedPattern,
          eyeType: selectedEye,
          mouthType: selectedMouth,
          primaryColor: selectedColors.primary,
          secondaryColor: selectedColors.secondary,
          tertiaryColor: selectedColors.tertiary,
          eyeColor: selectedColors.eyeColor
        });
    
        if (result.status === 'redirected') {
          setMintSuccess('Redirecting to minting page...');
          // The contractService will handle the redirect
        }
      } catch (error) {
        setMintError(error instanceof Error ? error.message : 'Failed to start minting process');
        console.error('Minting error:', error);
      } finally {
        setIsMinting(false);
      }
    };

    // Update animation loop
    const updateEyePosition = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = timestamp;
      
      // Calculate spring force
      const dx = targetPosition.x - eyePosition.x;
      const dy = targetPosition.y - eyePosition.y;
      
      // Apply spring physics
      velocityRef.current.x += dx * SPRING_STRENGTH;
      velocityRef.current.y += dy * SPRING_STRENGTH;
      
      // Apply damping
      velocityRef.current.x *= DAMPING;
      velocityRef.current.y *= DAMPING;
      
      // Limit velocity
      const currentVelocity = getDistance({ x: 0, y: 0 }, velocityRef.current);
      if (currentVelocity > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / currentVelocity;
        velocityRef.current.x *= scale;
        velocityRef.current.y *= scale;
      }
      
      // Update position
      const newX = eyePosition.x + velocityRef.current.x;
      const newY = eyePosition.y + velocityRef.current.y;
      
      // Limit maximum eye movement distance
      const distanceFromCenter = getDistance({ x: 0, y: 0 }, { x: newX, y: newY });
      if (distanceFromCenter > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distanceFromCenter;
        setEyePosition({
          x: newX * scale,
          y: newY * scale
        });
      } else {
        setEyePosition({ x: newX, y: newY });
      }
      
      animationFrameRef.current = requestAnimationFrame(updateEyePosition);
    };

    
  const replaceColors = (svgContent: string, svgType: 'body' | 'eyes' | 'mouth') => {
    let result = svgContent;

    result = result.replace(/<(path|circle|rect|ellipse)/g, '<$1 style="transition: fill 0.3s ease-in-out"');

    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const createColorReplacer = (originalColor: string, newColor: string) => {
      const hexRegex = new RegExp(`${escapeRegExp(originalColor)}`, 'gi');
      result = result.replace(hexRegex, newColor);

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };

      if (originalColor.startsWith('#')) {
        const [r, g, b] = hexToRgb(originalColor);
        const rgbRegex = new RegExp(`rgb\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*\\)`, 'gi');
        result = result.replace(rgbRegex, newColor);
      }
    };

    if (svgType === 'body') {
      const primaryColors = Object.values(Colors.primary);
      primaryColors.forEach(originalColor => {
        createColorReplacer(originalColor, Colors.primary[selectedColors.primary as keyof typeof Colors.primary]);
      });

      const secondaryColors = Object.values(Colors.secondary);
      secondaryColors.forEach(originalColor => {
        createColorReplacer(originalColor, Colors.secondary[selectedColors.secondary as keyof typeof Colors.secondary]);
      });

      const tertiaryColors = Object.values(Colors.tertiary);
      tertiaryColors.forEach(originalColor => {
        createColorReplacer(originalColor, Colors.tertiary[selectedColors.tertiary as keyof typeof Colors.tertiary]);
      });
    } else if (svgType === 'eyes') {
      const eyeColors = Object.values(Colors.eyeColor);
      eyeColors.forEach(originalColor => {
        createColorReplacer(originalColor, Colors.eyeColor[selectedColors.eyeColor as keyof typeof Colors.eyeColor]);
      });
    } else if (svgType === 'mouth') {
      createColorReplacer(Colors.primary.shadowgrey, Colors.primary[selectedColors.primary as keyof typeof Colors.primary]);
    }

    return result;
  };

  const getColorButtonClass = (colorType: string, colorName: string) => {
    const isSelected = selectedColors[colorType as keyof typeof selectedColors] === colorName;
    return `w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 ${
      isSelected ? 'ring-4 ring-blue-500 ring-offset-2 scale-110' : ''
    }`;
  };

  const handleColorChange = (colorType: keyof typeof selectedColors, colorName: string) => {
    setSelectedColors(prev => ({ ...prev, [colorType]: colorName }));
  };

  const loadSvgContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [bodyResponse, eyesResponse, mouthResponse] = await Promise.all([
        fetch(chrome.runtime.getURL(`cattributes/body/${selectedBody}-${selectedPattern}.svg`)),
        fetch(chrome.runtime.getURL(`cattributes/eye/${selectedEye}.svg`)),
        fetch(chrome.runtime.getURL(`cattributes/mouth/${selectedMouth}.svg`))
      ]);

      if (!bodyResponse.ok || !eyesResponse.ok || !mouthResponse.ok) {
        throw new Error('Failed to load SVG parts');
      }

      let [bodySvg, eyesSvg, mouthSvg] = await Promise.all([
        bodyResponse.text(),
        eyesResponse.text(),
        mouthResponse.text()
      ]);

      bodySvg = replaceColors(bodySvg, 'body');
      eyesSvg = replaceColors(eyesSvg, 'eyes');
      mouthSvg = replaceColors(mouthSvg, 'mouth');

      setKittyParts({ body: bodySvg, eyes: eyesSvg, mouth: mouthSvg });
    } catch (error) {
      console.error('Error loading SVG:', error);
      setError(error instanceof Error ? error.message : 'Failed to load kitty');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user || !userId) return;
  
    try {
      await saveUserPreferences(user, {
        selectedBody,
        selectedPattern,
        selectedEye,
        selectedMouth,
        selectedColors
      }, userId);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const generateRandomKitty = () => {
    setSelectedBody(Object.values(BodyType)[Math.floor(Math.random() * Object.values(BodyType).length)]);
    setSelectedPattern(Object.values(PatternType)[Math.floor(Math.random() * Object.values(PatternType).length)]);
    setSelectedEye(Object.values(EyeType)[Math.floor(Math.random() * Object.values(EyeType).length)]);
    setSelectedMouth(Object.values(MouthType)[Math.floor(Math.random() * Object.values(MouthType).length)]);
    
    const newColors = {
      primary: Object.keys(Colors.primary)[Math.floor(Math.random() * Object.keys(Colors.primary).length)],
      secondary: Object.keys(Colors.secondary)[Math.floor(Math.random() * Object.keys(Colors.secondary).length)],
      tertiary: Object.keys(Colors.tertiary)[Math.floor(Math.random() * Object.keys(Colors.tertiary).length)],
      eyeColor: Object.keys(Colors.eyeColor)[Math.floor(Math.random() * Object.keys(Colors.eyeColor).length)]
    };
    
    setSelectedColors(newColors);
  };

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user || !userId) return;
      
      try {
        setPreferencesLoading(true);
        const prefs = await getUserPreferences(user, userId);
        
        if (prefs) {
          setSelectedBody(prefs.selectedBody as BodyType);
          setSelectedPattern(prefs.selectedPattern as PatternType);
          setSelectedEye(prefs.selectedEye as EyeType);
          setSelectedMouth(prefs.selectedMouth as MouthType);
          setSelectedColors(prefs.selectedColors);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadUserPreferences();
  }, [user, userId]);

  // useEffect(() => {
  //   const checkAccess = async () => {
  //     if (user) {
  //       const hasAccess = await checkNFTAccess(user);
  //       setHasExclusiveAccess(hasAccess);
        
  //       // Reset mouth selection if user loses access to exclusive mouth
  //       if (!hasAccess && selectedMouth === MouthType.exclusive) {
  //         setSelectedMouth(MouthType.soserious);
  //       }
  //     }
  //   };
  
  //   checkAccess();
  // }, [user]);

  // Save preferences when they change
  useEffect(() => {
    if (!user || !userId) return;
    
    const timeoutId = setTimeout(() => {
      savePreferences();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [selectedBody, selectedPattern, selectedEye, selectedMouth, selectedColors, user, userId]);

  // Load SVG content
  useEffect(() => {
    loadSvgContent();
  }, [selectedBody, selectedPattern, selectedEye, selectedMouth, selectedColors]);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate mouse position relative to container center
      const containerCenterX = rect.left + rect.width / 2;
      const containerCenterY = rect.top + rect.height / 2;
      
      // Calculate normalized vector from center to mouse
      const dx = e.clientX - containerCenterX;
      const dy = e.clientY - containerCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return; // Prevent division by zero
      
      // Set target position with distance-based scaling
      const scale = Math.min(distance / (rect.width / 2), 1);
      const targetX = (dx / distance) * MAX_DISTANCE * scale;
      const targetY = (dy / distance) * MAX_DISTANCE * scale;
      
      setTargetPosition({ 
        x: clamp(targetX, -MAX_DISTANCE, MAX_DISTANCE),
        y: clamp(targetY, -MAX_DISTANCE, MAX_DISTANCE)
      });
    };
  
    const updateEyePosition = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) {
        lastUpdateTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = timestamp;
      
      // Calculate spring force
      const dx = targetPosition.x - eyePosition.x;
      const dy = targetPosition.y - eyePosition.y;
      
      // Apply spring physics
      velocityRef.current.x += dx * SPRING_STRENGTH;
      velocityRef.current.y += dy * SPRING_STRENGTH;
      
      // Apply damping
      velocityRef.current.x *= DAMPING;
      velocityRef.current.y *= DAMPING;
      
      // Limit velocity
      const currentVelocity = getDistance({ x: 0, y: 0 }, velocityRef.current);
      if (currentVelocity > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / currentVelocity;
        velocityRef.current.x *= scale;
        velocityRef.current.y *= scale;
      }
      
      // Update position
      const newX = eyePosition.x + velocityRef.current.x;
      const newY = eyePosition.y + velocityRef.current.y;
      
      // Limit maximum eye movement distance
      const distanceFromCenter = getDistance({ x: 0, y: 0 }, { x: newX, y: newY });
      if (distanceFromCenter > MAX_DISTANCE) {
        const scale = MAX_DISTANCE / distanceFromCenter;
        setEyePosition({
          x: newX * scale,
          y: newY * scale
        });
      } else {
        setEyePosition({ x: newX, y: newY });
      }
      
      animationFrameRef.current = requestAnimationFrame(updateEyePosition);
    };
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(updateEyePosition);
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [eyePosition, targetPosition]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="w-full px-4 py-3 bg-white border-b flex items-center">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Menu</span>
        </button>
      </div>
  
      <div className="flex flex-col h-full overflow-hidden">
        <div className="w-full bg-white border-b p-4">
          <div className="kitty-svg-container mx-auto relative" style={{ width: '200px', height: '200px' }}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="loading-spinner" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : (
              <>
                <div dangerouslySetInnerHTML={{ __html: kittyParts.body }} className="absolute inset-0 z-10" />
                <div dangerouslySetInnerHTML={{ __html: kittyParts.mouth }} className="absolute inset-0 z-20" />
                <div
                  dangerouslySetInnerHTML={{ __html: kittyParts.eyes }}
                  className="absolute inset-0 z-30"
                  style={{
                    transform: `translate(${eyePosition.x * 10}px, ${eyePosition.y * 10}px)`,
                    transition: 'transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </>
            )}
          </div>
        </div>
  
        {/* Scrollable Controls Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6" ref={containerRef}>
            {/* Body Type */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Body Type</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(BodyType).map(bodyType => (
                  <button
                    key={bodyType}
                    onClick={() => setSelectedBody(bodyType)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      selectedBody === bodyType
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {bodyType}
                  </button>
                ))}
              </div>
            </div>
  
            {/* Pattern */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pattern</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(PatternType).map(pattern => (
                  <button
                    key={pattern}
                    onClick={() => setSelectedPattern(pattern)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      selectedPattern === pattern
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
  
            {/* Eyes */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Eyes</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(EyeType).map(eyeType => (
                  <button
                    key={eyeType}
                    onClick={() => setSelectedEye(eyeType)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      selectedEye === eyeType
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {eyeType}
                  </button>
                ))}
              </div>
            </div>
  
<div>
  <h3 className="text-sm font-medium text-gray-700 mb-2">Mouth Style</h3>
  <div className="flex flex-wrap gap-2">
  {getMouthOptions().map((mouthType) => (
      <button
        key={mouthType}
        onClick={() => setSelectedMouth(mouthType)}
        className={`
          px-3 py-1.5 text-xs rounded-lg transition-all
          ${selectedMouth === mouthType 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          ${mouthType === MouthType.exclusive 
            ? 'border-2 border-yellow-400 flex items-center gap-1' 
            : ''}
        `}
      >
        {mouthType}
        {mouthType === MouthType.exclusive && (
          <span className="text-yellow-500">⭐</span>
        )}
      </button>
    ))}
  </div>

  <div className="mt-2 p-2 bg-purple-50 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-purple-700">
      <span className="text-lg">🎁</span>
      <span>NFT ownership will be verified on the minting page</span>
    </div>
  </div>
</div>
  
            {/* Color Sections */}
            <div className="space-y-4">
              {/* Primary Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Primary Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(Colors.primary).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      onClick={() => handleColorChange('primary', colorName)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        selectedColors.primary === colorName ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: colorValue }}
                      title={colorName}
                    />
                  ))}
                </div>
              </div>
  
              {/* Secondary Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Secondary Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(Colors.secondary).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      onClick={() => handleColorChange('secondary', colorName)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        selectedColors.secondary === colorName ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: colorValue }}
                      title={colorName}
                    />
                  ))}
                </div>
              </div>
  
              {/* Tertiary Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tertiary Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(Colors.tertiary).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      onClick={() => handleColorChange('tertiary', colorName)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        selectedColors.tertiary === colorName ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: colorValue }}
                      title={colorName}
                    />
                  ))}
                </div>
              </div>
  
              {/* Eye Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Eye Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(Colors.eyeColor).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      onClick={() => handleColorChange('eyeColor', colorName)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        selectedColors.eyeColor === colorName ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: colorValue }}
                      title={colorName}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
  
        {/* Bottom Fixed Section with Buttons */}
        <div className="p-4 bg-white border-t space-y-4">
          <button 
            onClick={generateRandomKitty}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 
              text-white px-4 py-2 rounded-lg text-sm font-medium 
              hover:from-purple-600 hover:to-purple-700
              transition-all duration-200 hover:shadow-lg"
          >
            Random Kitty
          </button>
  
          <button 
            onClick={handleMint}
            disabled={isMinting}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 
              text-white px-4 py-2 rounded-lg text-sm font-medium 
              hover:from-green-600 hover:to-green-700
              transition-all duration-200 hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isMinting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Minting...
              </>
            ) : (
              'Mint as NFT'
            )}
          </button>
  
          {mintSuccess && (
            <Alert variant="success">
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>{mintSuccess}</AlertDescription>
            </Alert>
          )}
  
          {mintError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{mintError}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

export default CryptoKittyDesigner;
```

# src/components/MenuScreen.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Palette, LogOut, Play, Trophy } from 'lucide-react';
import { getUserPreferences } from '../services/userPreferences';
import bgImage from './bg.webp';

interface MenuScreenProps {
  onCustomize: () => void;
  onActivate: (kittyData: any) => Promise<void>;
  onDeactivate: () => Promise<void>;
  isKittyActive: boolean;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ 
  onCustomize, 
  onActivate, 
  onDeactivate, 
  isKittyActive 
}) => {
  const { user, userId, logout } = useAuth();
  const [kittyParts, setKittyParts] = useState({ body: '', eyes: '', mouth: '' });
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [achievement, setAchievement] = useState<string | null>(null);

  const replaceColors = (svgContent: string, colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    tertiary: Record<string, string>;
    eyeColor: Record<string, string>;
    selectedColors: {
      primary: string;
      secondary: string;
      tertiary: string;
      eyeColor: string;
    };
  }, type: 'body' | 'eyes' | 'mouth') => {
    let result = svgContent;
    
    if (type === 'body') {
      Object.entries(colors.primary).forEach(([_, color]) => {
        const regex = new RegExp(String(color), 'g');
        result = result.replace(regex, colors.primary[colors.selectedColors.primary]);
      });
      
      Object.entries(colors.secondary).forEach(([_, color]) => {
        const regex = new RegExp(String(color), 'g');
        result = result.replace(regex, colors.secondary[colors.selectedColors.secondary]);
      });
      
      Object.entries(colors.tertiary).forEach(([_, color]) => {
        const regex = new RegExp(String(color), 'g');
        result = result.replace(regex, colors.tertiary[colors.selectedColors.tertiary]);
      });
    } else if (type === 'eyes') {
      Object.entries(colors.eyeColor).forEach(([_, color]) => {
        const regex = new RegExp(String(color), 'g');
        result = result.replace(regex, colors.eyeColor[colors.selectedColors.eyeColor]);
      });
    }
    
    return result;
  };

  useEffect(() => {
    // Load score from chrome storage
    const loadScore = async () => {
      try {
        const data = await chrome.storage.local.get('laserCatScore');
        if (data.laserCatScore) {
          const currentScore = data.laserCatScore.score;
          setScore(currentScore);
          
          // Get highest achievement
          const achievementLevels = {
            EXPERT: { threshold: 100, title: "Destruction King" },
            INTERMEDIATE: { threshold: 50, title: "Zap Master" },
            BEGINNER: { threshold: 10, title: "Laser Newbie" }
          };
          
          for (const [level, achievement] of Object.entries(achievementLevels)) {
            if (currentScore >= achievement.threshold) {
              setAchievement(achievement.title);
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error loading score:', err);
      }
    };
    
    loadScore();
  }, []);

  useEffect(() => {
    const loadKittyPreview = async () => {
      if (!user || !userId) return;

      try {
        const prefs = await getUserPreferences(user, userId);
        if (prefs) {
          const [bodyResponse, eyesResponse, mouthResponse] = await Promise.all([
            fetch(chrome.runtime.getURL(`cattributes/body/${prefs.selectedBody}-${prefs.selectedPattern}.svg`)),
            fetch(chrome.runtime.getURL(`cattributes/eye/${prefs.selectedEye}.svg`)),
            fetch(chrome.runtime.getURL(`cattributes/mouth/${prefs.selectedMouth}.svg`))
          ]);

          const [bodySvg, eyesSvg, mouthSvg] = await Promise.all([
            bodyResponse.text(),
            eyesResponse.text(),
            mouthResponse.text()
          ]);

          setKittyParts({
            body: replaceColors(bodySvg, { ...Colors, selectedColors: prefs.selectedColors }, 'body'),
            eyes: replaceColors(eyesSvg, { ...Colors, selectedColors: prefs.selectedColors }, 'eyes'),
            mouth: mouthSvg
          });
        }
      } catch (error) {
        console.error('Error loading kitty preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKittyPreview();
  }, [user, userId]);

  const handleActivate = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'SHOW_KITTY', 
          kittyData: {
            body: kittyParts.body,
            eyes: kittyParts.eyes,
            mouth: kittyParts.mouth
          }
        });
        window.close();
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="w-full px-4 py-3 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm text-purple-600 font-medium">
              {user?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-gray-600 truncate max-w-[200px]">{user}</span>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-gray-700">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 rounded-lg px-4 py-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-600" />
            <span className="text-purple-600 font-bold">{score} points</span>
          </div>
          {achievement && (
            <div className="bg-yellow-100 rounded-lg px-4 py-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-600 font-medium">{achievement}</span>
            </div>
          )}
        </div>

{/* Kitty Display with Background */}
<div className="relative">
  <div className="w-48 h-48 rounded-full shadow-lg flex items-center justify-center relative overflow-hidden">
    {/* Background image */}
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 85%', // This will push the background up
        transform: 'scale(1.1)', 
        animation: 'subtle-float 3s ease-in-out infinite', // Gentle floating animation
      }}
    />
    {loading ? (
      <div className="loading-spinner" />
    ) : (
      <div className="kitty-svg-container relative w-40 h-40">
        <div dangerouslySetInnerHTML={{ __html: kittyParts.body }} className="absolute inset-0 z-10" />
        <div dangerouslySetInnerHTML={{ __html: kittyParts.mouth }} className="absolute inset-0 z-20" />
        <div dangerouslySetInnerHTML={{ __html: kittyParts.eyes }} className="absolute inset-0 z-30" />
      </div>
    )}
  </div>
  
  {/* Decorative circles */}
  <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-200 rounded-full" />
  <div className="absolute -bottom-1 right-2 w-3 h-3 bg-purple-300 rounded-full" />
  <div className="absolute top-2 -right-1 w-2 h-2 bg-purple-400 rounded-full" />
</div>

{/* Buttons with increased spacing */}
<div className="w-full max-w-xs flex flex-col gap-4">
  <button
    onClick={handleActivate}
    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-4 px-4 rounded-xl hover:bg-purple-700 transition-all duration-200 hover:shadow-lg"
  >
    <Play className="w-5 h-5" />
    <span>Activate Kitty</span>
  </button>

  <button
    onClick={onCustomize}
    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-4 px-4 rounded-xl hover:bg-purple-700 transition-all duration-200 hover:shadow-lg"
  >
    <Palette className="w-5 h-5" />
    <span>Customize Your Kitty</span>
  </button>
</div>
      </div>
    </div>
  );
};

const Colors = {
  primary: {
    mauveover: '#ded0ee',
    cloudwhite: '#ffffff',
    salmon: '#f4a792',
    shadowgrey: '#b1b1be',
    orangesoda: '#f7bc56',
    aquamarine: '#add5d2',
    greymatter: '#d1dadf',
    oldlace: '#ffebe9',
    cottoncandy: '#ecd1eb'
  },
  secondary: {
    peach: '#f9cfad',
    bloodred: '#ff7a7a',
    emeraldgreen: '#8be179',
    granitegrey: '#b1aeb9',
    kittencream: '#f7ebda'
  },
  tertiary: {
    barkbrown: '#886662',
    cerulian: '#385877',
    scarlet: '#ea5f5a',
    skyblue: '#83d5ff',
    coffee: '#756650',
    royalpurple: '#cf5be8',
    lemonade: '#ffef85',
    swampgreen: '#44e192',
    chocolate: '#c47e33',
    royalblue: '#5b6ee8',
    wolfgrey: '#737184'
  },
  eyeColor: {
    gold: '#fcdf35',
    bubblegum: '#ef52d1',
    limegreen: '#aef72f',
    chestnut: '#a56429',
    topaz: '#0ba09c',
    mintgreen: '#43edac',
    strawberry: '#ef4b62',
    sizzurp: '#7c40ff'
  }
};

export default MenuScreen;
```

# src/components/ScoreDisplay.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { Trophy, Target, Zap, LucideIcon } from 'lucide-react';
import { Alert, AlertTitle } from './Alert';

interface Achievement {
    threshold: number;
    title: string;
    icon: LucideIcon;
  }
  
  export const Achievements: Record<string, Achievement> = {
    BEGINNER: { threshold: 10, title: "Laser Newbie", icon: Target },
    INTERMEDIATE: { threshold: 50, title: "Zap Master", icon: Zap },
    EXPERT: { threshold: 100, title: "Destruction King", icon: Trophy }
  };
  
  interface ScoreDisplayProps {
    score: number;
    newAchievement?: { title: string } | null;
  }
  
  const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, newAchievement }) => {
    const [showScoreAnimation, setShowScoreAnimation] = useState(false);
    const [prevScore, setPrevScore] = useState(score);
    
    useEffect(() => {
      if (score !== prevScore) {
        setShowScoreAnimation(true);
        const timer = setTimeout(() => setShowScoreAnimation(false), 1000);
        setPrevScore(score);
        return () => clearTimeout(timer);
      }
    }, [score, prevScore]);
  
    const getCurrentAchievement = (): Achievement | undefined => {
      return Object.values(Achievements)
        .reverse()
        .find(achievement => score >= achievement.threshold);
    };
  
    const achievement = getCurrentAchievement();
  
    return (
      <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-50">
        <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <div className="text-purple-600 font-bold">
            Score: {score}
            {showScoreAnimation && (
              <span className="ml-2 text-green-500 animate-bounce inline-block">
                +1
              </span>
            )}
          </div>
        </div>
  
        {achievement && (
          <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
            {React.createElement(achievement.icon, {
              className: "w-5 h-5 text-yellow-500"
            })}
            <span className="text-sm font-medium text-gray-700">
              {achievement.title}
            </span>
          </div>
        )}
  
        {newAchievement && (
          <Alert className="animate-in slide-in-from-right">
            <AlertTitle className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              New Achievement Unlocked!
            </AlertTitle>
            {newAchievement.title}
          </Alert>
        )}
      </div>
    );
  };
  
  export default ScoreDisplay;
```

# src/config/firebase.ts

```ts
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

# src/contentScript.ts

```ts
// contentScript.ts
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x4A7D962BE6AF827E7f6daEf3cF264e9B3c95fCe7';
const CONTRACT_ABI = [
  "function mintKitty(bytes32 attributes, bytes32 colors) public payable returns (uint256)",
  "function getKitty(uint256 tokenId) public view returns (tuple(bytes32 attributes, bytes32 colors))",
  "function ownerOf(uint256 tokenId) public view returns (address)"
];


export {};

interface ScoreData {
  score: number;
  achievements: string[];
}

interface Position {
 x: number;
 y: number;
}

interface KittyData {
 body: string;
 eyes: string; 
 mouth: string;
}

class LaserCat {
 private kittyContainer: HTMLDivElement | null = null;
 private eyePosition = { x: 0, y: 0 };
 private score: number = 0;
 private achievements: string[] = [];
 private scoreDisplay: HTMLElement | null = null;
 
 constructor(container: HTMLDivElement) {
  this.kittyContainer = container;
  this.setupListeners();
  this.addStyles();
  this.initializeScore();
  this.createScoreDisplay();
 }

 private setupListeners() {
   document.addEventListener('click', this.handleClick.bind(this));
   document.addEventListener('mousemove', this.handleMouseMove.bind(this));
 }

 private async initializeScore() {
  try {
    const data = await chrome.storage.local.get('laserCatScore');
    if (data.laserCatScore) {
      this.score = data.laserCatScore.score;
      this.achievements = data.laserCatScore.achievements;
      this.updateScoreDisplay();
    }
  } catch (err) {
    console.error('Error loading score:', err);
  }
}

private async saveScore() {
  try {
    await chrome.storage.local.set({
      laserCatScore: {
        score: this.score,
        achievements: this.achievements
      }
    });
  } catch (err) {
    console.error('Error saving score:', err);
  }
}

private checkAchievements(): string | null {
  const Achievements = {
    BEGINNER: { threshold: 10, title: "Laser Newbie" },
    INTERMEDIATE: { threshold: 50, title: "Zap Master" },
    EXPERT: { threshold: 100, title: "Destruction King" }
  };

  for (const [id, data] of Object.entries(Achievements)) {
    if (this.score >= data.threshold && !this.achievements.includes(id)) {
      this.achievements.push(id);
      this.saveScore();
      return data.title;
    }
  }
  return null;
}
private createScoreDisplay() {
  this.scoreDisplay = document.createElement('div');
  this.scoreDisplay.className = 'laser-cat-score';
  this.scoreDisplay.setAttribute('data-score', this.score.toString());
  document.body.appendChild(this.scoreDisplay);
}

private updateScoreDisplay() {
  if (this.scoreDisplay) {
    this.scoreDisplay.setAttribute('data-score', this.score.toString());
  }
}

private showAchievementNotification(achievement: string) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="achievement-content">
      <svg class="trophy-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 8l-4-4h8l-4 4zm-6 6h12v-4H6v4zm14-8h-4l4 4v-4zm-4 12h4v-4l-4 4zm-10 0l4-4H6v4z"/>
      </svg>
      <div class="achievement-text">
        <div class="achievement-title">Achievement Unlocked!</div>
        <div class="achievement-name">${achievement}</div>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}


 private handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target || !this.kittyContainer || this.kittyContainer.contains(target)) return;

  if (this.isDestructible(target)) {
    e.preventDefault();
    e.stopPropagation();
    
    const kittyRect = this.kittyContainer.getBoundingClientRect();
    const clickPosition = { x: e.clientX, y: e.clientY };
    
    // Flash eyes
    const eyesLayer = this.kittyContainer.querySelector('div:nth-child(3)') as HTMLElement;
    if (eyesLayer) {
      // Select paths that have fill="#fff" and contain the specific eye path data
      const eyes = eyesLayer.querySelectorAll('path[fill="#fff"][d*="129.7 129.7"]');
      eyes.forEach(eye => {
        const element = eye as SVGElement;
        const originalFill = element.style.fill || element.getAttribute('fill');
        
        // Set red color
        element.style.fill = 'red';
        
        // Reset to original colors
        setTimeout(() => {
          element.style.fill = originalFill || '';
          if (!element.getAttribute('style')) {
            element.removeAttribute('style');
          }
        }, 300);
      });
    }
    
    // Update laser starting positions with eye offset
    this.createLaserBeam(
      { 
        x: kittyRect.left + (kittyRect.width * 0.35) + (this.eyePosition.x * 10), 
        y: kittyRect.top + (kittyRect.height * 0.4) + (this.eyePosition.y * 10)
      },
      clickPosition
    );
    
    this.createLaserBeam(
      { 
        x: kittyRect.left + (kittyRect.width * 0.65) + (this.eyePosition.x * 10), 
        y: kittyRect.top + (kittyRect.height * 0.4) + (this.eyePosition.y * 10)
      },
      clickPosition
    );
    
    this.createExplosion(clickPosition);
    this.playLaserSound();
    this.removeTarget(target);
  }
}

 private handleMouseMove(e: MouseEvent) {
   if (!this.kittyContainer) return;

   const kittyRect = this.kittyContainer.getBoundingClientRect();
   const kittyCenter = {
     x: kittyRect.left + (kittyRect.width / 2),
     y: kittyRect.top + (kittyRect.height / 2)
   };

   const dx = e.clientX - kittyCenter.x;
   const dy = e.clientY - kittyCenter.y;
   
   const distance = Math.sqrt(dx * dx + dy * dy);
   const maxDistance = 2.5;
   
   const movementScale = Math.min(distance / 300, 1);
   const moveX = (dx / distance) * maxDistance * movementScale;
   const moveY = (dy / distance) * maxDistance * movementScale;

   const eyesLayer = this.kittyContainer.querySelector('div:nth-child(3)') as HTMLElement;
   if (eyesLayer) {
     eyesLayer.style.transform = `translate(${moveX}px, ${moveY}px)`;
     this.eyePosition = { x: moveX, y: moveY };
   }
 }

 private createLaserBeam(start: Position, end: Position) {
  const laser = document.createElement('div');
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
  const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

  // Add red background to eyes first
  // const eyesContainer = this.kittyContainer?.querySelector('#eye') as HTMLElement;
  // if (eyesContainer) {
  //   eyesContainer.style.backgroundColor = 'red';
  //   setTimeout(() => {
  //     eyesContainer.style.backgroundColor = 'transparent';
  //   }, 300);
  // }

  laser.style.cssText = `
    position: fixed;
    height: 3px;
    background: linear-gradient(90deg, red, orange, yellow);
    box-shadow: 0 0 10px rgba(255,0,0,0.8);
    transform-origin: 0 50%;
    pointer-events: none;
    z-index: 99999;
    left: ${start.x}px;
    top: ${start.y}px;
    width: ${distance}px;
    transform: rotate(${angle}deg);
  `;

  document.body.appendChild(laser);
  setTimeout(() => laser.remove(), 300);
}

 private createExplosion(position: Position) {
   const explosion = document.createElement('div');
   explosion.style.cssText = `
     position: fixed;
     left: ${position.x}px;
     top: ${position.y}px;
     width: 30px;
     height: 30px;
     border: 3px solid violet;
     border-radius: 50%;
     transform: translate(-50%, -50%);
     pointer-events: none;
     z-index: 99998;
     animation: explosion 300ms ease-out forwards;
   `;

   document.body.appendChild(explosion);
   setTimeout(() => explosion.remove(), 300);
 }

 private playLaserSound() {
   const audio = new Audio(chrome.runtime.getURL('sounds/laser.mp3'));
   audio.volume = 0.4;
   audio.play().catch(console.error);
 }

 private removeTarget(target: HTMLElement) {
  target.style.transition = 'all 0.3s ease-out';
  target.style.transform = 'scale(0.8)';
  target.style.opacity = '0';
  setTimeout(() => {
    target.remove();
    this.score++;
    this.updateScoreDisplay();
    const newAchievement = this.checkAchievements();
    if (newAchievement) {
      this.showAchievementNotification(newAchievement);
    }
    this.saveScore();
  }, 300);
}

 private isDestructible(element: HTMLElement): boolean {
   const nonDestructibleTags = ['HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META'];
   return Boolean(
     element && 
     element.tagName &&
     !nonDestructibleTags.includes(element.tagName) &&
     !element.contains(this.kittyContainer) &&
     element !== this.kittyContainer
   );
 }

 private addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes laserBeam {
      from { opacity: 0; transform: scale(0.8) rotate(var(--angle)); }
      to { opacity: 1; transform: scale(1) rotate(var(--angle)); }
    }
    @keyframes explosion {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
    }
    svg circle, svg path, svg ellipse {
      transition: fill 0.1s ease, stroke 0.1s ease;
    }
    .laser-cat-score {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 8px 16px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: Arial, sans-serif;
        font-weight: bold;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .laser-cat-score::before {
        content: 'Score: ' attr(data-score);
        color: #6b46c1;
      }
      
      .achievement-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 99999;
        animation: slideIn 0.3s ease-out;
      }
      
      .achievement-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .trophy-icon {
        width: 24px;
        height: 24px;
        color: #eab308;
      }
      
      .achievement-title {
        font-weight: bold;
        color: #4b5563;
      }
      
      .achievement-name {
        color: #6b7280;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
  `;
  document.head.appendChild(style);
}
}

let kittyContainer: HTMLDivElement | null = null;
let laserCat: LaserCat | null = null;

function createKittyContainer(kittyData: KittyData) {
 if (kittyContainer) {
   kittyContainer.remove();
 }

 kittyContainer = document.createElement('div');
 kittyContainer.style.cssText = `
   position: fixed;
   bottom: 20px;
   right: 20px;
   width: 200px;
   height: 200px;
   z-index: 9999;
   cursor: move;
   user-select: none;
 `;
 
 const content = document.createElement('div');
 content.style.cssText = `
   width: 100%;
   height: 100%;
   position: relative;
 `;

 const bodyLayer = document.createElement('div');
 bodyLayer.innerHTML = kittyData.body;
 bodyLayer.style.cssText = 'position: absolute; inset: 0; z-index: 10;';

 const mouthLayer = document.createElement('div');
 mouthLayer.innerHTML = kittyData.mouth;
 mouthLayer.style.cssText = 'position: absolute; inset: 0; z-index: 20;';

 const eyesLayer = document.createElement('div');
 eyesLayer.innerHTML = kittyData.eyes;
 eyesLayer.style.cssText = 'position: absolute; inset: 0; z-index: 30; transition: transform 0.1s ease';

 content.appendChild(bodyLayer);
 content.appendChild(mouthLayer);
 content.appendChild(eyesLayer);
 kittyContainer.appendChild(content);
 document.body.appendChild(kittyContainer);

 makeDraggable(kittyContainer);

 return kittyContainer;
}

function makeDraggable(element: HTMLElement) {
 let isDragging = false;
 let initialX = 0, initialY = 0;

 const handleMouseDown = (e: MouseEvent) => {
   isDragging = true;
   initialX = e.clientX - element.offsetLeft;
   initialY = e.clientY - element.offsetTop;
   
   document.addEventListener('mousemove', handleMouseMove);
   document.addEventListener('mouseup', handleMouseUp);
 };

 const handleMouseMove = (e: MouseEvent) => {
   if (!isDragging) return;
   
   const newX = e.clientX - initialX;
   const newY = e.clientY - initialY;
   
   const rect = element.getBoundingClientRect();
   element.style.left = `${Math.max(0, Math.min(newX, window.innerWidth - rect.width))}px`;
   element.style.top = `${Math.max(0, Math.min(newY, window.innerHeight - rect.height))}px`;
 };

 const handleMouseUp = () => {
   isDragging = false;
   document.removeEventListener('mousemove', handleMouseMove);
   document.removeEventListener('mouseup', handleMouseUp);
 };

 element.addEventListener('mousedown', handleMouseDown);
}

async function handleMintKitty(kittyData: {
  attributes: string;
  colors: string;
  value: string;
}) {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask to use this feature');
    }

    // Type assertion to let TypeScript know ethereum exists
    const ethereum = window.ethereum as any;

    // Request account access
    await ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create Web3 provider and contract instance
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Send transaction
    const tx = await contract.mintKitty(
      kittyData.attributes,
      kittyData.colors,
      {
        value: ethers.utils.parseEther(kittyData.value)
      }
    );

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    return { receipt };
  } catch (error) {
    console.error('Minting error:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_CONTENT_SCRIPT') {
    sendResponse({ status: 'ready' });
    return true;
  }
  if (request.type === 'SHOW_KITTY') {
    const container = createKittyContainer(request.kittyData);
    laserCat = new LaserCat(container);
  } else if (request.type === 'HIDE_KITTY') {
    if (kittyContainer) {
      kittyContainer.remove();
      kittyContainer = null;
    }
  } else if (request.type === 'MINT_KITTY') {
    handleMintKitty(request.kittyData)
      .then(receipt => sendResponse(receipt))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Required for async response
  }
});
```

# src/contexts/AuthContext.tsx

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Magic } from 'magic-sdk';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  user: string | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Magic instance
const magic = new Magic(process.env.REACT_APP_MAGIC_PUBLISHABLE_KEY as string);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create or retrieve user document in Firebase
  const createOrGetUser = async (email: string) => {
    // Create a deterministic but unique ID from email
    const uid = btoa(email).replace(/[/+=]/g, '');
    const userRef = doc(db, 'users', uid);
    
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Create new user document if it doesn't exist
      await setDoc(userRef, {
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    return uid;
  };

  useEffect(() => {
    const quickAuth = async () => {
      try {
        const { cachedUser, cachedUserId } = await chrome.storage.local.get([
          'cachedUser',
          'cachedUserId'
        ]);

        if (cachedUser && cachedUserId) {
          setUser(cachedUser);
          setUserId(cachedUserId);
          setLoading(false);
          
          // Verify with Magic in background
          checkUser();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking cached auth:', error);
        setLoading(false);
      }
    };

    quickAuth();
  }, []);

  const checkUser = async () => {
    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      
      if (isLoggedIn) {
        const { email } = await magic.user.getMetadata();
        if (email) {
          const uid = await createOrGetUser(email);
          setUser(email);
          setUserId(uid);
          
          // Cache the auth state
          await chrome.storage.local.set({
            cachedUser: email,
            cachedUserId: uid
          });
        }
      } else {
        // Clear cache if not logged in
        await chrome.storage.local.remove(['cachedUser', 'cachedUserId']);
        setUser(null);
        setUserId(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      await logout();
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkUser();
  }, []);

  const login = async (email: string) => {
    try {
      setLoading(true);
      
      await magic.auth.loginWithEmailOTP({ email });
      const uid = await createOrGetUser(email);
      
      // Cache immediately after successful login
      await chrome.storage.local.set({
        cachedUser: email,
        cachedUserId: uid
      });
      
      setUser(email);
      setUserId(uid);

      // ... rest of login logic
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

// AuthContext.tsx - Update the logout function
const logout = async () => {
  try {
    setLoading(true);
    // Immediately clear state
    setUser(null);
    setUserId(null);
    
    // Clear local storage immediately
    await chrome.storage.local.remove(['cachedUser', 'cachedUserId']);
    
    // Then handle Magic logout in the background
    await magic.user.logout();
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if Magic logout fails, we've already cleared local state
  } finally {
    setLoading(false);
  }
};

  // Initialize auth state from extension storage
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const { authUser, userId: storedUserId } = await chrome.storage.local.get([
          'authUser',
          'userId'
        ]);

        if (authUser) {
          setUser(authUser);
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('Error initializing from storage:', error);
      }
    };

    initializeFromStorage();
  }, []);

  // Context value
  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    userId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

# src/declarations.d.ts

```ts
/// <reference types="react" />

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// Add MetaMask Ethereum provider type
interface Window {
  ethereum: import('ethers').providers.ExternalProvider;
}
```

# src/index.css

```css
/* index.css */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Extension dimensions */
body, #root {
  width: 400px;
  height: 600px;
}

#root {
  display: flex;
  flex-direction: column;
}

/* Style scrollbar for content area */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

/* Full page mode */
@media screen and (min-width: 401px) {
  body, #root {
    width: 100%;
    height: 100vh;
  }
}
```

# src/index.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

# src/logo.svg

This is a file of the type: SVG Image

# src/react-app-env.d.ts

```ts
/// <reference types="react-scripts" />

```

# src/services/contractService.ts

```ts
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
```

# src/services/userPreferences.ts

```ts
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface KittyPreferences {
  selectedBody: string;
  selectedPattern: string;
  selectedEye: string;
  selectedMouth: string;
  selectedColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    eyeColor: string;
  };
}

export const saveUserPreferences = async (userEmail: string, preferences: KittyPreferences, userId: string) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      email: userEmail,
      preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
};

export const getUserPreferences = async (userEmail: string, userId: string): Promise<KittyPreferences | null> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.preferences as KittyPreferences;
    }
    return null;
  } catch (error) {
    console.error('Error fetching preferences:', error);
    throw error;
  }
};
```

# src/styles.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Base Styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Extension Container */
body, #root {
  width: 400px;
  height: 600px;
  overflow: hidden;
}

#root {
  display: flex;
  flex-direction: column;
}

/* Hide Scrollbar */
::-webkit-scrollbar {
  display: none;
}

* {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Kitty SVG Styles */
.kitty-svg-container {
  width: 300px;
  height: 300px;
  position: relative;
}

.kitty-svg-container > div {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease-in-out;
}

.kitty-svg-container svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  preserveAspectRatio: xMidYMid meet;
}

/* Animations */
.kitty-svg-container svg path,
.kitty-svg-container svg circle,
.kitty-svg-container svg rect,
.kitty-svg-container svg ellipse {
  transition: fill 0.3s ease-in-out;
}

.kitty-svg-container svg circle[class*="eye"],
.kitty-svg-container svg circle[class*="pupil"],
.kitty-svg-container svg circle[class*="iris"] {
  transition: transform 0.1s ease-out;
}

/* UI Element Styles */
.button-hover-effect {
  transition: all 0.2s ease-in-out;
}

.button-hover-effect:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-picker-item {
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.color-picker-item:hover {
  transform: scale(1.1);
}

/* Loading Animation */
.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Transition Animations */
.fade-enter {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}

.fade-exit {
  opacity: 1;
}

.fade-exit-active {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 300ms, transform 300ms;
}

.alert {
  transition: all 0.3s ease-in-out;
}

/* Full Page Mode */
@media (min-width: 401px) {
  body, #root {
    width: 100%;
    height: 100vh;
  }
}

/* Add to your styles.css */
.kitty-svg-container {
  width: 200px;
  height: 200px;
  position: relative;
  margin: 0 auto;
}

.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}


```

# src/types/types.ts

```ts
export type PrimaryColorType = {
  mauveover: string;
  cloudwhite: string;
  salmon: string;
  shadowgrey: string;
  orangesoda: string;
  aquamarine: string;
  greymatter: string;
  oldlace: string;
  cottoncandy: string;
};

// src/types/types.ts

export enum BodyType {
  mainecoon = 'mainecoon',
  cymric = 'cymric',
  laperm = 'laperm',
  munchkin = 'munchkin',
  sphynx = 'sphynx',
  ragamuffin = 'ragamuffin',
  himalayan = 'himalayan',
  chartreux = 'chartreux',
}

export enum PatternType {
  spock = 'spock',
  tigerpunk = 'tigerpunk',
  calicool = 'calicool',
  luckystripe = 'luckystripe',
  jaguar = 'jaguar',
  totesbasic = 'totesbasic',
}

export enum EyeType {
  wingtips = 'wingtips',
  fabulous = 'fabulous',
  otaku = 'otaku',
  raisedbrow = 'raisedbrow',
  simple = 'simple',
  crazy = 'crazy',
  thicccbrowz = 'thicccbrowz',
  googly = 'googly',
}

export enum MouthType {
  whixtensions = 'whixtensions',
  dali = 'dali',
  saycheese = 'saycheese',
  beard = 'beard',
  tongue = 'tongue',
  happygokitty = 'happygokitty',
  pouty = 'pouty',
  soserious = 'soserious',
  gerbil = 'gerbil',
  exclusive = 'exclusive'
}




export type ColorKeyType = keyof PrimaryColorType;
```

# tailwind.config.js

```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          mauveover: '#ded0ee',
          cloudwhite: '#ffffff',
          salmon: '#f4a792',
          shadowgrey: '#b1b1be',
          orangesoda: '#f7bc56',
          aquamarine: '#add5d2',
          greymatter: '#d1dadf',
          oldlace: '#ffebe9',
          cottoncandy: '#ecd1eb'
        }
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      minHeight: {
        '64': '16rem',
      }
    },
  },
  plugins: [],
}
```

# tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "jsx": "react-jsx",
    "outDir": "./build"
  },
  "include": [
    "src",
    "src/declarations.d.ts"
  ],
}
```

# webpack.config.js

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

module.exports = {
 mode: 'production',
 entry: {
   popup: path.resolve(__dirname, 'src/index.tsx'),
   background: path.resolve(__dirname, 'src/background.js'),
   contentScript: path.resolve(__dirname, 'src/contentScript.ts') 
 },
 output: {
   path: path.resolve(__dirname, 'build'),
   filename: '[name].js',
   clean: true
 },
 resolve: {
   extensions: ['.tsx', '.ts', '.js', '.jsx'],
   alias: {
     '@': path.resolve(__dirname, 'src/'),
   }
 },
 module: {
   rules: [
     {
       test: /\.tsx?$/,
       use: 'ts-loader',
       exclude: /node_modules/
     },
     {
       test: /\.css$/,
       use: ['style-loader', 'css-loader', 'postcss-loader']
     },
     {
       test: /\.svg$/,
       type: 'asset/resource'
     },
     {
       test: /\.(png|jpg|jpeg|gif)$/i,
       type: 'asset/resource'
     },
     {
      test: /\.(png|jpg|jpeg|gif|webp)$/i,
      type: 'asset/resource'
    }
   ]
 },
 plugins: [
   new Dotenv({
     systemvars: true,
   }),
   new webpack.DefinePlugin({
     'process.env': JSON.stringify(process.env)
   }),
   new HtmlWebpackPlugin({
     template: path.resolve(__dirname, 'public/index.html'),
     chunks: ['popup']
   }),
   new CopyPlugin({
     patterns: [
       { 
         from: "public/manifest.json",
         to: "manifest.json"
       },
       { 
         from: "public/icon.png",
         to: "icon.png"
       },
       {
         from: "public/cattributes",
         to: "cattributes"
       },
       {
         from: "src/background.js",
         to: "background.js"
       }
     ]
   })
 ]
};
```

