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