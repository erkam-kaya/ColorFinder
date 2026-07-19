/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RGBColor } from '../types';

/**
 * Converts RGB components to a standard CSS hex string.
 */
export function rgbToHex(color: RGBColor): string {
  const r = Math.max(0, Math.min(255, Math.round(color.r)));
  const g = Math.max(0, Math.min(255, Math.round(color.g)));
  const b = Math.max(0, Math.min(255, Math.round(color.b)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Parses hex string back to RGB object.
 */
export function hexToRgb(hex: string): RGBColor {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Converts RGB to CIE XYZ color space.
 * Standard Observer = 2°, Illuminant = D65.
 */
function rgbToXyz(color: RGBColor) {
  let rL = color.r / 255;
  let gL = color.g / 255;
  let bL = color.b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;
  return { x, y, z };
}

/**
 * Converts CIE XYZ to CIE LAB space.
 */
function xyzToLab(xyz: { x: number; y: number; z: number }) {
  // Reference white D65
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xN = xyz.x / refX;
  let yN = xyz.y / refY;
  let zN = xyz.z / refZ;

  xN = xN > 0.008856 ? Math.pow(xN, 1 / 3) : 7.787 * xN + 16 / 116;
  yN = yN > 0.008856 ? Math.pow(yN, 1 / 3) : 7.787 * yN + 16 / 116;
  zN = zN > 0.008856 ? Math.pow(zN, 1 / 3) : 7.787 * zN + 16 / 116;

  const L = 116 * yN - 16;
  const a = 500 * (xN - yN);
  const b = 200 * (yN - zN);
  return { L, a, b };
}

/**
 * Converts RGBColor directly to CIE LAB.
 */
export function rgbToLab(color: RGBColor) {
  return xyzToLab(rgbToXyz(color));
}

/**
 * Calculates CIE76 Delta E color difference between two RGB colors.
 */
export function calculateDeltaE(c1: RGBColor, c2: RGBColor): number {
  const lab1 = rgbToLab(c1);
  const lab2 = rgbToLab(c2);

  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Map Delta E to a game score out of 10.0.
 * Perfect match is 10.0. Very close is 9.5+.
 */
export function calculateScore(target: RGBColor, guess: RGBColor): number {
  const deltaE = calculateDeltaE(target, guess);
  
  // A Delta E of 0 means perfect score (10.0).
  // A Delta E of 80 or more is a 0.0 score.
  // We use a progressive scoring model that feels highly rewarding for near-misses.
  if (deltaE <= 0.1) return 10.0;
  
  let score = 10 - (deltaE / 8.5);
  
  // Give a small non-linear boost for extremely good matches (Delta E < 12)
  if (deltaE < 12 && score < 10) {
    const boost = (12 - deltaE) * 0.03;
    score += boost;
  }

  const rounded = Math.round(score * 10) / 10;
  return Math.max(0.0, Math.min(10.0, rounded));
}

/**
 * Generates an optimal target color that is vibrant and fun to guess.
 * Avoids pure black, white, or highly muted grays for better gameplay.
 */
export function generateTargetColor(): RGBColor {
  // We want to generate colors with reasonable lightness and saturation.
  // We can do this in RGB by ensuring there's a good spread between components
  // and components aren't all low (dark) or all high (light).
  let r = 0, g = 0, b = 0;
  let attempts = 0;

  while (attempts < 50) {
    r = Math.floor(Math.random() * 216) + 30; // 30-245
    g = Math.floor(Math.random() * 216) + 30;
    b = Math.floor(Math.random() * 216) + 30;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const avg = (r + g + b) / 3;

    // Check if the color has enough chromatic spread (not too gray) and is in standard brightness range
    if (diff > 45 && avg > 60 && avg < 200) {
      break;
    }
    attempts++;
  }

  return { r, g, b };
}

/**
 * Returns Turkish feedback text based on accuracy score.
 */
export function getTurkishFeedback(score: number): string {
  if (score >= 9.8) return 'OLAĞANÜSTÜ! Kusursuz Gözler!';
  if (score >= 9.5) return 'MÜKEMMEL! Müthiş bir algı!';
  if (score >= 9.0) return 'HARİKA! Çok az fark kaldı!';
  if (score >= 8.0) return 'ÇOK İYİ! Yaklaştın!';
  if (score >= 6.5) return 'FENA DEĞİL! Tonu yakaladın sayılır.';
  if (score >= 4.0) return 'DURUMU KURTARIR! Biraz daha çalışmalısın.';
  return 'GÖZLERİNİ BİLEYİN! Hafızanı zorlamalısın.';
}

/**
 * Triggers a device-native haptic vibration feedback (vibrate API on Android).
 */
export function triggerHaptic(duration = 20): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignored if blocked by safety policies or frame sandboxing
    }
  }
}

