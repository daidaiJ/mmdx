// Theme presets. Each preset is a Mermaid config object plus a default page
// background. Shape-specific colors are painted via themeCSS so flowcharts get
// meaningful color coding (rect=process, diamond=decision, circle=state,
// cylinder=store) instead of the single-hue Mermaid default.

import { blendOver, scaleLightness, textColorFor } from './color.ts';
import { MONO_FAMILY } from './fonts.ts';

export interface ThemePreset {
  config: Record<string, unknown>;
  background: string;
  /** true when the preset bakes in a dark page background */
  dark?: boolean;
  /** post-render hex→hex remap for colours mermaid hardcodes (journey) */
  remap?: Record<string, string>;
  /** Pele theme (v2 default engine) */
  pele?: ThemeSpec;
}

export interface ThemePaint {
  fill: string;
  stroke: string;
}

export interface PeleVars {
  bg: string;
  fg: string;
  muted: string;
  line: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  critical: string;
  radius?: string;
  font?: string;
  fontMono?: string;
  series: string[];
}

/** Paint/post-processing knobs carried by a visual style. */
export interface ThemeStyle {
  rough?: boolean;
  roughness?: number;
  bowing?: number;
  fillStyle?: 'solid' | 'hachure';
  hachureGap?: number;
  hachureAngle?: number;
  fillWeight?: number;
  seed?: number;
  strokeWidth?: number;
  /** cover the less-common Pele shape classes with role paint */
  shapeCoverage?: boolean;
  /**
   * Colour flowchart nodes by reading order instead of by shape family: the
   * outline cycles the eight series colours and the fill is that colour at 15%
   * over the page. This is the rule Zed's own mermaid CSS applies
   * (`node_counter % 8`), and it is what keeps the Zed pair from reading as
   * another shape-coded light theme.
   */
  nodeRotation?: boolean;
}

/**
 * Backdrop painted into the SVG behind the diagram, for styles whose panels are
 * translucent or whose paper carries a texture. Chromium parses
 * `backdrop-filter` on SVG shapes but does not render it, so the frosted look
 * comes from a backdrop with no sharp detail: soft radial blobs, blurred once
 * as a group. Coordinates are normalized to the diagram box, so a blob lands in
 * the same corner at any size. `dots` draws a dot grid instead (paper texture),
 * `grid` rules the sheet, and `pane` adds the acrylic sheet on top.
 */
export interface ThemeBackdrop {
  /** base fill under the blobs; also the PNG page background */
  base: string;
  /** gaussian blur radius applied to the blob group, in CSS px */
  blur?: number;
  blobs?: Array<{ cx: number; cy: number; r: number; color: string; opacity: number }>;
  /** dot grid, drawn in place of blobs */
  dots?: { color: string; size: number; gap: number };
  /** graph ruling; `major` adds the heavier every-N line */
  grid?: {
    color: string;
    gap: number;
    width?: number;
    major?: { color: string; gap: number; width?: number };
  };
  /**
   * Where the edge fade starts, as a percentage of the backdrop's half-extent
   * (default 92). A texture wants a high value so the sheet stays even; blobs
   * want a low one so the tint does not reach the frame.
   */
  fade?: number;
  /** sheet between the tint and the diagram; `noise` is its grain (0–1) */
  pane?: { color: string; opacity?: number; noise?: number };
}

/** v2 theme contract: CSS-variable paint for Pele. */
export interface ThemeSpec {
  name: string;
  dark: boolean;
  background: string;
  fontFamily?: string;
  vars: PeleVars;
  shapes: {
    process: ThemePaint;
    decision: ThemePaint;
    state: ThemePaint;
    store: ThemePaint;
    cluster?: ThemePaint;
  };
  css: string;
  /** rough.js / stroke / shape-coverage knobs */
  style?: ThemeStyle;
  /** backdrop painted behind the diagram (translucent-panel styles) */
  backdrop?: ThemeBackdrop;
  /** extra CSS for block pages (card/kpi/table/...), appended after PAGE_CSS */
  blockCss?: string;
  /** font families the renderer should inject for this theme */
  fonts?: string[];
}

const FONT_STACK = `"Noto Sans SC", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Shared layout/typography knobs; colors differ per preset. */
function baseConfig(bg: string, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: FONT_STACK,
    fontSize: 15,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 16,
      nodeSpacing: 64,
      rankSpacing: 76,
      wrappingWidth: 230,
      markdownAutoWrap: true,
    },
    sequence: {
      diagramMarginX: 24,
      diagramMarginY: 16,
      actorMargin: 56,
      boxMargin: 10,
      messageMargin: 44,
      mirrorActors: false,
      wrap: true,
      bottomMarginAdj: 8,
    },
    class: { padding: 12, htmlLabels: true },
    er: { diagramPadding: 16, entityPadding: 14, minEntityWidth: 120 },
    themeCSS: `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1px; }
.node rect { rx: 6px; ry: 6px; }
.cluster rect { rx: 8px; ry: 8px; stroke-width: 1px; }
.edgePath .path { stroke-width: 1.5px; }
.edgeLabel .label { padding: 2px 8px; }
.nodeLabel div, .nodeLabel span, .nodeLabel p { padding: 2px 6px; }
.nodeLabel { font-weight: 500; }
foreignObject { overflow: visible; }
.nodeLabel div, .nodeLabel span, .nodeLabel p,
.edgeLabel div, .edgeLabel span, .edgeLabel p { overflow: visible !important; }
`,
    ...extra,
    // edgeLabelBackground must match the page bg so labels mask the lines under them
    themeVariables: { edgeLabelBackground: bg },
  } as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// tech — default. Office-readable on a laptop and a meeting-room screen:
// white canvas, ink text, tinted fills (not hairline-only), one hue per
// role (blue process / amber decision / green state / purple store).
// ---------------------------------------------------------------------------

const TECH_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1.5px; }
.node rect { rx: 6px; ry: 6px; }
.node rect { fill: #D7E4F4; stroke: #3A6F9C; }
.node polygon { fill: #F3E4C8; stroke: #A87428; }
.node circle, .node ellipse { fill: #D4E8DA; stroke: #3B7A4C; }
.node path { fill: #E3DCEC; stroke: #5A4E82; }
.cluster rect { fill: #EEF1F5; stroke: #C3C8D1; }
.cluster-label { color: #5B6470; }
.node .outer-path path { fill: #D7E4F4; stroke: #3A6F9C; }
.node .outer-path path[fill="none"] { fill: none; }
.node .row-rect-odd path { fill: #FFFFFF; stroke: #3A6F9C; }
.node .row-rect-odd path[fill="none"] { fill: none; }
.node .row-rect-even path { fill: #EEF1F5; stroke: #3A6F9C; }
.node .row-rect-even path[fill="none"] { fill: none; }
.divider path { stroke: #3A6F9C; }
.mindmap-node .label, .mindmap-node .label div { color: #1B1F26 !important; }
.mindmap-node .label, .mindmap-node .label div, .mindmap-node .label span, .mindmap-node .label p, .mindmap-node .text-inner-tspan { color: #1B1F26 !important; fill: #1B1F26 !important; }
.mindmap-node.section--1 rect, .mindmap-node.section--1 path, .mindmap-node.section--1 circle { fill: #D7E4F4 !important; stroke: #3A6F9C !important; stroke-width: 1.5px !important; }
.mindmap-node.section-0 rect, .mindmap-node.section-0 path, .mindmap-node.section-0 circle { fill: #D4E8DA !important; stroke: #3B7A4C !important; }
.mindmap-node.section-1 rect, .mindmap-node.section-1 path, .mindmap-node.section-1 circle { fill: #F3E4C8 !important; stroke: #A87428 !important; }
.mindmap-node.section-2 rect, .mindmap-node.section-2 path, .mindmap-node.section-2 circle { fill: #E3DCEC !important; stroke: #5A4E82 !important; }
.mindmap-node.section-3 rect, .mindmap-node.section-3 path, .mindmap-node.section-3 circle { fill: #D4E8E4 !important; stroke: #3A7A74 !important; }
.mindmap-node.section-4 rect, .mindmap-node.section-4 path, .mindmap-node.section-4 circle { fill: #F3E0E6 !important; stroke: #A05A72 !important; }
.mindmap-node.section-5 rect, .mindmap-node.section-5 path, .mindmap-node.section-5 circle { fill: #EEF1F5 !important; stroke: #5B6570 !important; }
.radarCurve-0 { color: #3B7FC4 !important; fill: #3B7FC4 !important; }
.radarCurve-1 { color: #3D9A6A !important; fill: #3D9A6A !important; }
.radarCurve-2 { color: #5C6570 !important; fill: #5C6570 !important; }
.radarCurve-3 { color: #C9A227 !important; fill: #C9A227 !important; }
.radarCurve-4 { color: #C45C4A !important; fill: #C45C4A !important; }
.radarCurve-5 { color: #4A9BB8 !important; fill: #4A9BB8 !important; }
.radarCurve-6 { color: #7A6BA8 !important; fill: #7A6BA8 !important; }
.radarCurve-7 { color: #C4842A !important; fill: #C4842A !important; }
.radarCurve-8 { color: #3D9A6A !important; fill: #3D9A6A !important; }
.radarCurve-9 { color: #A05A72 !important; fill: #A05A72 !important; }
.radarCurve-10 { color: #5C6570 !important; fill: #5C6570 !important; }
.radarCurve-11 { color: #5A4E82 !important; fill: #5A4E82 !important; }
.timeline-node .node-bkg { stroke: #C3C8D1 !important; stroke-width: 1.5px !important; }
.treemapSection.section1, .treemapSection.section1 .treemapLeaf { fill: #A8C4E0 !important; stroke: #FFFFFF !important; }
.treemapSection.section2, .treemapSection.section2 .treemapLeaf { fill: #A8D4B8 !important; stroke: #FFFFFF !important; }
.treemapSection.section3, .treemapSection.section3 .treemapLeaf { fill: #C3C8D1 !important; stroke: #FFFFFF !important; }
.treemapSection.section4, .treemapSection.section4 .treemapLeaf { fill: #E0C888 !important; stroke: #FFFFFF !important; }
.treemapSection.section5, .treemapSection.section5 .treemapLeaf { fill: #E0B0A8 !important; stroke: #FFFFFF !important; }
.treemapSection.section6, .treemapSection.section6 .treemapLeaf { fill: #A8D0DC !important; stroke: #FFFFFF !important; }
.treemapSectionHeader { stroke: #C3C8D1 !important; }
.face { fill: #F3E4C8; stroke: #C3C8D1; }
.pieCircle, .legend, g.legend { overflow: visible; }
.slice { overflow: visible; }
.xAxis .tick text, .yAxis .tick text { font-size: 12px; fill: #5B6470; }
.actor-0 { fill: #3A6F9C; stroke: #FFFFFF; }
.actor-1 { fill: #3B7A4C; stroke: #FFFFFF; }
.actor-2 { fill: #3A7A74; stroke: #FFFFFF; }
.actor-3 { fill: #A87428; stroke: #FFFFFF; }
.actor-4 { fill: #5C6570; stroke: #FFFFFF; }
.actor-5 { fill: #A05A72; stroke: #FFFFFF; }
`;

