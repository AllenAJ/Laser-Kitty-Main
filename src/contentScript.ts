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