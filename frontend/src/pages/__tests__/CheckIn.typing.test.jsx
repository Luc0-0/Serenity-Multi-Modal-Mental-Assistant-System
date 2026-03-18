import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * CSS-level test for the typing indicator color fix.
 *
 * The typing indicator dots were previously gold and have been fixed to white.
 * This test reads the CSS module source and verifies the background color value
 * applied to .typingIndicator span elements uses white (rgba 255,255,255),
 * not gold (e.g. rgba with amber/gold channels like 196,168,130 or #d4a574).
 */
describe('Typing Indicator Color Fix', () => {
  const cssPath = path.resolve(__dirname, '../CheckIn.module.css');
  let cssContent;

  try {
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  } catch {
    cssContent = '';
  }

  it('CSS file exists and is readable', () => {
    expect(cssContent.length).toBeGreaterThan(0);
  });

  it('typingIndicator span uses white color, not gold', () => {
    // Extract the .typingIndicator span rule
    const indicatorSpanMatch = cssContent.match(
      /\.typingIndicator\s+span\s*\{[^}]*\}/
    );

    expect(indicatorSpanMatch).toBeTruthy();

    const rule = indicatorSpanMatch[0];

    // Should contain white-ish rgba (255, 255, 255, ...)
    expect(rule).toMatch(/rgba\(\s*255\s*,\s*255\s*,\s*255/);

    // Should NOT contain gold/amber colors
    expect(rule).not.toMatch(/rgba\(\s*196\s*,\s*168\s*,\s*130/);
    expect(rule).not.toMatch(/#d4a574/i);
    expect(rule).not.toMatch(/#c4a882/i);
  });

  it('typingIndicator dots are 4px round circles', () => {
    const indicatorSpanMatch = cssContent.match(
      /\.typingIndicator\s+span\s*\{[^}]*\}/
    );
    expect(indicatorSpanMatch).toBeTruthy();

    const rule = indicatorSpanMatch[0];
    expect(rule).toContain('border-radius: 50%');
    expect(rule).toMatch(/width:\s*4px/);
    expect(rule).toMatch(/height:\s*4px/);
  });

  it('typing bounce animation exists', () => {
    expect(cssContent).toMatch(/@keyframes\s+typingBounce/);
  });
});