const tech: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    theme: 'base',
    // classic look: no neo gradient/shadow. Fills carry the hue so
    // shape-coding survives projection; strokes are 1.5px in TECH_CSS.
    block: { padding: 16 },
    radar: { curveOpacity: 0.32, curveStrokeWidth: 2.5, graticuleColor: '#C3C8D1', graticuleOpacity: 0.75 },
    themeVariables: {
      ...((baseConfig('#FFFFFF').themeVariables as Record<string, unknown>) ?? {}),
      // ---- core derivation chain: every diagram inherits from these.
      // primaryColor in particular must be set — its default (#fff4dd cream)
      // is the "native mermaid" look leaking through every unset corner.
      primaryColor: '#D7E4F4',
      primaryTextColor: '#1B1F26',
      primaryBorderColor: '#3A6F9C',
      secondaryColor: '#EEF1F5',
      secondaryTextColor: '#1B1F26',
      secondaryBorderColor: '#C3C8D1',
      tertiaryColor: '#EEF1F5',
      tertiaryTextColor: '#5B6470',
      tertiaryBorderColor: '#C3C8D1',
      background: '#FFFFFF',
      fontFamily: FONT_STACK,
      fontSize: '15px',
      textColor: '#1B1F26',
      lineColor: '#5B6570',
      defaultLinkColor: '#5B6570',
      arrowheadColor: '#5B6570',
      gradientStart: '#D7E4F4',
      gradientStop: '#FFFFFF',
      mainBkg: '#D7E4F4',
      nodeBkg: '#D7E4F4',
      nodeBorder: '#3A6F9C',
      nodeTextColor: '#1B1F26',
      classText: '#1B1F26',
      clusterBkg: '#EEF1F5',
      clusterBorder: '#C3C8D1',
      titleColor: '#1B1F26',
      edgeLabelBackground: '#FFFFFF',
      labelBackgroundColor: '#FFFFFF',
      actorBkg: '#FFFFFF',
      actorBorder: '#5B6570',
      actorTextColor: '#1B1F26',
      actorLineColor: '#C3C8D1',
      signalColor: '#5B6570',
      signalTextColor: '#1B1F26',
      labelBoxBkgColor: '#D7E4F4',
      labelBoxBorderColor: '#3A6F9C',
      labelTextColor: '#1B1F26',
      loopTextColor: '#5B6470',
      activationBkgColor: '#D7E4F4',
      activationBorderColor: '#3A6F9C',
      sequenceNumberColor: '#5B6470',
      noteBkgColor: '#F3E4C8',
      noteTextColor: '#1B1F26',
      noteBorderColor: '#A87428',
      stateBkg: '#D4E8DA',
      stateBorder: '#3B7A4C',
      stateLabelColor: '#1B1F26',
      specialStateColor: '#1B1F26',
      compositeBackground: '#EEF1F5',
      compositeBorder: '#C3C8D1',
      compositeTitleBackground: '#EEF1F5',
      transitionColor: '#5B6570',
      transitionLabelColor: '#5B6470',
      labelColor: '#1B1F26',
      altBackground: '#FFFFFF',
      // ---- ER ----
      rowOdd: '#FFFFFF',
      rowEven: '#EEF1F5',
      relationColor: '#5B6570',
      relationLabelColor: '#1B1F26',
      relationLabelBackground: '#FFFFFF',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#EEF1F5',
      requirementBackground: '#D7E4F4',
      requirementBorderColor: '#3A6F9C',
      requirementBorderSize: '1.5px',
      requirementTextColor: '#1B1F26',
      requirementEdgeLabelBackground: '#FFFFFF',
      sectionBkgColor: '#FFFFFF',
      altSectionBkgColor: '#EEF1F5',
      sectionBkgColor2: '#FFFFFF',
      taskBkgColor: '#D7E4F4',
      taskBorderColor: '#3A6F9C',
      taskTextColor: '#1B1F26',
      taskTextDarkColor: '#1B1F26',
      taskTextOutsideColor: '#1B1F26',
      taskTextClickableColor: '#1B1F26',
      activeTaskBkgColor: '#F3E4C8',
      activeTaskBorderColor: '#A87428',
      doneTaskBkgColor: '#EEF1F5',
      doneTaskBorderColor: '#C3C8D1',
      critBkgColor: '#E3DCEC',
      critBorderColor: '#5A4E82',
      gridColor: '#D0D4DC',
      todayLineColor: '#A87428',
      vertLineColor: '#C3C8D1',
      excludeBkgColor: '#EEF1F5',
      cScale0: '#D7E4F4', cScale1: '#D4E8DA', cScale2: '#F3E4C8', cScale3: '#E3DCEC',
      cScale4: '#D4E8E4', cScale5: '#F3E0E6', cScale6: '#EEF1F5', cScale7: '#D7E4F4',
      cScale8: '#D4E8DA', cScale9: '#F3E4C8', cScale10: '#E3DCEC', cScale11: '#D4E8E4',
      cScale12: '#1B1F26',
      cScaleLabel0: '#1B1F26', cScaleLabel1: '#1B1F26', cScaleLabel2: '#1B1F26',
      cScaleLabel3: '#1B1F26', cScaleLabel4: '#1B1F26', cScaleLabel5: '#1B1F26',
      cScaleLabel6: '#1B1F26', cScaleLabel7: '#1B1F26', cScaleLabel8: '#1B1F26',
      cScaleLabel9: '#1B1F26', cScaleLabel10: '#1B1F26', cScaleLabel11: '#1B1F26',
      cScaleInv0: '#3A6F9C', cScaleInv1: '#3B7A4C', cScaleInv2: '#A87428', cScaleInv3: '#5A4E82',
      cScaleInv4: '#3A7A74', cScaleInv5: '#A05A72', cScaleInv6: '#5C6570', cScaleInv7: '#C9A227',
      cScaleInv8: '#3A6F9C', cScaleInv9: '#3B7A4C', cScaleInv10: '#A87428', cScaleInv11: '#5A4E82',
      // ---- user journey: official section fills (themes) — actor dot
      // colours live in the journey CONFIG section below
      fillType0: '#D7E4F4', fillType1: '#D4E8DA', fillType2: '#F3E4C8', fillType3: '#E3DCEC',
      fillType4: '#D4E8E4', fillType5: '#F3E0E6', fillType6: '#EEF1F5', fillType7: '#D7E4F4',
      // ---- gitgraph
      git0: '#3A6F9C', git1: '#3B7A4C', git2: '#A87428', git3: '#5A4E82',
      git4: '#3A7A74', git5: '#A05A72', git6: '#5C6570', git7: '#C9A227',
      gitBranchLabel0: '#FFFFFF', gitBranchLabel1: '#FFFFFF', gitBranchLabel2: '#FFFFFF',
      gitBranchLabel3: '#FFFFFF', gitBranchLabel4: '#FFFFFF', gitBranchLabel5: '#FFFFFF',
      gitBranchLabel6: '#FFFFFF', gitBranchLabel7: '#FFFFFF',
      gitInv0: '#FFFFFF', gitInv1: '#FFFFFF', gitInv2: '#FFFFFF', gitInv3: '#FFFFFF',
      gitInv4: '#FFFFFF', gitInv5: '#FFFFFF', gitInv6: '#FFFFFF', gitInv7: '#FFFFFF',
      commitLabelColor: '#1B1F26',
      commitLabelBackground: '#EEF1F5',
      tagLabelColor: '#1B1F26',
      tagLabelBackground: '#D7E4F4',
      tagLabelBorder: '#3A6F9C',
      pie1: '#3B7FC4', pie2: '#3D9A6A', pie3: '#5C6570', pie4: '#C9A227',
      pie5: '#C45C4A', pie6: '#4A9BB8', pie7: '#7A6BA8', pie8: '#C4842A',
      pie9: '#3D9A6A', pie10: '#A05A72', pie11: '#5C6570', pie12: '#5A4E82',
      pieOpacity: '1',
      pieStrokeColor: '#FFFFFF',
      pieStrokeWidth: '1.5px',
      pieOuterStrokeColor: '#C3C8D1',
      pieOuterStrokeWidth: '1px',
      pieTitleTextColor: '#1B1F26',
      pieSectionTextColor: '#1B1F26',
      pieLegendTextColor: '#1B1F26',
      quadrant1Fill: '#EEF1F5', quadrant2Fill: '#EEF1F5',
      quadrant3Fill: '#EEF1F5', quadrant4Fill: '#EEF1F5',
      quadrantPointFill: '#3A6F9C',
      quadrantPointTextFill: '#1B1F26',
      quadrantXAxisTextFill: '#5B6470',
      quadrantYAxisTextFill: '#5B6470',
      quadrantInternalBorderStrokeFill: '#C3C8D1',
      quadrantExternalBorderStrokeFill: '#C3C8D1',
      quadrantTitleFill: '#1B1F26',
      xyChart: {
        backgroundColor: '#FFFFFF',
        plotColorBackground: '#FFFFFF',
        xAxisLabelColor: '#1B1F26',
        yAxisLabelColor: '#1B1F26',
        xAxisTitleColor: '#1B1F26',
        yAxisTitleColor: '#1B1F26',
        xAxisTickColor: '#C3C8D1',
        yAxisTickColor: '#C3C8D1',
        xAxisLineColor: '#C3C8D1',
        yAxisLineColor: '#C3C8D1',
        plotColorPalette: '#3B7FC4,#C9A227,#3D9A6A,#7A6BA8,#C45C4A,#4A9BB8',
      },
    },
    themeCSS: (baseConfig('#FFFFFF').themeCSS as string) + TECH_CSS,
    // C4 element palette: official channel is the c4 config section
    // NOTE: c4 label text is hardcoded white inline (c4ShapeAdapter: color:
    // fontColor ?? '#FFFFFF', applied with !important) — no theme variable
    // can change it, so fills must stay dark enough for white text
    c4: {
      person_bg_color: '#4A6F94', person_border_color: '#3A5A78',
      external_person_bg_color: '#76828F', external_person_border_color: '#6A7581',
      system_bg_color: '#4A6F94', system_border_color: '#3A5A78',
      system_db_bg_color: '#4A6F94', system_db_border_color: '#3A5A78',
      system_queue_bg_color: '#4A6F94', system_queue_border_color: '#3A5A78',
      external_system_bg_color: '#76828F', external_system_border_color: '#6A7581',
      external_system_db_bg_color: '#76828F', external_system_db_border_color: '#6A7581',
      external_system_queue_bg_color: '#76828F', external_system_queue_border_color: '#6A7581',
      container_bg_color: '#4A6F94', container_border_color: '#3A5A78',
      container_db_bg_color: '#4A6F94', container_db_border_color: '#3A5A78',
      container_queue_bg_color: '#4A6F94', container_queue_border_color: '#3A5A78',
      external_container_bg_color: '#76828F', external_container_border_color: '#6A7581',
      external_container_db_bg_color: '#76828F', external_container_db_border_color: '#6A7581',
      external_container_queue_bg_color: '#76828F', external_container_queue_border_color: '#6A7581',
      component_bg_color: '#4A6F94', component_border_color: '#3A5A78',
      component_db_bg_color: '#4A6F94', component_db_border_color: '#3A5A78',
      component_queue_bg_color: '#4A6F94', component_queue_border_color: '#3A5A78',
      external_component_bg_color: '#76828F', external_component_border_color: '#6A7581',
      external_component_db_bg_color: '#76828F', external_component_db_border_color: '#6A7581',
      external_component_queue_bg_color: '#76828F', external_component_queue_border_color: '#6A7581',
    },
  },
  background: '#FFFFFF',
  remap: {
    '#4e79a7': '#3A6F9C', '#f28e2c': '#A87428', '#e15759': '#A05A72',
    '#76b7b2': '#3A7A74', '#59a14f': '#3B7A4C', '#edc949': '#C9A227',
    '#af7aa1': '#5A4E82', '#ff9da7': '#C4842A', '#9c755f': '#5C6570',
    '#bab0ac': '#C3C8D1',
  },
};

