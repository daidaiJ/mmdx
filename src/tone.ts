// Tone controls the structural feel of imported scene templates (info cards,
// block pages) without repainting the theme's palette. It exists because
// editorial templates otherwise force every engineering output into a
// paper-like card: serif headings, large radii, soft shadows.

export type ToneName = 'paper' | 'neutral' | 'product';

export interface ToneSpec {
  name: ToneName;
  label: string;
  /** panel radius */
  radius: string;
  radiusSm: string;
  /** panel shadow; 'none' keeps flat office layouts flat */
  shadow: string;
  /** display type for the card/report title */
  headingFont: string;
  headingWeight: number;
  headingSize: string;
  headingTracking: string;
  /** page padding and card interior padding */
  pad: string;
  cardPad: string;
  gap: string;
  /** table header treatment */
  tableHeadTransform: string;
  tableHeadSize: string;
  tableHeadTracking: string;
  tableHeadWeight: number;
}

export const TONES: Record<ToneName, ToneSpec> = {
  paper: {
    name: 'paper',
    label: '纸质报告',
    radius: '16px',
    radiusSm: '10px',
    shadow: '0 1px 0 rgba(33,27,18,0.05)',
    headingFont: '"Source Serif 4", "Noto Serif SC", Georgia, "Songti SC", SimSun, serif',
    headingWeight: 400,
    headingSize: '30px',
    headingTracking: '-0.01em',
    pad: '32px 36px 28px',
    cardPad: '24px',
    gap: '20px',
    tableHeadTransform: 'uppercase',
    tableHeadSize: '11px',
    tableHeadTracking: '0.08em',
    tableHeadWeight: 500,
  },
  neutral: {
    name: 'neutral',
    label: '中性文档',
    radius: '10px',
    radiusSm: '6px',
    shadow: 'none',
    headingFont: '"Inter", "Segoe UI", "Noto Sans SC", sans-serif',
    headingWeight: 600,
    headingSize: '28px',
    headingTracking: '-0.01em',
    pad: '28px 32px 26px',
    cardPad: '20px',
    gap: '16px',
    tableHeadTransform: 'uppercase',
    tableHeadSize: '11px',
    tableHeadTracking: '0.05em',
    tableHeadWeight: 500,
  },
  product: {
    name: 'product',
    label: '产品界面',
    radius: '6px',
    radiusSm: '4px',
    shadow: '0 1px 2px rgba(15,23,42,0.06)',
    headingFont: '"Inter", "Segoe UI", "Noto Sans SC", sans-serif',
    headingWeight: 600,
    headingSize: '26px',
    headingTracking: '-0.015em',
    pad: '24px 28px 22px',
    cardPad: '18px',
    gap: '14px',
    tableHeadTransform: 'uppercase',
    tableHeadSize: '11px',
    tableHeadTracking: '0.05em',
    tableHeadWeight: 500,
  },
};

export function isToneName(v: string): v is ToneName {
  return v === 'paper' || v === 'neutral' || v === 'product';
}

/**
 * Structural overrides appended after the theme's blockCss. Colors and fonts
 * still come from the theme; only panel geometry, display type and table
 * chrome change. Scoped to elements the block page shell owns.
 */
export function toneCss(name: ToneName): string {
  const t = TONES[name];
  return `
.wrap {
  --tone-radius:${t.radius}; --tone-radius-sm:${t.radiusSm}; --tone-shadow:${t.shadow};
  --tone-heading-font:${t.headingFont}; --tone-heading-weight:${t.headingWeight};
  --tone-heading-size:${t.headingSize}; --tone-heading-tracking:${t.headingTracking};
  padding:${t.pad};
}
.caption-title { font-family:${t.headingFont}; font-weight:${t.headingWeight}; font-size:${t.headingSize}; letter-spacing:${t.headingTracking}; }
.cards { gap:${t.gap}; }
.card, .kpi, table, .task, .cmp, .vs, .hm { border-radius:${t.radius}; box-shadow:${t.shadow}; }
.card { padding:${t.cardPad}; }
.card-title { font-family:${t.headingFont}; }
.kpi-value { font-weight:${t.headingWeight}; }
.task-row { padding-top:${t.name === 'paper' ? '16px' : '12px'}; padding-bottom:${t.name === 'paper' ? '16px' : '12px'}; }
thead th { text-transform:${t.tableHeadTransform}; font-size:${t.tableHeadSize}; letter-spacing:${t.tableHeadTracking}; font-weight:${t.tableHeadWeight}; }
.task-chip, .task-badge { border-radius:${t.name === 'paper' ? '9999px' : t.radiusSm}; }
.fn-track, .fn-bar { border-radius:${t.name === 'paper' ? '9999px' : t.radiusSm}; }
.wrap.slide { padding:${t.name === 'paper' ? '40px 44px 88px' : t.name === 'neutral' ? '36px 40px 84px' : '32px 36px 80px'}; }
.wrap.slide .caption-title { font-size:calc(${t.headingSize} + 4px); }
`;
}
