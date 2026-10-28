import type { Page } from 'puppeteer-core';
import type { ThemeSpec } from '../themes.ts';

export interface IconPack {
  name: string;
  json: string;
}

export interface EngineRenderOptions {
  code: string;
  background: string;
  needPng: boolean;
  scale: number;
  width: number;
  theme: ThemeSpec;
  /** Mermaid-syntax theme config; peleConfig() turns it into Pele knobs */
  mermaidConfig: Record<string, unknown>;
  /** Pele render knobs derived from --config / --preset */
  fontSize: number;
  padding: number;
  flowchart?: { nodeSpacing?: number; rankSpacing?: number; padding?: number };
  /** keep CSS variables instead of baking resolved paint into the SVG */
  svgThemeable: boolean;
  titlePos: 'top' | 'bottom';
  titleText: string;
  remap?: Record<string, string>;
  iconPacks?: IconPack[];
  /** rough.js UMD bundle, injected only when the theme asks for it */
  roughJs?: string;
}

export interface EngineResult {
  svg: string;
  png?: Buffer;
}

export type MarkFn = <T>(stage: string, fn: () => Promise<T>, label?: string) => Promise<T>;

export interface Engine {
  render(page: Page, opts: EngineRenderOptions, mark: MarkFn): Promise<EngineResult>;
}