const OPENAI_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: #FFFFFF; stroke: #1F1F1F; }
.node polygon { fill: #F7F7F8; }
.cluster rect { fill: #FAFAFA; stroke: #E3E3E8; }
`;

const openai: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    theme: 'base',
    themeVariables: {
      fontFamily: FONT_STACK,
      fontSize: '15px',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#0D0D0D',
      primaryBorderColor: '#1F1F1F',
      secondaryColor: '#E9F5F1',
      secondaryTextColor: '#0D0D0D',
      secondaryBorderColor: '#10A37F',
      tertiaryColor: '#F7F7F8',
      tertiaryTextColor: '#0D0D0D',
      tertiaryBorderColor: '#D9D9E3',
      lineColor: '#8E8EA0',
      textColor: '#0D0D0D',
      titleColor: '#0D0D0D',
      clusterBkg: '#FAFAFA',
      clusterBorder: '#E3E3E8',
      actorBkg: '#FFFFFF',
      actorBorder: '#1F1F1F',
      actorTextColor: '#0D0D0D',
      actorLineColor: '#D9D9E3',
      signalColor: '#404040',
      signalTextColor: '#0D0D0D',
      noteBkgColor: '#F7F7F8',
      noteTextColor: '#0D0D0D',
      noteBorderColor: '#D9D9E3',
      activationBkgColor: '#E9F5F1',
      activationBorderColor: '#10A37F',
      labelColor: '#0D0D0D',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#F7F7F8',
      gridColor: '#E3E3E8',
      sectionBkgColor: '#F7F7F8',
      altSectionBkgColor: '#FFFFFF',
      sectionBkgColor2: '#E9F5F1',
    },
    themeCSS: (baseConfig('#FFFFFF').themeCSS as string) + OPENAI_CSS,
  },
  background: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// excalidraw — pastel fills, ink outlines, rough.js post-processing.
// ---------------------------------------------------------------------------

const EXCALIDRAW_MERMAID_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1.5px; }
.node rect { rx: 12px; ry: 12px; }
.node rect { fill: #A5D8FF; stroke: #1E1E1E; }
.node polygon { fill: #FFEC99; stroke: #1E1E1E; }
.node circle, .node ellipse { fill: #B2F2BB; stroke: #1E1E1E; }
.node path { fill: #D0BFFF; stroke: #1E1E1E; }
.cluster rect { rx: 12px; ry: 12px; fill: #F8F9FA; stroke: #ADB5BD; stroke-dasharray: 6 5; }
`;

const excalidraw: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    look: 'handDrawn',
    theme: 'base',
    themeVariables: {
      fontFamily: `"Excalifont", "LXGW WenKai", "Noto Sans SC", cursive, sans-serif`,
      fontSize: '15px',
      primaryColor: '#A5D8FF',
      primaryTextColor: '#1E1E1E',
      primaryBorderColor: '#1E1E1E',
      secondaryColor: '#FFEC99',
      secondaryTextColor: '#1E1E1E',
      secondaryBorderColor: '#1E1E1E',
      tertiaryColor: '#B2F2BB',
      tertiaryTextColor: '#1E1E1E',
      tertiaryBorderColor: '#1E1E1E',
      lineColor: '#1E1E1E',
      textColor: '#1E1E1E',
      titleColor: '#1E1E1E',
      clusterBkg: '#F8F9FA',
      clusterBorder: '#ADB5BD',
      edgeLabelBackground: '#FFFFFF',
      actorBkg: '#A5D8FF',
      actorBorder: '#1E1E1E',
      actorTextColor: '#1E1E1E',
      actorLineColor: '#ADB5BD',
      signalColor: '#1E1E1E',
      signalTextColor: '#1E1E1E',
      noteBkgColor: '#FFEC99',
      noteTextColor: '#1E1E1E',
      noteBorderColor: '#1E1E1E',
      labelColor: '#1E1E1E',
      stateBkg: '#B2F2BB',
      stateBorder: '#1E1E1E',
    },
    themeCSS: (baseConfig('#FFFFFF').themeCSS as string) + EXCALIDRAW_MERMAID_CSS,
  },
  background: '#FFFFFF',
};

