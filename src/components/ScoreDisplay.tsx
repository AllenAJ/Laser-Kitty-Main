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