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
 * Generates a target color from the full sRGB gamut.
 * Uses HSV to ensure vibrant and highly distinct colors, avoiding muddy or repetitive grays.
 */
let lastHue = Math.floor(Math.random() * 360);
export function generateTargetColor(): RGBColor {
  // Jump around the color wheel to ensure consecutive colors feel very different
  lastHue = (lastHue + 137.5 + (Math.random() * 60 - 30)) % 360; 
  const h = lastHue;
  const s = 40 + Math.random() * 60; // 40-100 saturation
  const v = 40 + Math.random() * 60; // 40-100 brightness
  return hsvToRgb(h, s, v);
}

/**
 * Returns dynamic rank/title based on final average score.
 */
export function getFinalRank(avgScore: number, lang: 'TR' | 'EN'): string {
  if (lang === 'TR') {
    if (avgScore >= 9.5) return 'Efsanevi Renk Ustası';
    if (avgScore >= 9.0) return 'Kromatik Şampiyon';
    if (avgScore >= 8.0) return 'Renk Avcısı';
    if (avgScore >= 6.5) return 'Algı Çaylağı';
    return 'Renk Körü Adayı';
  } else {
    if (avgScore >= 9.5) return 'Legendary Color Master';
    if (avgScore >= 9.0) return 'Chromatic Champion';
    if (avgScore >= 8.0) return 'Color Hunter';
    if (avgScore >= 6.5) return 'Perception Rookie';
    return 'Colorblind Candidate';
  }
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

/**
 * Converts HSV (Hue 0-360, Saturation 0-100, Value 0-100) to RGB.
 */
export function hsvToRgb(h: number, s: number, v: number): RGBColor {
  h = ((h % 360) + 360) % 360;
  const sN = Math.max(0, Math.min(100, s)) / 100;
  const vN = Math.max(0, Math.min(100, v)) / 100;

  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;

  let rC = 0, gC = 0, bC = 0;
  if (h < 60) { rC = c; gC = x; }
  else if (h < 120) { rC = x; gC = c; }
  else if (h < 180) { gC = c; bC = x; }
  else if (h < 240) { gC = x; bC = c; }
  else if (h < 300) { rC = x; bC = c; }
  else { rC = c; bC = x; }

  return {
    r: Math.round((rC + m) * 255),
    g: Math.round((gC + m) * 255),
    b: Math.round((bC + m) * 255)
  };
}

export function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

/**
 * Returns an approximate Turkish color name based on HSV values.
 */
export function getColorNameTR(h: number, s: number, v: number): string {
  if (s < 8) {
    if (v < 15) return 'Siyah';
    if (v < 35) return 'Koyu Gri';
    if (v < 65) return 'Gri';
    if (v < 85) return 'Açık Gri';
    return 'Beyaz';
  }

  let name = '';
  const hN = ((h % 360) + 360) % 360;
  if (hN < 10 || hN >= 350) name = 'Kırmızı';
  else if (hN < 25) name = 'Kızıl Turuncu';
  else if (hN < 42) name = 'Turuncu';
  else if (hN < 55) name = 'Sarı Turuncu';
  else if (hN < 70) name = 'Sarı';
  else if (hN < 85) name = 'Lime Yeşili';
  else if (hN < 150) name = 'Yeşil';
  else if (hN < 170) name = 'Camgöbeği';
  else if (hN < 195) name = 'Açık Mavi';
  else if (hN < 230) name = 'Mavi';
  else if (hN < 260) name = 'Lacivert';
  else if (hN < 290) name = 'Mor';
  else if (hN < 320) name = 'Fuşya';
  else name = 'Pembe';

  if (v < 30) return 'Koyu ' + name;
  if (s < 30 && v > 70) return 'Pastel ' + name;
  if (s > 80 && v > 70) return 'Canlı ' + name;
  if (v > 85 && s < 50) return 'Açık ' + name;

  return name;
}