const EXCALIDRAW_BLOCK_CSS = `
.wrap { padding: 24px 36px 32px 28px; background: #FFFFFF; color: #1E1E1E; font-family: "Excalifont", "LXGW WenKai", "Noto Sans SC", cursive, sans-serif; }
.caption-title { font-size: 22px; font-weight: 600; }
.caption-sub, .caption-foot { color: #6C757D; }
.cards { grid-template-columns: repeat(2, 280px); gap: 18px; }
.card { background: #FFFFFF; border: 1.5px solid #1E1E1E; border-radius: 12px; box-shadow: 4px 4px 0 #E9ECEF; padding: 18px 20px; }
.card::before { display: none; }
.card-title { font-size: 16px; font-weight: 600; }
.card-desc { color: #495057; font-size: 13px; }
.kpi { border: 1.5px solid #1E1E1E; border-radius: 12px; box-shadow: 4px 4px 0 #E9ECEF; min-width: 420px; }
.kpi-row { border-bottom: 1.5px dashed #DEE2E6; padding: 14px 18px; }
.kpi-value { font-size: 28px; }
.kpi-value.is-focus { color: #1971C2; }
table { border: 1.5px solid #1E1E1E; border-radius: 12px; box-shadow: 4px 4px 0 #E9ECEF; }
thead th { background: #F8F9FA; }
th, td { border-bottom: 1px solid #DEE2E6; }
tbody tr:nth-child(even) td { background: #F8F9FA; }
.task, .cmp, .vs, .hm { border: 1.5px solid #1E1E1E; border-radius: 12px; box-shadow: 4px 4px 0 #E9ECEF; }
.task-row { border-bottom: 1px dashed #DEE2E6; }
.task-chip, .task-badge { border-radius: 9999px; }
.fn-track, .fn-bar { border-radius: 9999px; }
`;

// ---------------------------------------------------------------------------
// ios — grouped-list chrome. The shared block CSS draws an accent bar down
// every card and tints bullets; iOS marks content with white inset cards and
// hairline separators, and spends the tint on values and controls only.
// ---------------------------------------------------------------------------
const IOS_BLOCK_CSS = `
:root { color-scheme: light; }
body { background: #F2F2F7; }
.wrap { font-size: 15px; color: #1C1C1E; background: transparent; }
.caption-title { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.caption-sub, .caption-foot { color: #6E6E73; }
.cards { grid-template-columns: repeat(2, 300px); gap: 14px; }
.card {
  background: #FFFFFF; border: 1px solid #D1D1D6; border-radius: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04); padding: 14px 34px 14px 16px;
}
.card::before { display: none; }
/* The chevron is the one piece of chrome iOS puts on every row it can drill
   into; it reads as the platform before the palette does. */
.card::after {
  content: "›"; position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  color: #C7C7CC; font-size: 20px; line-height: 1; font-weight: 400;
}
.card-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.card-desc { font-size: 13px; color: #6E6E73; }
.kpi { background: #FFFFFF; border: 1px solid #D1D1D6; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); min-width: 400px; }
.kpi-row { border-bottom: 1px solid rgba(60,60,67,0.29); padding: 12px 16px; }
.kpi-name { font-size: 13px; color: #6E6E73; }
.kpi-value { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.kpi-value.is-focus { color: #007AFF; }
.kpi-up { color: #FF3B30; }
.kpi-down { color: #34C759; }
.task, .cmp, .vs, .hm { background: #FFFFFF; border: 1px solid #D1D1D6; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.task-row { border-bottom: 1px solid rgba(60,60,67,0.29); padding: 12px 16px; }
.task-chip, .task-badge { border-radius: 9999px; background: #F2F2F7; }
.fn-track { background: #E5E5EA; border-radius: 9999px; }
.fn-bar { background: #007AFF; border-radius: 9999px; }
table { background: #FFFFFF; border: 1px solid #D1D1D6; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
thead th { background: #FFFFFF; color: #6E6E73; font-size: 13px; font-weight: 500; }
th, td { border-bottom: 1px solid rgba(60,60,67,0.29); }
th + th, td + td { border-left: none; }
tbody tr:nth-child(even) td { background: #FFFFFF; }
li::before { color: #007AFF; }
`;

// ---------------------------------------------------------------------------
// epaper — e-ink: black hairlines, square corners, no shadow, no accent colour.
// Shape families are told apart by grey level instead of hue, which is what a
// monochrome panel (or a black-and-white print) can actually show.
// ---------------------------------------------------------------------------
const EPAPER_BLOCK_CSS = `
:root { color-scheme: light; }
body {
  background-color: #F5F1EB;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-blend-mode: multiply;
}
.wrap {
  color: #1A1A1A; background: transparent;
  font-family: "Newsreader", "Noto Serif SC", serif;
}
.caption-title { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.caption-sub { color: #444444; }
.caption-foot { color: #666666; font-family: "${MONO_FAMILY}", "Cascadia Code", Consolas, ui-monospace, monospace; letter-spacing: 0.06em; }
.cards { grid-template-columns: repeat(2, 300px); gap: 18px; }
.card { background: transparent; border: 1px solid #1A1A1A; border-radius: 0; box-shadow: none; padding: 20px 22px; }
.card::before { display: none; }
.card-title { font-size: 17px; font-weight: 500; }
.card-desc { font-size: 14px; color: #444444; }
.kpi { background: transparent; border: 1px solid #1A1A1A; border-radius: 0; }
.kpi-row { border-bottom: 1px solid #DDDDDD; padding: 14px 20px; }
.kpi-row:last-child { border-bottom: none; }
.kpi-name { color: #666666; }
.kpi-value { font-weight: 500; }
.task, .cmp, .vs, .hm { background: transparent; border: 1px solid #1A1A1A; border-radius: 0; }
.task-row { border-bottom: 1px solid #DDDDDD; padding: 14px 20px; }
.task-chip, .task-badge { border-radius: 0; background: transparent; border: 1px solid #1A1A1A; }
.fn-track { background: #EDE9E2; border-radius: 0; }
.fn-bar { background: #1A1A1A; border-radius: 0; }
table { background: transparent; border: 1px solid #1A1A1A; border-radius: 0; }
thead th {
  background: transparent; color: #1A1A1A; font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.12em;
  font-family: "${MONO_FAMILY}", "Cascadia Code", Consolas, ui-monospace, monospace;
  border-bottom: 1px solid #1A1A1A;
}
th, td { border-bottom: 1px solid #DDDDDD; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:nth-child(even) td { background: transparent; }
th + th, td + td { border-left: none; }
li::before { color: #1A1A1A; }
`;

