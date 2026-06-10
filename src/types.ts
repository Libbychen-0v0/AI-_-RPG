/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatType = 'STR' | 'INT' | 'DEX';

export interface CharacterStats {
  str: number; // 力量 (Strength)
  int: number; // 智慧 (Intelligence)
  dex: number; // 敏捷 (Dexterity)
}

export interface CharacterState {
  name: string;
  className: string;
  stats: CharacterStats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  inventory: string[];
  lvl: number;
  exp: number;
}

export interface Choice {
  id: string;
  text: string;
  requiresCheck?: StatType | null;
  difficulty?: number;
  requiredItem?: string;
}

export interface PlayerEffects {
  hpChange?: number;
  mpChange?: number;
  goldChange?: number;
  gainItems?: string[];
  loseItems?: string[];
  logMessage?: string;
  expChange?: number;
}

export interface Scene {
  storyText: string;
  illustrationPrompt?: string;
  choices: Choice[];
  isEnding: boolean;
  endingType?: 'victory' | 'death' | null;
  playerEffects?: PlayerEffects;
}

export interface AdventureLog {
  id: string;
  text: string;
  type: 'story' | 'choice' | 'dice' | 'system' | 'combat' | 'effect';
  timestamp: string;
}

export interface GamePreset {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  style: string; // Cyberpunk, Fantasy, Mystery, etc.
  iconName: string;
  initialScene: Scene;
  characterClasses: {
    className: string;
    description: string;
    stats: CharacterStats;
    initialItems: string[];
    hp: number;
    mp: number;
  }[];
}
