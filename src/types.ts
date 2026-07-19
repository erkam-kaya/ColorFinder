/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameStage {
  LOBBY = 'LOBBY',
  SPIN = 'SPIN',
  BURN = 'BURN',
  INPUT = 'INPUT',
  REVEAL = 'REVEAL',
  HANDOVER = 'HANDOVER',
  RESULTS = 'RESULTS'
}

export interface Player {
  id: string;
  name: string;
  scores: number[]; // Array of scores for each of the 5 rounds
  guesses: RGBColor[]; // Guess history for each round
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface Round {
  roundNumber: number; // 1 to 5
  targetColor: RGBColor;
}

export interface GameSettings {
  mode: 'SINGLE' | 'MULTI';
  playerNames: string[];
  maxRounds: number; // 5 rounds standard
}