// ---------------------------------------------------------------------------
// acnh — cream paper, thick brown outlines, sticker shadows, rounded type.
// Block pages get the same paper through ACNH_BLOCK_CSS.
// ---------------------------------------------------------------------------
const ACNH_BLOCK_CSS = `
:root { color-scheme: light; }
body {
  background-color: #FFF8E7;
  background-image: radial-gradient(#F0DFC2 1.1px, transparent 1.1px);
  background-size: 18px 18px;
}
.wrap { font-size: 15px; color: #5B4636; background: transparent; }
.caption-title { font-size: 20px; font-weight: 700; color: #5B4636; }
.caption-title::before { content: "\\1F343  "; }
.caption-sub, .caption-foot { color: #7A6350; }
.cards { gap: 18px; }
.card {
  background: #FFFDF5; border: 3px solid #7A5C3E; border-radius: 22px;
  box-shadow: 0 6px 0 #E2CFA9; padding: 18px 20px;
}
.card::before { display: none; }
.card-icon { font-size: 22px; }
.card-title { font-size: 16px; font-weight: 700; color: #5B4636; }
.card-desc { font-size: 14px; color: #7A6350; }
.kpi { border: 3px solid #7A5C3E; border-radius: 22px; background: #FFFDF5; box-shadow: 0 6px 0 #E2CFA9; min-width: 380px; }
.kpi-row { border-bottom: 2px dashed #E2CFA9; padding: 14px 20px; }
.kpi-name { color: #7A6350; font-size: 14px; }
.kpi-value { color: #3E8C4A; font-size: 28px; }
.kpi-delta { font-size: 14px; }
.task, .cmp, .vs, .hm { border: 3px solid #7A5C3E; border-radius: 22px; background: #FFFDF5; box-shadow: 0 6px 0 #E2CFA9; }
.task-row { border-bottom: 2px dashed #E2CFA9; padding: 14px 18px; }
.task-name { font-size: 15px; }
.task-seg { width: 18px; height: 8px; border-radius: 99px; }
.task-seg.on { background: #4FA85B; }
.task-badge { border-radius: 99px; padding: 3px 12px; font-size: 12px; }
.st-dev { color: #8A5A1F; background: #FFE8A3; }
.st-idle { color: #6B5B4A; background: #F1E4CC; }
.st-done { color: #2F7A43; background: #DDF2D4; }
.st-block { color: #A33B2A; background: #FFE0D6; }
.task-chip { border-radius: 99px; background: #FDF1D6; color: #7A6350; }
table { border: 3px solid #7A5C3E; border-radius: 22px; background: #FFFDF5; box-shadow: 0 6px 0 #E2CFA9; }
thead th { background: #FDF1D6; color: #5B4636; }
th, td { border-bottom: 2px dashed #E2CFA9; }
tbody tr:nth-child(even) td { background: #FFFBEF; }
`;

const acnh: ThemePreset = {
  config: baseConfig('#FFF8E7'),
  background: '#FFF8E7',
};

// ---------------------------------------------------------------------------
// zed — the editor's own chrome: One Dark / One Light tokens, 1px hairlines,
// flat surfaces, no shadow and no texture. Shape families are painted the way
// Zed paints a flowchart node: the accent itself as the outline, the same
// accent at 15% over the page as the fill.
// ---------------------------------------------------------------------------

/** Zed's accent fill: the accent laid over the page colour, not over white. */
function zedFill(accent: string, bg: string): string {
  return blendOver(accent, bg, 0.15);
}

/**
 * Zed walks the eight player colours by reading order (`node_counter % 8`) and
 * paints each node with the accent plus its 15% tint, so a Zed flowchart is
 * multi-hue rather than shape-coded. It runs that counter for flowchart, class
 * and state diagrams; Pele writes a diagram's nodes into one `<g>` in document
 * order, which makes the rotation a set of `:nth-child` rules. The shapes are
 * direct children of the node group, so `>` keeps the paint off nested chrome.
 * Start/end markers and composite frames are not nodes and stay as they are.
 */
function zedNodeRotation(series: string[], bg: string): string {
  const groups = [
    '.pele-flowchart .pele-nodes > .pele-node',
    '.pele-class .pele-nodes > .pele-node',
    '.pele-state .pele-nodes > .pele-node:not(.pele-state-start):not(.pele-state-end):not(.pele-state-composite)',
  ];
  const shapes = ['rect', 'circle', 'ellipse', 'polygon'];
  const rules: string[] = [];
  series.forEach((accent, i) => {
    const at = groups.map((g) => `${g}:nth-child(${series.length}n+${i + 1})`);
    const fill = zedFill(accent, bg);
    const boxed = at.flatMap((a) => shapes.map((s) => `${a} > ${s}`)).join(',');
    const paths = at.map((a) => `${a} > path`).join(',');
    const head = at.map((a) => `${a} > path:first-child`).join(',');
    rules.push(
      `${boxed}{fill:${fill};stroke:${accent}}`,
      `${paths}{stroke:${accent}}`,
      // The cylinder body is its first path; the rest only carry the outline.
      `${head}{fill:${fill}}`,
    );
  });
  return rules.join('\n');
}

/**
 * Task-status chips for a Zed page, built the way Zed builds its error and
 * warning chips: scale the accent's lightness (down on a dark page, up on a
 * light one), then derive the text from that stock. `adjust_lightness` in
 * `postprocess/inject_css.rs` does the first half in HSL; OKLab L is the house
 * metric, so `scaleLightness` does it there.
 */
