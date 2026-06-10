/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Cpu, Compass, Coins, Sparkles, RotateCcw, 
  Gamepad2, BookOpen, Heart, Zap, Dice5, Image as ImageIcon, 
  ArrowRight, Lock, Plus, Wand2, FileText, ChevronRight, PenTool,
  Save, Download, Check, AlertCircle, RefreshCw, Star
} from 'lucide-react';
import { GAME_PRESETS } from './presets';
import { CharacterState, Scene, Choice, AdventureLog, StatType } from './types';

// Web Audio API Retro synthesizer utility
const playSound = (type: 'button' | 'success' | 'fail' | 'dice' | 'levelUp' | 'damage') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'button') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'fail') {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'damage') {
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'dice') {
      // Noise simulation
      osc.frequency.setValueAtTime(100 + Math.random() * 200, ctx.currentTime);
      osc.frequency.setValueAtTime(150 + Math.random() * 200, ctx.currentTime + 0.05);
      osc.frequency.setValueAtTime(250 + Math.random() * 150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'levelUp') {
      osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.08); // E4
      osc.frequency.setValueAtTime(392.00, ctx.currentTime + 0.16); // G4
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.24); // C5
      osc.frequency.setValueAtTime(622.25, ctx.currentTime + 0.32); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    }
  } catch (e) {
    // Fail silently if browser blocks audio autoplay
  }
};