function zedChips(dark: boolean): string {
  const chip = (accent: string): string => {
    const stock = scaleLightness(accent, dark ? 0.7 : 1.3);
    return `color:${textColorFor(stock)};background:${stock}`;
  };
  return [
    `.st-design{${chip('#5C78E2')}}`,
    `.st-dev{${chip('#AD6E26')}}`,
    `.st-test{${chip('#984EA5')}}`,
    `.st-done{${chip('#3F953A')}}`,
    `.st-block{${chip('#D36151')}}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// zed-light — the light half of the Zed pair. Block pages read as editor
// panels: the surface token for the sheet, the border token for the hairline,
// no accent bar down the side of a card. Its sibling below is the dark half.
// ---------------------------------------------------------------------------
const ZED_LIGHT_BLOCK_CSS = `
:root { color-scheme: light; }
${zedChips(false)}
body { background-color: #FAFAFA; }
.card, .kpi, .task, .cmp, .vs, .hm, table { background: #EBEBEC; border-color: #C9C9CA; border-radius: 6px; }
.card::before { display: none; }
.card-desc, .kpi-name, .cmp-sub, .fn-val, .vs-lab, .vs-val, .gg-sub,
.hm-wday, .hm-ml, .hm-legend, .pr-leg-val, .sw-lane { color: #58585A; }
thead th { background: #E4E4E5; color: #58585A; }
th, td { border-color: #C9C9CA; }
tbody tr:nth-child(even) td { background: #F2F2F3; }
code { background: #E4E4E5; }
.fn-track { background: #E4E4E5; }
.task-chip { background: #E4E4E5; color: #58585A; }
.hm-cell { background: #E4E4E5; }
.sw-band { fill: #EBEBEC; }
.sw-band.alt { fill: #E4E4E5; }
.sw-step rect { fill: #EBEBEC; }
.sw-edge { stroke: #7C7E86; }
.pr-track { stroke: #C9C9CA; }
`;

const ZED_DARK_BLOCK_CSS = `
:root { color-scheme: dark; }
body { background-color: #282C33; }
.wrap { color: #DCE0E5; background: transparent; }
.caption-title { color: #DCE0E5; }
.caption-sub, .caption-foot { color: #A9AFBC; }
.card, .kpi, .task, .cmp, .vs, .hm, table { background: #2F343E; border-color: #464B57; }
.card-desc, .kpi-name, .cmp-sub, .fn-val, .vs-lab, .vs-val, .gg-sub,
.hm-wday, .hm-ml, .hm-legend, .pr-leg-val, .sw-lane { color: #A9AFBC; }
thead th { background: #2E343E; color: #A9AFBC; }
th, td { border-color: #464B57; }
tbody tr:nth-child(even) td { background: #2E343E; }
code { background: #2E343E; }
.fn-track { background: #2E343E; }
.task-seg { background: #464B57; }
.task-chip { background: #2E343E; color: #A9AFBC; }
.task-row.is-cancel { background: #2E343E; }
.task-row.is-cancel .task-seg.on { background: #5D636F; }
.kpi-up { color: #D07277; }
.kpi-down { color: #A1C181; }
.hm-cell { background: #2E343E; }
.hm-cell.lv4 { background: var(--accent); color: #282C33; }
.sw-band { fill: #2F343E; }
.sw-band.alt { fill: #2E343E; }
.sw-step rect { fill: #2F343E; }
.sw-edge { stroke: #636D83; }
.pr-track { stroke: #464B57; }
${zedChips(true)}
`;

// ---------------------------------------------------------------------------
// ios — grouped light-grey background, white translucent surfaces, hairlines,
// system colours. The palette and the shadow are iOS system values.
// ---------------------------------------------------------------------------
const ios: ThemePreset = {
  config: baseConfig('#F2F2F7'),
  background: '#F2F2F7',
};

// ---------------------------------------------------------------------------
// epaper — monochrome e-ink: black hairlines on off-white, no colour, no depth.
// ---------------------------------------------------------------------------
const epaper: ThemePreset = {
  config: baseConfig('#F5F1EB'),
  background: '#F5F1EB',
};

// ---------------------------------------------------------------------------
// zed / zed-light — Zed editor chrome. Same palette rules as above; the values
// are the editor's own tokens (see PELE_THEMES).
// ---------------------------------------------------------------------------

const zed: ThemePreset = {
  config: baseConfig('#282C33'),
  background: '#282C33',
  dark: true,
};

const zedLight: ThemePreset = {
  config: baseConfig('#FAFAFA'),
  background: '#FAFAFA',
};

export const PRESETS: Record<string, ThemePreset> = {
  tech,
  openai,
  excalidraw,
  ios,
  acnh,
  epaper,
  zed,
  'zed-light': zedLight,
};

export const DEFAULT_THEME = 'tech';

export const SIZE_PRESETS = {
  slide: { width: 1600, scale: 2 },
  a4: { width: 900, scale: 2 },
  square: { width: 1080, scale: 2 },
  /** Chat / narrow doc column (~1/3 of a 2560×1440 office display). */
  column: { width: 800, scale: 2 },
} as const;

export type SizePreset = keyof typeof SIZE_PRESETS;

/** Slide deck density: larger type, air, and stroke weight for projection. */
const SLIDE_WEIGHT_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 2px !important; }
.edgePath .path { stroke-width: 1.75px !important; }
.cluster rect { stroke-width: 1.5px !important; }
.nodeLabel { font-weight: 600; }
.xAxis .tick text, .yAxis .tick text { font-size: 14px; }
`;

export function applySlideDensity(config: Record<string, unknown>): void {
  config.fontSize = 18;
  const tv = (config.themeVariables ?? {}) as Record<string, unknown>;
  tv.fontSize = '18px';
  config.themeVariables = tv;
  const fc = (config.flowchart ?? {}) as Record<string, unknown>;
  fc.nodeSpacing = 88;
  fc.rankSpacing = 88;
  fc.padding = 22;
  fc.wrappingWidth = 300;
  config.flowchart = fc;
  const seq = (config.sequence ?? {}) as Record<string, unknown>;
  seq.actorMargin = 72;
  seq.messageMargin = 52;
  config.sequence = seq;
  config.themeCSS = ((config.themeCSS as string) || '') + SLIDE_WEIGHT_CSS;
}

/**
 * Chat-column density: keep type readable at ~800px CSS width
 * (≈1/3 of a 2560×1440 office display). wrappingWidth is the real lever —
 * mermaid will not reflow LR→TD.
 */
export function applyColumnDensity(config: Record<string, unknown>): void {
  config.fontSize = 18;
  const tv = (config.themeVariables ?? {}) as Record<string, unknown>;
  tv.fontSize = '18px';
  config.themeVariables = tv;
  const fc = (config.flowchart ?? {}) as Record<string, unknown>;
  fc.nodeSpacing = 56;
  fc.rankSpacing = 64;
  fc.padding = 14;
  fc.wrappingWidth = 200;
  config.flowchart = fc;
  const seq = (config.sequence ?? {}) as Record<string, unknown>;
  seq.actorMargin = 40;
  seq.messageMargin = 36;
  seq.wrap = true;
  config.sequence = seq;
}

export function deepMerge<T extends Record<string, unknown>>(base: T, extra: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const b = out[k];
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)
        ? deepMerge(b as Record<string, unknown>, v as Record<string, unknown>)
        : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// v2 themes — Pele CSS variables. Pele bakes no colours into the SVG, so the
// same theme drives PNG, themeable SVG, and HTML blocks.
// ---------------------------------------------------------------------------

interface PeleSeed {
  name: string;
  dark: boolean;
  bg: string;
  fg: string;
  muted: string;
  line: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  critical: string;
  radius?: string;
  font?: string;
  series: string[];
  style?: ThemeStyle;
  backdrop?: ThemeBackdrop;
  blockCss?: string;
  fonts?: string[];
  shapes: {
    process: [string, string];
    decision: [string, string];
    state: [string, string];
    store: [string, string];
    cluster?: [string, string];
  };
  css?: string;
}

const paint = ([fill, stroke]: [string, string]): ThemePaint => ({ fill, stroke });

function mkTheme(s: PeleSeed): ThemeSpec {
  return {
    name: s.name,
    dark: s.dark,
    background: s.bg,
    fontFamily: s.font ?? FONT_STACK,
    vars: {
      bg: s.bg, fg: s.fg, muted: s.muted, line: s.line,
      surface: s.surface, surfaceAlt: s.surfaceAlt, border: s.border,
      accent: s.accent, critical: s.critical, radius: s.radius ?? '4px',
      font: s.font ?? FONT_STACK, series: s.series,
    },
    shapes: {
      process: paint(s.shapes.process),
      decision: paint(s.shapes.decision),
      state: paint(s.shapes.state),
      store: paint(s.shapes.store),
      cluster: s.shapes.cluster ? paint(s.shapes.cluster) : undefined,
    },
    css: s.css ?? '',
    ...(s.style ? { style: s.style } : {}),
    ...(s.backdrop ? { backdrop: s.backdrop } : {}),
    // The page stack rides in the theme's own block CSS: PAGE_CSS reads
    // var(--font), so every caller that passes blockCss gets the theme's
    // bundled type stack without having to remember an extra option.
    blockCss: `:root{--font:${s.font ?? FONT_STACK};}
` + (s.blockCss ?? ''),
    ...(s.fonts ? { fonts: s.fonts } : {}),
  };
}

const PELE_THEMES: Record<string, ThemeSpec> = {
  tech: mkTheme({
    name: 'tech', dark: false, bg: '#FFFFFF', fg: '#1B1F26', muted: '#5B6470',
    line: '#5B6570', surface: '#D7E4F4', surfaceAlt: '#EEF1F5', border: '#C3C8D1',
    accent: '#2563EB', critical: '#A87428', radius: '6px',
    series: ['#3B7FC4', '#3D9A6A', '#5C6570', '#B98F00', '#C45C4A', '#4A9BB8', '#7A6BA8', '#C77A16'],
    shapes: {
      process: ['#D7E4F4', '#3A6F9C'],
      decision: ['#F3E4C8', '#A87428'],
      state: ['#D4E8DA', '#3B7A4C'],
      store: ['#E3DCEC', '#5A4E82'],
      cluster: ['#EEF1F5', '#C3C8D1'],
    },
  }),
  openai: mkTheme({
    name: 'openai', dark: false, bg: '#FFFFFF', fg: '#0D0D0D', muted: '#6E6E80',
    line: '#8E8EA0', surface: '#FFFFFF', surfaceAlt: '#F7F7F8', border: '#1F1F1F',
    accent: '#10A37F', critical: '#C45C4A',
    series: ['#19A37F', '#3D6CD3', '#B98F00', '#A15163', '#5A4E82', '#38857B', '#C45C4A', '#5A6676'],
    shapes: {
      process: ['#FFFFFF', '#1F1F1F'],
      decision: ['#F7F7F8', '#1F1F1F'],
      state: ['#F2FAF7', '#10A37F'],
      store: ['#FFFFFF', '#8E8EA0'],
      cluster: ['#FAFAFA', '#E3E3E8'],
    },
  }),
  excalidraw: mkTheme({
    name: 'excalidraw', dark: false, bg: '#FFFFFF', fg: '#1E1E1E', muted: '#6C757D',
    line: '#1E1E1E', surface: '#A5D8FF', surfaceAlt: '#F8F9FA', border: '#ADB5BD',
    accent: '#1971C2', critical: '#E03131', radius: '12px',
    font: `"Excalifont", "LXGW WenKai", "Noto Sans SC", cursive, sans-serif`,
    fonts: ['Excalifont', 'LXGW WenKai'],
    series: ['#1971C2', '#23A048', '#DB7E00', '#D43031', '#7950F2', '#0F8599', '#E75D1C', '#868E96'],
    style: {
      rough: true, roughness: 1.0, bowing: 1.2, fillStyle: 'solid',
      hachureGap: 7, hachureAngle: -41, fillWeight: 1.1, seed: 41,
      strokeWidth: 1.5, shapeCoverage: true,
    },
    blockCss: EXCALIDRAW_BLOCK_CSS,
    shapes: {
      process: ['#A5D8FF', '#1E1E1E'],
      decision: ['#FFEC99', '#1E1E1E'],
      state: ['#B2F2BB', '#1E1E1E'],
      store: ['#D0BFFF', '#1E1E1E'],
      cluster: ['#F8F9FA', '#ADB5BD'],
    },
  }),
  ios: mkTheme({
    name: 'ios', dark: false, bg: '#F2F2F7', fg: '#1C1C1E', muted: '#6E6E73',
    line: '#7C7C82', surface: '#FFFFFF', surfaceAlt: '#FFFFFF',
    border: '#D1D1D6', accent: '#007AFF', critical: '#D70015', radius: '14px',
    // The bundled sans leads: on a Mac the Apple faces would otherwise render
    // this theme with different metrics than the committed gallery.
    font: `"Noto Sans SC", -apple-system, "SF Pro Text", "SF Pro Display", "PingFang SC", sans-serif`,
    series: ['#007AFF', '#248A3D', '#C23A17', '#D70015', '#8944AB', '#006C9F', '#B15109', '#6C6C70'],
    style: { strokeWidth: 1.6, shapeCoverage: true },
    // Flat grouped page: no wallpaper tint and no filter depth, so the sheet
    // reads as a system surface rather than as a rendered object.
    css: '.pele-edge path{stroke-opacity:0.9}',
    blockCss: IOS_BLOCK_CSS,
    shapes: {
      process: ['#FFFFFF', '#007AFF'],
      decision: ['#FFE9CF', '#C23A17'],
      state: ['#E3F6E7', '#248A3D'],
      store: ['#F1E9FB', '#8A48AC'],
      cluster: ['#FFFFFF', '#D1D1D6'],
    },
  }),
  epaper: mkTheme({
    name: 'epaper', dark: false, bg: '#F5F1EB', fg: '#1A1A1A', muted: '#666666',
    line: '#1A1A1A', surface: '#F5F1EB', surfaceAlt: '#EDE9E2', border: '#1A1A1A',
    accent: '#1A1A1A', critical: '#1A1A1A', radius: '0px',
    // Greys for the chart series: the lightest one stops at #8A8A8A, which is
    // the first step that clears 3:1 against the stock (the pie prints its
    // value in the page colour inside the slice).
    series: ['#1A1A1A', '#4A4A4A', '#6E6E6E', '#8A8A8A', '#2E2E2E', '#5C5C5C', '#3A3A3A', '#7A7A7A'],
    style: { strokeWidth: 1.1, shapeCoverage: true },
    // Paper grain, not a tint: the sheet is the page colour and only the
    // turbulence shows, which is what makes it read as stock instead of a fill.
    backdrop: { base: '#F5F1EB', pane: { color: '#F5F1EB', noise: 0.05 } },
    // Blocks print in the editorial serif; both families are bundled, so the
    // page does not fall back to Georgia or SimSun depending on the machine.
    fonts: ['Newsreader', 'Noto Serif SC'],
    blockCss: EPAPER_BLOCK_CSS,
    shapes: {
      process: ['#FFFFFF', '#1A1A1A'],
      decision: ['#EDE9E2', '#1A1A1A'],
      state: ['#E4E0D8', '#1A1A1A'],
      store: ['#F5F1EB', '#1A1A1A'],
      cluster: ['#F5F1EB', '#1A1A1A'],
    },
  }),
  acnh: mkTheme({
    name: 'acnh', dark: false, bg: '#FFF8E7', fg: '#5B4636', muted: '#7A6350',
    line: '#7A5C3E', surface: '#FFFDF5', surfaceAlt: '#FDF1D6', border: '#D9C3A5',
    accent: '#3E8C4A', critical: '#A33B2A', radius: '16px',
    font: `"ZCOOL KuaiLe", "Baloo 2", "Noto Sans SC", sans-serif`,
    fonts: ['ZCOOL KuaiLe', 'Baloo 2'],
    series: ['#3E8C4A', '#CE7E00', '#7A5C3E', '#A33B2A', '#5B86C7', '#78675B', '#CB788D', '#619E6A'],
    style: { strokeWidth: 2.6, shapeCoverage: true },
    // Cream paper with the dotted grid the block pages draw in CSS.
    backdrop: { base: '#FFF8E7', dots: { color: '#F0DFC2', size: 1.1, gap: 18 } },
    css: [
      // Hard offset sticker shadow: 0 blur keeps it a solid silhouette.
      '.pele-node rect,.pele-node circle,.pele-node ellipse,.pele-node polygon,.pele-node path{filter:drop-shadow(0 5px 0 #E2CFA9)}',
      '.pele-cluster rect{filter:drop-shadow(0 4px 0 #EFE2C6)}',
      '.pele-node text,.pele-edge-label text{font-weight:700}',
      '.pele-node .pele-label{stroke:none}',
    ].join('\n'),
    blockCss: ACNH_BLOCK_CSS,
    shapes: {
      process: ['#FFFDF5', '#7A5C3E'],
      decision: ['#FFE8A3', '#7A5C3E'],
      state: ['#DDF2D4', '#3E8C4A'],
      store: ['#F1E4CC', '#7A5C3E'],
      cluster: ['#FDF1D6', '#D9C3A5'],
    },
  }),
  zed: mkTheme({
    name: 'zed', dark: true, bg: '#282C33', fg: '#DCE0E5', muted: '#A9AFBC',
    // One Dark tokens: editor.background / text / text.muted / surface.background
    // / element.background / border. Edges take terminal.dim_foreground, the
    // editor's own de-emphasised stroke, lightened until it clears the 3:1 a
    // connector needs against the dark page.
    line: '#7A8598', surface: '#2F343E', surfaceAlt: '#2E343E', border: '#464B57',
    accent: '#74ADE8', critical: '#D07277',
    series: ['#70B2ED', '#CE5C4D', '#BF956A', '#B477CF', '#77ADB5', '#D07277', '#DEC78B', '#A1C181'],
    // Zed colours flowchart nodes by reading order; state / class / ER keep the
    // shape-family paint below.
    style: { strokeWidth: 1, shapeCoverage: true, nodeRotation: true },
    blockCss: ZED_DARK_BLOCK_CSS,
    shapes: {
      // info blue / syntax number / created green / syntax keyword, each filled
      // with itself at 15% over the page.
      process: [zedFill('#74ADE8', '#282C33'), '#74ADE8'],
      decision: [zedFill('#BF956A', '#282C33'), '#BF956A'],
      state: [zedFill('#A1C181', '#282C33'), '#A1C181'],
      store: [zedFill('#B477CF', '#282C33'), '#B477CF'],
      cluster: ['#2F343E', '#636D83'],
    },
  }),
  'zed-light': mkTheme({
    name: 'zed-light', dark: false, bg: '#FAFAFA', fg: '#242529', muted: '#58585A',
    // One Light tokens; edges take syntax comment.doc for the same reason.
    line: '#7C7E86', surface: '#EBEBEC', surfaceAlt: '#EBEBEC', border: '#C9C9CA',
    accent: '#5C78E2', critical: '#D36151',
    series: ['#5E77E2', '#9955A5', '#AE6D22', '#A142AD', '#3285BD', '#D1514D', '#A08210', '#5B934D'],
    style: { strokeWidth: 1, shapeCoverage: true, nodeRotation: true },
    blockCss: ZED_LIGHT_BLOCK_CSS,
    shapes: {
      process: [zedFill('#5C78E2', '#FAFAFA'), '#5C78E2'],
      decision: [zedFill('#AD6E26', '#FAFAFA'), '#AD6E26'],
      state: [zedFill('#3F953A', '#FAFAFA'), '#3F953A'],
      store: [zedFill('#984EA5', '#FAFAFA'), '#984EA5'],
      cluster: ['#EBEBEC', '#7C7E86'],
    },
  }),
};

for (const [name, preset] of Object.entries(PRESETS)) {
  const t = PELE_THEMES[name];
  if (t) preset.pele = t;
}

export function getTheme(name: string): ThemeSpec {
  const t = PRESETS[name]?.pele;
  if (!t) throw new Error(`theme "${name}" has no Pele palette`);
  return clone(t);
}

export function applyBrandToTheme(theme: ThemeSpec, accent: string): void {
  theme.vars.accent = accent;
}

/**
 * Editorial paper stock: cool off-white sheet, near-black ink, burnt-tangerine
 * accent, ruled with a graph grid. The palette follows the editorial
 * (diagram-design) skin — white-smoke paper, jet-black ink, blue-slate muted —
 * so a `--tone paper` diagram matches a document page instead of a manila
 * envelope.
 */
const PAPER = {
  bg: '#FAFAF8',
  fg: '#1F2024',
  muted: '#5D6167',
  line: '#8B8F96',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1EE',
  border: '#E1E1DC',
  accent: '#BF4520',
  critical: '#A01D48',
  grid: { color: 'rgba(31,32,36,0.09)', gap: 24, width: 1 },
  gridMajor: { color: 'rgba(31,32,36,0.16)', gap: 96, width: 1 },
  series: ['#505A6B', '#3F6B5A', '#8A6A3B', '#8C4A3A', '#5B4A7A', '#3A6F94', '#77607C', '#717363'],
  shapes: {
    process: ['#E7ECF3', '#3D5878'],
    decision: ['#F4E8D8', '#96601F'],
    state: ['#E3EDE7', '#3B6B4A'],
    store: ['#EAE7F1', '#7A5AA8'],
    cluster: ['#F1F1EE', '#E1E1DC'],
  } satisfies Record<string, [string, string]>,
};

/**
 * `--tone paper` repaints the SVG palette onto ruled paper. The tone already
 * means paper for block pages, so it means the same thing for a diagram: the
 * sheet gets the same graph ruling the block pages draw in CSS. Font, radius
 * and the rough.js knobs stay, which makes
 * `--theme excalidraw --tone paper` a sketch on paper.
 */
export function paperize(theme: ThemeSpec): ThemeSpec {
  const out = clone(theme);
  out.dark = false;
  out.background = PAPER.bg;
  out.vars = {
    ...out.vars,
    bg: PAPER.bg, fg: PAPER.fg, muted: PAPER.muted, line: PAPER.line,
    surface: PAPER.surface, surfaceAlt: PAPER.surfaceAlt, border: PAPER.border,
    accent: PAPER.accent, critical: PAPER.critical, series: PAPER.series,
  };
  out.shapes = {
    process: paint(PAPER.shapes.process),
    decision: paint(PAPER.shapes.decision),
    state: paint(PAPER.shapes.state),
    store: paint(PAPER.shapes.store),
    cluster: paint(PAPER.shapes.cluster),
  };
  out.backdrop = { base: PAPER.bg, grid: { ...PAPER.grid, major: PAPER.gridMajor }, fade: 97 };
  return out;
}

/** CSS that carries the theme into Pele's SVG (injected as <style> inside it). */
export function peleCss(theme: ThemeSpec, opts: { strokeWidth?: number; labelWeight?: number } = {}): string {
  const v = theme.vars;
  const sw = opts.strokeWidth ?? theme.style?.strokeWidth ?? 1.5;
  const series = Array.from({ length: 8 }, (_, i) =>
    `--pele-series-${i + 1}:${v.series[i % v.series.length]};`).join('');
  const cluster = theme.shapes.cluster;
  const full = theme.style?.shapeCoverage;
  const extra = full ? [
    `.pele-flowchart .pele-shape-rounded rect,.pele-flowchart .pele-shape-stadium rect,.pele-flowchart .pele-shape-fr-rect rect{fill:${theme.shapes.process.fill};stroke:${theme.shapes.process.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-fr-rect path{stroke:${theme.shapes.process.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-hex polygon,.pele-flowchart .pele-shape-lean-r polygon,.pele-flowchart .pele-shape-odd polygon{fill:${theme.shapes.decision.fill};stroke:${theme.shapes.decision.stroke};stroke-width:${sw}px}`,
    `.pele .pele-state-start circle{fill:${theme.shapes.state.stroke};stroke:none}`,
    `.pele .pele-state-end circle:first-child{fill:${v.bg};stroke:${theme.shapes.state.stroke};stroke-width:${sw}px}`,
    `.pele .pele-state-end circle:last-child{fill:${theme.shapes.state.stroke};stroke:none}`,
    `.pele .pele-state-composite > rect{fill:none;stroke:${theme.shapes.state.stroke};stroke-width:${sw}px;stroke-dasharray:6 5}`,
    `.pele .pele-class > rect,.pele .pele-entity > rect{fill:${theme.shapes.process.fill};stroke:${theme.shapes.process.stroke};stroke-width:${sw}px}`,
    `.pele .pele-annotation > rect{fill:${theme.shapes.decision.fill};stroke:${theme.shapes.decision.stroke};stroke-width:${sw}px}`,
    `.pele .pele-divider,.pele .pele-er-divider{stroke:${theme.shapes.process.stroke};stroke-width:${sw}px}`,
    `.pele .pele-er-stripes rect{fill:${v.surfaceAlt}}`,
  ] : [];
  return [
    `.pele{--pele-bg:${v.bg};--pele-fg:${v.fg};--pele-muted:${v.muted};`,
    `--pele-line:${v.line};--pele-surface:${v.surface};--pele-surface-alt:${v.surfaceAlt};`,
    `--pele-border:${v.border};--pele-accent:${v.accent};--pele-critical:${v.critical};`,
    `--pele-radius:${v.radius ?? '4px'};--pele-font:${v.font ?? FONT_STACK};${series}}`,
    `.pele-flowchart .pele-shape-rect rect{fill:${theme.shapes.process.fill};stroke:${theme.shapes.process.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-diam polygon{fill:${theme.shapes.decision.fill};stroke:${theme.shapes.decision.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-circle circle,.pele-flowchart .pele-shape-double-circle circle{fill:${theme.shapes.state.fill};stroke:${theme.shapes.state.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-cyl path{stroke:${theme.shapes.store.stroke};stroke-width:${sw}px}`,
    `.pele-flowchart .pele-shape-cyl path:first-child{fill:${theme.shapes.store.fill}}`,
    `.pele-state .pele-shape-rect rect{fill:${theme.shapes.state.fill};stroke:${theme.shapes.state.stroke};stroke-width:${sw}px}`,
    cluster ? `.pele .pele-cluster rect{fill:${cluster.fill};stroke:${cluster.stroke};stroke-width:${sw}px}` : '',
    `.pele .pele-edge path{stroke-width:${sw}px}`,
    `.pele .pele-marker{stroke:none}`,
    ...extra,
    theme.style?.nodeRotation ? zedNodeRotation(theme.vars.series, theme.vars.bg) : '',
    opts.labelWeight ? `.pele .pele-label{font-weight:${opts.labelWeight}}` : '',
    theme.css,
  ].filter(Boolean).join('\n');
}

/** Split a Mermaid-shaped config into the few knobs Pele honors. */
export function peleConfig(cfg: Record<string, unknown>): {
  fontSize?: number;
  padding?: number;
  flowchart?: { nodeSpacing?: number; rankSpacing?: number; padding?: number };
  warnings: string[];
} {
  const warnings: string[] = [];
  const out: {
    fontSize?: number;
    padding?: number;
    flowchart?: { nodeSpacing?: number; rankSpacing?: number; padding?: number };
    warnings: string[];
  } = { warnings };
  for (const [k, v] of Object.entries(cfg)) {
    if (k === 'fontSize' && typeof v === 'number') out.fontSize = v;
    else if (k === 'padding' && typeof v === 'number') out.padding = v;
    else if (k === 'flowchart' && v && typeof v === 'object') {
      const f = v as Record<string, unknown>;
      const fc: { nodeSpacing?: number; rankSpacing?: number; padding?: number } = {};
      for (const key of ['nodeSpacing', 'rankSpacing', 'padding'] as const) {
        if (typeof f[key] === 'number') fc[key] = f[key] as number;
        else if (key in f) warnings.push(`config.flowchart.${key} is not a number; ignored`);
      }
      out.flowchart = fc;
    } else {
      warnings.push(`config "${k}" is not supported by the pele engine; ignored`);
    }
  }
  return out;
}