export default function App() {
  // Game Modes: 'select_preset' | 'create_custom' | 'playing' | 'ending'
  const [gameState, setGameState] = useState<'select_preset' | 'create_custom' | 'playing'>('select_preset');
  
  // Custom Infinite AI GM setup variables
  const [customSetting, setCustomSetting] = useState('在被遺忘魔界廢墟的科幻修仙世界，仙人穿著奈米機甲，手持電子飛劍。');
  const [customCharName, setCustomCharName] = useState('陸無雙');
  const [customClassName, setCustomClassName] = useState('奈米劍修');
  const [customStats, setCustomStats] = useState({ str: 12, int: 10, dex: 10 });
  const statPointsLeft = 32 - (customStats.str + customStats.int + customStats.dex);

  // Active Game State Variables
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fantasy');
  const [characterState, setCharacterState] = useState<CharacterState | null>(null);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [isAiExtendedMode, setIsAiExtendedMode] = useState<boolean>(true);
  const [adventureLogs, setAdventureLogs] = useState<AdventureLog[]>([]);
  const [customAction, setCustomAction] = useState<string>('');
  
  // Illustrations / Dynamic Scene Artwork url & states
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [isDrawingImage, setIsDrawingImage] = useState<boolean>(false);

  // API Call loader
  const [storyLoading, setStoryLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Interactive Dice Roll Overlays
  const [showDicePanel, setShowDicePanel] = useState<boolean>(false);
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [diceRollValue, setDiceRollValue] = useState<number>(10);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceSuccess, setDiceSuccess] = useState<boolean | null>(null);
  const [useMpFocus, setUseMpFocus] = useState<boolean>(false); // Cost 15 MP to get +2 modifier

  // HTML references for auto-scroll the log container
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto Scroll logs
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [adventureLogs]);

  // Handle Level Up Check
  const checkLevelUp = (currentState: CharacterState, expGained: number): CharacterState => {
    let newExp = currentState.exp + expGained;
    let newLvl = currentState.lvl;
    let upgraded = false;
    
    // Level up boundary = lvl * 100
    while (newExp >= newLvl * 100) {
      newExp -= newLvl * 100;
      newLvl += 1;
      upgraded = true;
    }

    if (upgraded) {
      playSound('levelUp');
      const boostedStats = {
        str: currentState.stats.str + 1,
        int: currentState.stats.int + 1,
        dex: currentState.stats.dex + 1,
      };
      
      const newMaxHp = currentState.maxHp + 15;
      const newMaxMp = currentState.maxMp + 10;

      addLog({
        id: `sys_lvl_${Date.now()}`,
        type: 'system',
        text: `✨ 升級！你達到了等級 ${newLvl}！所有基礎屬性提升 1 點。生命值上限提升 15，魔力值上限提升 10！`,
        timestamp: new Date().toLocaleTimeString()
      });

      return {
        ...currentState,
        lvl: newLvl,
        exp: newExp,
        stats: boostedStats,
        maxHp: newMaxHp,
        maxMp: newMaxMp,
        hp: newMaxHp, // heal to max on level up
        mp: newMaxMp,
      };
    }

    return {
      ...currentState,
      exp: newExp
    };
  };

  // Log Appender Helper
  const addLog = (log: AdventureLog) => {
    setAdventureLogs(prev => [...prev, log]);
  };

  // Convert Stats score to standard modifier
  const getModifier = (score: number) => {
    return Math.floor((score - 10) / 2);
  };

  // Initialize selected Preset Game
  const startPresetGame = (presetId: string, charClassIdx: number) => {
    playSound('success');
    const preset = GAME_PRESETS.find(p => p.id === presetId)!;
    const selectedClass = preset.characterClasses[charClassIdx];

    const initialCharState: CharacterState = {
      name: `探險者 · 艾爾`,
      className: selectedClass.className,
      stats: { ...selectedClass.stats },
      hp: selectedClass.hp,
      maxHp: selectedClass.hp,
      mp: selectedClass.mp,
      maxMp: selectedClass.mp,
      gold: 50,
      inventory: [...selectedClass.initialItems],
      lvl: 1,
      exp: 0
    };

    setCharacterState(initialCharState);
    setCurrentScene(preset.initialScene);
    setSceneImageUrl(null);
    setGameState('playing');
    setAdventureLogs([
      {
        id: 'start-0',
        type: 'system',
        text: `⚔️ 冒險開始：進入『${preset.title}』故事劇本。`,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: 'start-1',
        type: 'system',
        text: `角色職業：${selectedClass.className}。初始屬性：力量 ${selectedClass.stats.str}、智慧 ${selectedClass.stats.int}、敏捷 ${selectedClass.stats.dex}。`,
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: 'start-2',
        type: 'story',
        text: preset.initialScene.storyText,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Initialize custom Infinite AI Game
  const startCustomGame = async () => {
    if (statPointsLeft !== 0) {
      playSound('fail');
      alert(`請恰好在創角點數分配 32 點！當前配置已使用了 ${customStats.str + customStats.int + customStats.dex} 點。`);
      return;
    }
    
    playSound('button');
    setStoryLoading(true);
    setApiError(null);

    const initialCharState: CharacterState = {
      name: customCharName || '無名冒險者',
      className: customClassName || '自由冒險家',
      stats: { ...customStats },
      hp: 100,
      maxHp: 100,
      mp: 80,
      maxMp: 80,
      gold: 150,
      inventory: ['新手探險背包', '應急乾糧'],
      lvl: 1,
      exp: 0
    };

    try {
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterState: initialCharState,
          storySetting: {
            title: `AI 自訂冒險: ${customClassName}`,
            description: customSetting,
            difficulty: '動態平衡',
            style: '玩家自創'
          },
          logsHistory: [],
          actionTaken: `「開啟自訂冒險世界：${customSetting}。主角是一位名為${initialCharState.name}的${initialCharState.className}，背包裝有新手裝備，即刻踏上奇妙旅程，在危機中尋找生路。」`
        })
      });

      if (!response.ok) {
        throw new Error('伺服器未能在第一時間回應，請查看伺服器密鑰設置。');
      }

      const generatedScene: Scene = await response.json();

      setCharacterState(initialCharState);
      setCurrentScene(generatedScene);
      setSceneImageUrl(null);
      setGameState('playing');
      setAdventureLogs([
        {
          id: 'custom-start-0',
          type: 'system',
          text: `🌌 構築星空：AI 動態構築新紀元舞台中...`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'custom-start-1',
          type: 'system',
          text: `角色誕生：${initialCharState.name} (${initialCharState.className})。`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'custom-start-log',
          type: 'story',
          text: generatedScene.storyText,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      
      playSound('success');
    } catch (e: any) {
      setApiError(e.message || '連線至 AI 遊戲主持人伺服器失敗，請洽詢管理員。');
    } finally {
      setStoryLoading(false);
    }
  };

  // Generate Current Scene Image via Imagen on requirement
  const drawCurrentSceneImage = async () => {
    if (!currentScene) return;
    playSound('button');
    setIsDrawingImage(true);
    try {
      const res = await fetch('/api/story/draw-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentScene.illustrationPrompt || currentScene.storyText })
      });
      if (!res.ok) {
        throw new Error('無法繪製影像。請檢視 Secrets 視窗配置。');
      }
      const data = await res.json();
      setSceneImageUrl(data.imageUrl);
      addLog({
        id: `img_${Date.now()}`,
        type: 'system',
        text: '🖼️ AI 繪圖主持人已經生動在幕底上塗抹好符合當前氛圍的手繪插圖！',
        timestamp: new Date().toLocaleTimeString()
      });
      playSound('success');
    } catch (error) {
      console.error(error);
      alert('AI 繪圖主機暫時忙碌。不過別氣餒，你可以繼續用文字想像旅程！');
    } finally {
      setIsDrawingImage(false);
    }
  };

  // Handle Selected Option or custom input selection
  const handleChoiceClick = (choice: Choice) => {
    playSound('button');
    if (choice.requiresCheck) {
      // Prompt Dice Roll Panel
      setPendingChoice(choice);
      setUseMpFocus(false);
      setDiceSuccess(null);
      setShowDicePanel(true);
    } else if (choice.requiredItem) {
      // Direct pass since client-side handles unlock validations
      processNextScene(choice.text, `使用物件門檻：『${choice.requiredItem}』順利解鎖通往下一區的大門。`);
    } else {
      // Direct pass
      processNextScene(choice.text, `抉擇：${choice.text}`);
    }
  };

  // Execute Dice Roll trigger
  const executeDiceRoll = () => {
    if (!pendingChoice || !characterState) return;
    playSound('dice');
    setIsRolling(true);
    setDiceSuccess(null);

    let tick = 0;
    const interval = setInterval(() => {
      setDiceRollValue(Math.floor(Math.random() * 20) + 1);
      tick++;
      if (tick > 10) {
        clearInterval(interval);
        
        // Settle Value
        const finalRoll = Math.floor(Math.random() * 20) + 1;
        setDiceRollValue(finalRoll);

        const checkType = pendingChoice.requiresCheck as StatType;
        let statValue = 10;
        if (checkType === 'STR') statValue = characterState.stats.str;
        if (checkType === 'INT') statValue = characterState.stats.int;
        if (checkType === 'DEX') statValue = characterState.stats.dex;

        const modifier = getModifier(statValue);
        const focusBonus = useMpFocus ? 2 : 0;
        const totalValue = finalRoll + modifier + focusBonus;
        const diff = pendingChoice.difficulty || 10;
        const success = totalValue >= diff;

        setDiceSuccess(success);
        setIsRolling(false);
        playSound(success ? 'success' : 'damage');

        // Consume MP if Focus is selected
        if (useMpFocus) {
          setCharacterState(prev => prev ? {
            ...prev,
            mp: Math.max(0, prev.mp - 15)
          } : null);
        }
      }
    }, 80);
  };

  // Roll result confirmation & loading next scenes
  const confirmDiceResultAndContinue = () => {
    if (!pendingChoice || diceSuccess === null || !characterState) return;
    
    setShowDicePanel(false);
    const checkType = pendingChoice.requiresCheck as StatType;
    let statValue = 10;
    if (checkType === 'STR') statValue = characterState.stats.str;
    if (checkType === 'INT') statValue = characterState.stats.int;
    if (checkType === 'DEX') statValue = characterState.stats.dex;

    const modifier = getModifier(statValue);
    const totalScore = diceRollValue + modifier + (useMpFocus ? 2 : 0);
    const resultCh = diceSuccess ? '成功' : '失敗';
    
    const outcomeText = `進行投骰判定 [${checkType === 'STR' ? '力量' : checkType === 'INT' ? '智慧' : '敏捷'}] (難度 DC ${pendingChoice.difficulty})：投出 1D20=${diceRollValue} + 加成 ${modifier}${useMpFocus ? ' + 專注 2' : ''} = 總分 ${totalScore} (判定 ${resultCh})`;

    addLog({
      id: `dice_${Date.now()}`,
      type: 'dice',
      text: outcomeText,
      timestamp: new Date().toLocaleTimeString()
    });

    const actionContext = `【屬性判定：${resultCh}】玩家面對機關：『${pendingChoice.text}』。進行了 ${checkType} 判定，難度為級別 ${pendingChoice.difficulty}。玩家骰出了 1D20=${diceRollValue} 並附加了加成，判定結果為 ${resultCh}。請主持人寫出後續影響。`;

    processNextScene(pendingChoice.text, actionContext);
    setPendingChoice(null);
  };

  // Submit custom textual action
  const handleCustomActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim()) return;
    playSound('button');
    
    const userAction = customAction.trim();
    addLog({
      id: `action_${Date.now()}`,
      type: 'choice',
      text: `👉 你的自訂行動：${userAction}`,
      timestamp: new Date().toLocaleTimeString()
    });

    processNextScene(userAction, `玩家發揮創意採取了自定義行動：『${userAction}』。請主持人將這個行動融入當前故事地殼中，提供符合邏輯且精采的事實反饋。`);
    setCustomAction('');
  };

  // Request next scene node from backend API (Gemini GM)
  const processNextScene = async (choiceText: string, actionContext: string) => {
    if (!characterState || !currentScene) return;
    
    setStoryLoading(true);
    setApiError(null);

    // Save previous state for recovery
    try {
      const activePreset = GAME_PRESETS.find(p => p.id === selectedPresetId);
      const isDynamic = selectedPresetId === 'custom_infinite';
      
      const payload = {
        characterState: characterState,
        storySetting: isDynamic ? {
          title: `自修世界`,
          description: customSetting,
          style: '玩家自創'
        } : {
          title: activePreset?.title,
          description: activePreset?.description,
          style: activePreset?.style
        },
        logsHistory: adventureLogs.filter(log => log.type === 'story' || log.type === 'choice'),
        actionTaken: actionContext
      };

      const res = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('伺服器判定未正常回應。可切換回到預置情境或檢查 AI 密鑰配置。');
      }

      const nextScene: Scene = await res.json();
      
      // Update character effects
      let updatedCharState = { ...characterState };
      const effects = nextScene.playerEffects;

      if (effects) {
        if (effects.hpChange) {
          updatedCharState.hp = Math.max(0, Math.min(updatedCharState.maxHp, updatedCharState.hp + effects.hpChange));
          if (effects.hpChange < 0) playSound('damage');
        }
        if (effects.mpChange) {
          updatedCharState.mp = Math.max(0, Math.min(updatedCharState.maxMp, updatedCharState.mp + effects.mpChange));
        }
        if (effects.goldChange) {
          updatedCharState.gold = Math.max(0, updatedCharState.gold + effects.goldChange);
        }
        if (effects.gainItems && effects.gainItems.length > 0) {
          updatedCharState.inventory = [...updatedCharState.inventory, ...effects.gainItems];
        }
        if (effects.loseItems && effects.loseItems.length > 0) {
          updatedCharState.inventory = updatedCharState.inventory.filter(item => !effects.loseItems?.includes(item));
        }
        
        // Level exp award
        if (effects.expChange) {
          updatedCharState = checkLevelUp(updatedCharState, effects.expChange);
        }
      }

      // Automatically die if HP reaches 0
      if (updatedCharState.hp <= 0) {
        nextScene.isEnding = true;
        nextScene.endingType = 'death';
        nextScene.storyText = `💀 你的生命值耗盡落入塵土。\n\n${nextScene.storyText || '在寂靜的冷雨中，你的視線逐漸模糊。冒險以遺憾與落幕畫下了休止符。'}`;
      }

      // Append state logs
      addLog({
        id: `choice_${Date.now()}`,
        type: 'choice',
        text: `【選擇項目】：${choiceText}`,
        timestamp: new Date().toLocaleTimeString()
      });

      if (effects?.logMessage) {
        addLog({
          id: `eff_${Date.now()}`,
          type: 'effect',
          text: `📢 GM 反饋：${effects.logMessage}`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      addLog({
        id: `story_${Date.now()}`,
        type: 'story',
        text: nextScene.storyText,
        timestamp: new Date().toLocaleTimeString()
      });

      setCharacterState(updatedCharState);
      setCurrentScene(nextScene);
      setSceneImageUrl(null); // default reset for new imagery area
      playSound('success');

    } catch (e: any) {
      setApiError(e.message || '無法與 AI 主持人建立資料連結。');
      playSound('fail');
    } finally {
      setStoryLoading(false);
    }
  };

  // Interactive Item Consumable uses (Like Potion in character sheet)
  const useInventoryItem = (itemName: string) => {
    if (!characterState) return;
    playSound('button');
    
    let healHp = 0;
    let healMp = 0;
    let effectMessage = '';

    if (itemName === '治療藥水') {
      healHp = 40;
      effectMessage = '喝下了『治療藥水』，生命值恢復了 40 點！';
    } else if (itemName === '魔力藥膏') {
      healMp = 30;
      effectMessage = '抹上了『魔力藥膏』，魔力值恢復了 30 點！';
    } else if (itemName === '強化能量飲料') {
      healHp = 25;
      healMp = 15;
      effectMessage = '一口飲下『強化能量飲料』。瞬間充滿動力！HP+25, MP+15。';
    } else if (itemName === '超載補丁組') {
      healMp = 50;
      effectMessage = '接上『超載補丁組』，系統冷卻完成！魔力值 MP 回復了 50 點。';
    } else if (itemName === '應急乾糧') {
      healHp = 15;
      effectMessage = '咀嚼乾癟的『應急乾糧』，雖然難吃但體力稍微恢復了 15 點。';
    } else {
      alert(`『${itemName}』為解密道具或任務物件，無法在此處直接消耗服用！`);
      return;
    }

    // Process Consume
    setCharacterState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + healHp),
        mp: Math.min(prev.maxMp, prev.mp + healMp),
        inventory: prev.inventory.filter(i => i !== itemName)
      };
    });

    addLog({
      id: `consume_${Date.now()}`,
      type: 'effect',
      text: `🎒 背包反饋：${characterState.name}${effectMessage}`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Save game to LocalStorage
  const saveGameToLocal = () => {
    if (!characterState || !currentScene) return;
    playSound('success');
    const saveData = {
      characterState,
      currentScene,
      adventureLogs,
      selectedPresetId,
      sceneImageUrl,
      isAiExtendedMode
    };
    localStorage.setItem('ai_retro_rpg_checkpoint', JSON.stringify(saveData));
    alert('💾 冒險存檔成功！已安全封裝進本機核心中，隨時可以使用【載入進度】繼續旅行。');
  };

  // Load game from LocalStorage
  const loadGameFromLocal = () => {
    playSound('button');
    const saved = localStorage.getItem('ai_retro_rpg_checkpoint');
    if (!saved) {
      alert('未在本機找到任何歷史存檔檔案！');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setCharacterState(parsed.characterState);
      setCurrentScene(parsed.currentScene);
      setAdventureLogs(parsed.adventureLogs);
      setSelectedPresetId(parsed.selectedPresetId || 'fantasy');
      setSceneImageUrl(parsed.sceneImageUrl || null);
      setIsAiExtendedMode(parsed.isAiExtendedMode ?? true);
      setGameState('playing');
      playSound('success');
    } catch {
      alert('存檔檔案已毀損或無法正確解析。');
    }
  };

  // Reset to Menu
  const resetToMainMenu = () => {
    playSound('button');
    if (confirm('確定要回到主目錄嗎？這會遺失你當前未進行 [儲存檔案] 的最新歷程。')) {
      setGameState('select_preset');
      setCharacterState(null);
      setCurrentScene(null);
      setAdventureLogs([]);
      setSceneImageUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#c5a059] selection:text-black">
      
      {/* Dynamic Header */}
      <header className="h-16 px-4 md:px-8 border-b border-[#2d2d35] flex items-center justify-between bg-[#16161a] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#c5a059]/10 rounded border border-[#c5a059]/30">
            <Shield className="w-5 h-5 text-[#c5a059]" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base md:text-lg tracking-wider text-[#c5a059]">影之扉：AI 隨身文字冒險 RPG</h1>
            <p className="text-[10px] text-[#94a3b8] tracking-widest uppercase">Traditional Chinese TRPG Engine</p>
          </div>
        </div>
        
        {/* Save Load Buttons & States */}
        <div className="flex items-center gap-2 md:gap-4 text-xs">
          {gameState === 'playing' && (
            <>
              <button 
                onClick={saveGameToLocal} 
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e2025] hover:bg-[#c5a059]/10 border border-[#2d2d35] hover:border-[#c5a059]/50 rounded cursor-pointer transition-colors text-[#94a3b8] hover:text-[#c5a059]"
                title="儲存進度"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden md:inline">儲存進度</span>
              </button>
              
              <button 
                onClick={resetToMainMenu}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/30 rounded cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>結束冒險</span>
              </button>
            </>
          )}

          {gameState !== 'playing' && (
            <button 
              onClick={loadGameFromLocal} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/30 rounded text-[#c5a059] cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>載入本機進度</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {gameState === 'select_preset' && (
        <main id="lobby" className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
          
          {/* Slogan Banner */}
          <div className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#c5a059] mb-3 block">Infinite Narrative Sandbox</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#e2e8f0] via-[#c5a059] to-[#ebd2a4] mb-4">
              寫下你的抉擇，交由命運與 AI 裁決
            </h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              融合傳統桌上 RPG 的擲骰判定與 AI 即時跑團主持，在每一次的故事分支中寫下你的足跡。使用預設模組或自由編織宇宙設定，開啟無限可能。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-10">
            
            {/* Left Box: Presets */}
            <div className="bg-[#16161a] border border-[#2d2d35] rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Gamepad2 className="w-5 h-5 text-[#c5a059]" />
                  <h3 className="font-serif text-lg font-bold text-[#c5a059]">選擇劇本模組直接出發</h3>
                </div>
                
                {/* Preset List */}
                <div className="space-y-4">
                  {GAME_PRESETS.map((preset) => (
                    <div 
                      key={preset.id}
                      onClick={() => { setSelectedPresetId(preset.id); playSound('button'); }}
                      className={`p-4 rounded border cursor-pointer transition-all ${
                        selectedPresetId === preset.id 
                          ? 'bg-[#c5a059]/5 border-[#c5a059] text-white shadow-md shadow-[#c5a059]/5' 
                          : 'bg-[#0f1115] border-[#2d2d35]/60 hover:border-[#c5a059]/30 text-[#94a3b8] hover:text-[#e2e8f0]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-serif font-bold text-base text-[#e2e8f0]">{preset.title}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#2d2d35] text-[#94a3b8] rounded">{preset.style}</span>
                      </div>
                      <p className="text-xs leading-relaxed mb-3">{preset.description}</p>
                      
                      <div className="flex justify-between text-[11px] text-[#94a3b8]/80 border-t border-white/5 pt-2">
                        <span>難度：{preset.difficulty}</span>
                        <span>包含 {preset.characterClasses.length} 種特色職業</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Class Selectors inside Left Preset */}
              {selectedPresetId !== 'custom_infinite' && (
                <div className="mt-6 border-t border-[#2d2d35] pt-6">
                  <h4 className="text-xs font-serif text-[#94a3b8] tracking-widest uppercase mb-3 text-center">— 選擇冒險者角色 —</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {GAME_PRESETS.find(p => p.id === selectedPresetId)?.characterClasses.map((charClass, idx) => (
                      <button
                        key={idx}
                        onClick={() => startPresetGame(selectedPresetId, idx)}
                        className="w-full text-left p-3 bg-[#0a0a0c] hover:bg-[#c5a059]/10 border border-[#2d2d35] rounded hover:border-[#c5a059]/60 group text-xs flex justify-between items-center cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-serif font-bold text-[#e2e8f0] group-hover:text-[#c5a059] transition-colors">{charClass.className}</div>
                          <div className="text-[10px] text-[#94a3b8] mt-0.5">{charClass.description}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[#c5a059]">
                          <span className="text-[10px] text-[#94a3b8]">啟程</span>
                          <ChevronRight className="w-4.5 h-4.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Custom AI GM Infinite Creation */}
            <div className="bg-[#16161a] border border-[#2d2d35] rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#c5a059]" />
                  <h3 className="font-serif text-lg font-bold text-[#c5a059]">AI GM 無限自由模式</h3>
                </div>
                
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                  跳入完全自造的世界，你可以在下方自訂任何世界觀設定與主角身份，極致考驗 AI Dynamic GM 的劇本編排力與故事延展力。
                </p>

                {/* Setup Inputs */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[#94a3b8] mb-1.5 font-bold">1. 世界背景設定 (可自由編撰或修改)</label>
                    <textarea
                      value={customSetting}
                      onChange={(e) => setCustomSetting(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-[#0a0a0c] border border-[#2d2d35] rounded text-[#e2e8f0] focus:border-[#c5a059] focus:outline-none resize-none leading-relaxed"
                      placeholder="例如：19世紀倫敦街頭的魔物怪奇物語、奇異仙俠、或是末世求生"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#94a3b8] mb-1.5 font-bold">2. 角色姓名</label>
                      <input
                        type="text"
                        value={customCharName}
                        onChange={(e) => setCustomCharName(e.target.value)}
                        className="w-full p-2 bg-[#0a0a0c] border border-[#2d2d35] rounded text-[#e2e8f0] focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#94a3b8] mb-1.5 font-bold">3. 角色流派/職業</label>
                      <input
                        type="text"
                        value={customClassName}
                        onChange={(e) => setCustomClassName(e.target.value)}
                        className="w-full p-2 bg-[#0a0a0c] border border-[#2d2d35] rounded text-[#e2e8f0] focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Attribute stats allocating */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[#94a3b8] font-bold">4. 基礎屬性點數分配</label>
                      <span className={`text-[11px] font-bold ${statPointsLeft === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        剩餘可用：{statPointsLeft} 點 (目標 32)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#0a0a0c] border border-[#2d2d35] p-3 rounded text-center">
                      {/* Strength */}
                      <div>
                        <div className="text-[10px] text-[#94a3b8] mb-1">力量 (STR)</div>
                        <div className="flex justify-between items-center px-1">
                          <button 
                            disabled={customStats.str <= 6}
                            onClick={() => { setCustomStats(p => ({ ...p, str: p.str - 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >-</button>
                          <span className="font-bold text-[#c5a059]">{customStats.str}</span>
                          <button 
                            disabled={statPointsLeft <= 0 || customStats.str >= 18}
                            onClick={() => { setCustomStats(p => ({ ...p, str: p.str + 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >+</button>
                        </div>
                      </div>

                      {/* Intelligence */}
                      <div>
                        <div className="text-[10px] text-[#94a3b8] mb-1">智慧 (INT)</div>
                        <div className="flex justify-between items-center px-1">
                          <button 
                            disabled={customStats.int <= 6}
                            onClick={() => { setCustomStats(p => ({ ...p, int: p.int - 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >-</button>
                          <span className="font-bold text-[#c5a059]">{customStats.int}</span>
                          <button 
                            disabled={statPointsLeft <= 0 || customStats.int >= 18}
                            onClick={() => { setCustomStats(p => ({ ...p, int: p.int + 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >+</button>
                        </div>
                      </div>

                      {/* Dexterity */}
                      <div>
                        <div className="text-[10px] text-[#94a3b8] mb-1">敏捷 (DEX)</div>
                        <div className="flex justify-between items-center px-1">
                          <button 
                            disabled={customStats.dex <= 6}
                            onClick={() => { setCustomStats(p => ({ ...p, dex: p.dex - 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >-</button>
                          <span className="font-bold text-[#c5a059]">{customStats.dex}</span>
                          <button 
                            disabled={statPointsLeft <= 0 || customStats.dex >= 18}
                            onClick={() => { setCustomStats(p => ({ ...p, dex: p.dex + 1 })); playSound('button'); }}
                            className="text-xs px-1.5 py-0.5 bg-[#16161a] border border-[#2d2d35] hover:border-[#c5a059] hover:text-[#c5a059] rounded disabled:opacity-40"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Infinite Game Button */}
              <button
                disabled={storyLoading || statPointsLeft !== 0}
                onClick={startCustomGame}
                className="w-full py-3 bg-[#c5a059] text-black font-bold font-serif uppercase tracking-widest rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ebd2a4] hover:shadow-lg transition-all mt-6 text-xs flex justify-center items-center gap-2"
              >
                {storyLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI 思考並撰寫劇本中...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>創建角色，開啟 AI 命運之旅</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick instructions in bottom banner */}
          <div className="bg-[#16161a] border border-[#2d2d35] rounded p-4 text-center text-xs text-[#94a3b8]">
            ⚙️ 提示：當前為伺服器端連結模式，密鑰已安全防護。點擊上方【載入本機進度】即可回復上次玩的未完歷程。
          </div>
        </main>
      )}

      {/* Primary In-Game Engine Panel */}
      {gameState === 'playing' && characterState && currentScene && (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-[#2d2d35] overflow-hidden">
          
          {/* Left Block Story screen (lg:8 cols) */}
          <section id="story-viewport" className="lg:col-span-8 bg-[#0a0a0c] p-4 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-4rem)]">
            
            <div className="mb-6">
              {/* Location indicator */}
              <div className="flex items-center justify-between border-b border-[#2d2d35] pb-3 mb-6">
                <div>
                  <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#c5a059]">冒險主線情境</span>
                  <p className="text-xs text-[#94a3b8] mt-0.5">當前紀元：{GAME_PRESETS.find(p => p.id === selectedPresetId)?.title || 'AI 自定義無限舞台'}</p>
                </div>
                
                {/* AI Illustrate Scene switch */}
                <button
                  disabled={isDrawingImage || storyLoading}
                  onClick={drawCurrentSceneImage}
                  className="flex items-center gap-1 text-[10px] md:text-xs bg-[#16161a] hover:bg-[#c5a059]/10 border border-[#2d2d35] hover:border-[#c5a059]/50 px-2.5 py-1.5 rounded text-[#94a3b8] hover:text-[#c5a059] cursor-pointer"
                >
                  {isDrawingImage ? (
                    <>
                      <RefreshCw className="w-3 md:w-3.5 h-3 md:h-3.5 animate-spin text-[#c5a059]" />
                      <span>正在繪製影像卡...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 md:w-3.5 h-3 md:h-3.5" />
                      <span>AI 生物油畫繪製</span>
                    </>
                  )}
                </button>
              </div>

              {/* API Loader Block / Errors panel */}
              {apiError && (
                <div className="mb-6 p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-200 text-xs flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <span className="font-bold">連線異常！</span>
                    <p className="mt-1 leading-relaxed">{apiError}</p>
                    <button 
                      onClick={() => setApiError(null)} 
                      className="mt-2 text-[10px] text-red-400 font-bold underline hover:text-red-300"
                    >一鍵關閉通知</button>
                  </div>
                </div>
              )}

              {/* Dynamic Illustrated Picture Card */}
              {sceneImageUrl && (
                <div className="mb-6 rounded-lg overflow-hidden border border-[#2d2d35] relative group shadow-2xl">
                  <img 
                    src={sceneImageUrl} 
                    alt="AI Scene Illustration" 
                    className="w-full h-auto object-cover max-h-[300px] transition-transform duration-700 hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <p className="text-[10px] text-[#c5a059] italic bg-[#0a0a0c]/60 px-2.5 py-1 rounded backdrop-blur-xs border border-[#c5a059]/20 truncate w-full">
                      🔍 繪圖插畫提示：{currentScene.illustrationPrompt || '神秘遠古迴廊...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Story text (Immersive typography) */}
              <div className="bg-[#16161a] border border-[#2d2d35]/60 rounded-lg p-5 md:p-6 shadow-md mb-8">
                <div className="font-serif text-base md:text-lg leading-relaxed text-[#e2e8f0] font-[400] whitespace-pre-line tracking-wide">
                  {currentScene.storyText}
                </div>
              </div>

            </div>

            {/* Choices Grid */}
            <div className="mt-auto pt-4 border-t border-[#2d2d35]">
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#94a3b8] font-bold">📢 命運決策選項</span>
                {storyLoading && (
                  <span className="text-[11px] text-[#c5a059] animate-pulse flex items-center gap-1.5 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    AI 主持人正在記錄進程，構築命運下一章...
                  </span>
                )}
              </div>

              {/* Choice lists */}
              {!currentScene.isEnding ? (
                <div className="space-y-3 mb-6">
                  {currentScene.choices.map((choice, i) => {
                    // Check if player has required item
                    const isLocked = choice.requiredItem ? !characterState.inventory.includes(choice.requiredItem) : false;
                    
                    return (
                      <button
                        key={choice.id || i}
                        disabled={storyLoading || isLocked}
                        onClick={() => handleChoiceClick(choice)}
                        className={`w-full text-left p-3.5 md:p-4 rounded border flex items-center justify-between group transition-all text-xs cursor-pointer ${
                          isLocked 
                            ? 'bg-black/40 border-[#2d2d35]/40 text-slate-600 cursor-not-allowed'
                            : 'bg-[#16161a] border-[#2d2d35] text-[#e2e8f0] hover:text-[#c5a059] hover:border-[#c5a059]/80 hover:bg-[#c5a059]/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-serif font-bold text-[#c5a059] tracking-wider text-sm bg-[#c5a059]/5 group-hover:bg-[#c5a059]/10 w-6 h-6 rounded flex items-center justify-center shrink-0 border border-[#c5a059]/20">
                            {['一', '二', '三', '四'][i] || i + 1}
                          </span>
                          
                          <div className="leading-relaxed">
                            {choice.text}
                            {choice.requiresCheck && (
                              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#4f46e5]/10 border border-[#4f46e5]/30 text-[#818cf8] rounded-[2px] text-[10px] font-bold">
                                <Dice5 className="w-3 h-3" />
                                {choice.requiresCheck === 'STR' ? '力量' : choice.requiresCheck === 'INT' ? '智慧' : '敏捷'} 判定 (DC {choice.difficulty})
                              </span>
                            )}
                            {choice.requiredItem && (
                              <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                isLocked 
                                  ? 'bg-red-950/20 border border-red-900/30 text-red-400' 
                                  : 'bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#ebd2a4]'
                              }`}>
                                <Lock className="w-3 h-3" />
                                需要：{choice.requiredItem}
                              </span>
                            )}
                          </div>
                        </div>

                        {!isLocked && (
                          <ChevronRight className="w-4.5 h-4.5 opacity-0 group-hover:opacity-100 text-[#c5a059] transition-opacity shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ENDING SCREEN PANEL */
                <div className="mb-6 p-6 bg-[#16161a] border border-[#c5a059] rounded-lg text-center">
                  <h3 className="font-serif text-xl md:text-2xl font-bold mb-3 text-[#c5a059]">
                    {currentScene.endingType === 'victory' ? '🏆 傳奇大通關' : '💀 冒險落幕'}
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                    {currentScene.endingType === 'victory' 
                      ? '恭喜你！在種種艱難險阻的判定中，你達成了完美的史詩結局！你的名字將被歌頌！' 
                      : '儘管旅途充滿了挫敗，但每一道傷疤都將成為下一個英雄啟蒙的歷史墨跡。'
                    }
                  </p>
                  
                  <button
                    onClick={resetToMainMenu}
                    className="px-5 py-2.5 bg-[#c5a059] text-black font-semibold text-xs rounded hover:bg-[#ebd2a4] transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>返回劇本大廳再度啟程</span>
                  </button>
                </div>
              )}

              {/* Custom action submission text input */}
              {!currentScene.isEnding && (
                <form onSubmit={handleCustomActionSubmit} className="relative mt-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <PenTool className="w-4 h-4 text-[#c5a059]/60" />
                      </div>
                      <input
                        type="text"
                        disabled={storyLoading}
                        value={customAction}
                        onChange={(e) => setCustomAction(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#16161a] border border-[#2d2d35] rounded-l text-[#e2e8f0] focus:border-[#c5a059] focus:outline-none placeholder-slate-600 text-xs"
                        placeholder="💡 或是自擬任意行動：例如『我尋找火爐旁的夾子，將滾燙的珠飾強行夾起放入背包』..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={storyLoading || !customAction.trim()}
                      className="px-4 bg-[#c5a059] text-black font-bold text-xs rounded-r hover:bg-[#ebd2a4] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <span>送出行動</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}

            </div>
          </section>

          {/* Right Bloc: Profile & Logs Terminal (lg:4 cols) */}
          <aside className="lg:col-span-4 bg-[#16161a] text-[#e2e8f0] flex flex-col justify-between border-l border-[#2d2d35] max-h-[calc(100vh-4rem)]">
            
            {/* Top Sheet: Character status information */}
            <div className="p-4 border-b border-[#2d2d35]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#94a3b8] font-bold">👤 冒險者角色狀態</span>
                <span className="text-[10px] px-2 py-0.5 bg-[#c5a059]/10 text-[#ebd2a4] border border-[#c5a059]/30 rounded">
                  LV.{characterState.lvl} (EXP {characterState.exp}/{characterState.lvl * 100})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 bg-[#0a0a0c] p-3 rounded border border-white/5">
                <div>
                  <span className="text-[10px] text-slate-500 block">名號</span>
                  <span className="text-xs font-serif font-bold text-[#e2e8f0] truncate block">{characterState.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">職業流派</span>
                  <span className="text-xs font-serif text-[#c5a059] truncate block">{characterState.className}</span>
                </div>
              </div>

              {/* HP Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 font-bold text-red-400">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                    體力 (HP)
                  </span>
                  <span>{characterState.hp} / {characterState.maxHp}</span>
                </div>
                <div className="h-2 bg-black/40 border border-[#2d2d35] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-300 rounded-full" 
                    style={{ width: `${Math.max(0, (characterState.hp / characterState.maxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* MP Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 font-bold text-blue-400">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    精神魔力 (MP)
                  </span>
                  <span>{characterState.mp} / {characterState.maxMp}</span>
                </div>
                <div className="h-2 bg-black/40 border border-[#2d2d35] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full" 
                    style={{ width: `${Math.max(0, (characterState.mp / characterState.maxMp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Attribute breakdown Modifiers */}
              <div className="grid grid-cols-3 gap-2 bg-[#0a0a0c] p-2 border border-[#2d2d35]/80 rounded text-center text-xs mb-3">
                <div className="border-r border-[#2d2d35]">
                  <div className="text-[10px] text-slate-500 font-serif">力量 STR</div>
                  <div className="font-bold text-[#e1e2e6]">{characterState.stats.str}</div>
                  <div className="text-[9px] text-[#c5a059]">(檢定: {getModifier(characterState.stats.str)>=0?`+${getModifier(characterState.stats.str)}`:getModifier(characterState.stats.str)})</div>
                </div>
                <div className="border-r border-[#2d2d35]">
                  <div className="text-[10px] text-slate-500 font-serif">智慧 INT</div>
                  <div className="font-bold text-[#e1e2e6]">{characterState.stats.int}</div>
                  <div className="text-[9px] text-[#c5a059]">(檢定: {getModifier(characterState.stats.int)>=0?`+${getModifier(characterState.stats.int)}`:getModifier(characterState.stats.int)})</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-serif">敏捷 DEX</div>
                  <div className="font-bold text-[#e1e2e6]">{characterState.stats.dex}</div>
                  <div className="text-[9px] text-[#c5a059]">(檢定: {getModifier(characterState.stats.dex)>=0?`+${getModifier(characterState.stats.dex)}`:getModifier(characterState.stats.dex)})</div>
                </div>
              </div>

              {/* Gold amount */}
              <div className="flex justify-between items-center text-xs bg-[#0a0a0c]/60 px-3 py-2 border border-white/5 rounded">
                <span className="flex items-center gap-1 font-bold text-yellow-500">
                  <Coins className="w-4 h-4" />
                  命運金幣 (Gold)
                </span>
                <span className="font-serif font-bold text-[#c5a059]">{characterState.gold} G</span>
              </div>

            </div>

            {/* Middle Container: Inventory space & instant item consumable */}
            <div className="p-4 flex-1 flex flex-col overflow-hidden min-h-[140px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#94a3b8] font-bold">🎒 行囊與攜帶道具</span>
                <span className="text-[10px] text-slate-500">點擊特定消耗性道具即可使用</span>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#0a0a0c] border border-[#2d2d35] rounded-md p-3">
                {characterState.inventory.length === 0 ? (
                  <p className="text-slate-600 text-[11px] italic text-center py-4">（當前背包空空如也，請在冒險選擇中尋找遺物...）</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {characterState.inventory.map((item, idx) => {
                      const isConsumable = ['治療藥水', '魔力藥膏', '應急乾糧', '強化能量飲料', '超載補丁組'].includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => { if (isConsumable) useInventoryItem(item); }}
                          className={`text-xs px-2.5 py-1.5 rounded border transition-all ${
                            isConsumable 
                              ? 'bg-emerald-950/10 border-emerald-900/40 text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500 cursor-pointer' 
                              : 'bg-[#16161a] border-[#2d2d35] text-[#94a3b8]'
                          }`}
                          title={isConsumable ? '點擊消耗此道具' : '劇情任務道具'}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${isConsumable ? 'bg-emerald-400 animate-pulse' : 'bg-[#c5a059]'}`}></span>
                            <span>{item}</span>
                            {isConsumable && <span className="text-[8px] bg-emerald-900/50 px-1 py-0.2 rounded text-emerald-300">使用</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Panel: Adventure logs history console */}
            <div className="p-4 border-t border-[#2d2d35] bg-[#0c0d10] h-[220px] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1.5 border-b border-white/5 pb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#94a3b8] font-bold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#c5a059]" />
                  系統日誌與副本記錄
                </span>
                <span className="text-[9px] text-[#94a3b8]/40">Console Output</span>
              </div>

              {/* Logs body */}
              <div className="flex-1 overflow-y-auto space-y-1.5 text-[10px] font-mono leading-relaxed pr-1 mb-2">
                {adventureLogs.map((log) => {
                  let colorClass = 'text-[#e2e8f0]';
                  let prefix = '';
                  
                  if (log.type === 'system') {
                    colorClass = 'text-cyan-400/90 font-bold';
                  } else if (log.type === 'choice') {
                    colorClass = 'text-yellow-400/90';
                    prefix = '► ';
                  } else if (log.type === 'dice') {
                    colorClass = 'text-[#ebd2a4] italic';
                  } else if (log.type === 'effect') {
                    colorClass = 'text-green-400/95';
                  }

                  return (
                    <div key={log.id} className={`${colorClass} hover:bg-white/5 px-1 py-0.5 rounded transition-all`}>
                      <span className="text-[9px] text-slate-600 block sm:inline mr-2">[{log.timestamp}]</span>
                      <span>{prefix}{log.text}</span>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>

              <div className="text-[9px] text-slate-500 leading-normal border-t border-white/5 pt-1.5 flex justify-between items-center">
                <span>隨身跑團系統 v1.2.0</span>
                <span>系統已啟用 HTTPS 加密 & AI 伺服器同步</span>
              </div>
            </div>

          </aside>
        </main>
      )}

      {/* Interactive Beautiful Dice Rolling Panel (Overlay modal container) */}
      {showDicePanel && pendingChoice && characterState && (
        <div id="dice-overlay" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16161a] border border-[#c5a059] rounded-lg max-w-sm w-full p-6 text-center relative shadow-2xl animate-fade-in">
            
            {/* Title Header */}
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a059] mb-2 block">🎲 命運天平</span>
            <h3 className="font-serif text-lg font-bold text-[#e2e8f0] mb-2">啟動命運之骰</h3>
            
            <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
              你正在挑戰：<br />
              <span className="text-[#ebd2a4] font-bold">『{pendingChoice.text}』</span>
            </p>

            {/* Check breakdown Info */}
            <div className="grid grid-cols-2 gap-2 bg-[#0a0a0c] border border-[#2d2d35] p-3 rounded text-left text-xs mb-4">
              <div>
                <span className="text-slate-500 block text-[10px]">判定類型</span>
                <span className="font-serif font-bold text-indigo-400">{pendingChoice.requiresCheck === 'STR' ? '力量 STR' : pendingChoice.requiresCheck === 'INT' ? '智慧 INT' : '敏捷 DEX'} 檢定</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">挑戰目標(難度DC)</span>
                <span className="font-serif font-bold text-[#c5a059] text-base">{pendingChoice.difficulty} 點</span>
              </div>
              
              <div className="border-t border-[#2d2d35] pt-2 col-span-2 flex justify-between items-center text-[11px]">
                <span className="text-slate-500">冒險者基礎屬性加成：</span>
                <span className="font-bold text-white">
                  + {getModifier(
                    pendingChoice.requiresCheck === 'STR' ? characterState.stats.str :
                    pendingChoice.requiresCheck === 'INT' ? characterState.stats.int :
                    characterState.stats.dex
                  )} 點
                </span>
              </div>
            </div>

            {/* Optional focus mechanics to consume MP */}
            <div className="bg-[#0a0a0c] border border-[#2d2d35] p-3 rounded mb-5 flex justify-between items-center text-left text-xs">
              <div>
                <span className="font-bold text-blue-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-blue-400/20" />
                  奧祕魔法專注 (MP +2)
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">消耗 15 點精神 MP，為此次判定額外附加 +2 優勢</span>
              </div>
              <div>
                <input
                  type="checkbox"
                  disabled={characterState.mp < 15 || isRolling || diceSuccess !== null}
                  checked={useMpFocus}
                  onChange={(e) => setUseMpFocus(e.target.checked)}
                  className="w-4.5 h-4.5 text-[#c5a059] bg-black border-[#2d2d35] rounded focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Animated Rolling Dice Box */}
            <div className="my-6 py-4 flex flex-col items-center justify-center">
              <div className={`w-16 h-16 rounded-xl border-2 border-[#c5a059] bg-[#0c0d10] flex items-center justify-center shadow-lg shadow-[#c5a059]/10 relative ${
                isRolling ? 'rotate-animation' : ''
              }`}>
                <span className="font-serif text-3xl font-extrabold text-[#c5a059]">{diceRollValue}</span>
                <div className="absolute top-1 left-1.5 w-1 h-1 bg-[#c5a059]/40 rounded-full"></div>
                <div className="absolute top-1 right-1.5 w-1 h-1 bg-[#c5a059]/40 rounded-full"></div>
                <div className="absolute bottom-1 left-1.5 w-1 h-1 bg-[#c5a059]/40 rounded-full"></div>
                <div className="absolute bottom-1 right-1.5 w-1 h-1 bg-[#c5a059]/40 rounded-full"></div>
              </div>

              {diceSuccess !== null && (
                <div className="mt-4 animate-fade-in">
                  <span className={`text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded border ${
                    diceSuccess 
                      ? 'bg-green-950/20 border-green-900 text-green-400 shadow-sm shadow-green-500/10' 
                      : 'bg-red-950/20 border-red-900 text-red-400 shadow-sm shadow-red-500/10'
                  }`}>
                    {diceSuccess ? '✦ 判定合格 ✦' : '✦ 判定失敗 ✦'}
                  </span>
                  
                  {/* Calculation summary */}
                  <p className="text-[10px] text-slate-400 mt-2">
                    得分值：{diceRollValue} (骰子) + {
                      getModifier(
                        pendingChoice.requiresCheck === 'STR' ? characterState.stats.str :
                        pendingChoice.requiresCheck === 'INT' ? characterState.stats.int :
                        characterState.stats.dex
                      )
                    } (屬性加成) {useMpFocus ? '+ 2 (專注力)' : ''} = <span className="font-bold text-white">{
                      diceRollValue + getModifier(
                        pendingChoice.requiresCheck === 'STR' ? characterState.stats.str :
                        pendingChoice.requiresCheck === 'INT' ? characterState.stats.int :
                        characterState.stats.dex
                      ) + (useMpFocus ? 2 : 0)
                    }</span> 點 (對比 敵難 DC {pendingChoice.difficulty})
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation Buttons and Actions */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {diceSuccess === null ? (
                <>
                  <button
                    disabled={isRolling}
                    onClick={() => { setShowDicePanel(false); setPendingChoice(null); playSound('button'); }}
                    className="py-2.5 bg-[#1e2025] hover:bg-[#2d2d35] text-[#94a3b8] rounded text-xs font-bold transition-all border border-[#2d2d35]/60 cursor-pointer"
                  >
                    放棄返回
                  </button>
                  <button
                    disabled={isRolling}
                    onClick={executeDiceRoll}
                    className="py-2.5 bg-[#c5a059] hover:bg-[#ebd2a4] text-black rounded text-xs font-bold transition-all cursor-pointer flex justify-center items-center gap-1"
                  >
                    <Dice5 className="w-4.5 h-4.5" />
                    <span>{isRolling ? '旋轉骰子中...' : '進行 1d20 擲骰'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={confirmDiceResultAndContinue}
                  className="w-full col-span-2 py-2.5 bg-[#c5a059] text-black hover:bg-[#ebd2a4] rounded text-xs font-bold transition-all cursor-pointer flex justify-center items-center gap-1"
                >
                  <span>套用判定結果並推進故事</span>
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Embedded Style Block for Rotating Animation and other custom styles */}
      <style>{`
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .rotate-animation {
          animation: spin-dice 0.3s infinite linear;
        }
        @keyframes spin-dice {
          0% { transform: rotate(0deg) scale(0.95); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(0.95); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
