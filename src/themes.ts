// Theme presets. Each preset is a Mermaid config object plus a default page
// background. Shape-specific colors are painted via themeCSS so flowcharts get
// meaningful color coding (rect=process, diamond=decision, circle=state,
// cylinder=store) instead of the single-hue Mermaid default.

export interface ThemePreset {
  config: Record<string, unknown>;
  background: string;
  /** true when the preset bakes in a dark page background */
  dark?: boolean;
  /** post-render hex→hex remap for colours mermaid hardcodes (journey) */
  remap?: Record<string, string>;
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
      curve: 'linear',
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
.edgePath .path { stroke-width: 1px; }
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
// tech — default. Big-tech design-doc style: white canvas, ink text, hairline
// gray containers, one hue per diagram role (blue process / amber decision /
// green state / purple store). Palette follows ByteDance Arco.
// ---------------------------------------------------------------------------

const TECH_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1px; }
.node rect { rx: 6px; ry: 6px; }
/* shape-coding kept, fills almost paper — hue lives on the hairline */
.node rect { fill: #F4F7FA; stroke: #5A8BB5; }
.node polygon { fill: #FBF7F1; stroke: #C4924A; }
.node circle, .node ellipse { fill: #F3F8F4; stroke: #5A9A68; }
.node path { fill: #F6F4F9; stroke: #7A6B9E; }
.cluster rect { fill: #F5F6F8; stroke: #D8DCE3; }
.cluster-label { color: #6B7280; }
.node .outer-path path { fill: #F4F7FA; stroke: #5A8BB5; }
.node .outer-path path[fill="none"] { fill: none; }
.node .row-rect-odd path { fill: #FFFFFF; stroke: #5A8BB5; }
.node .row-rect-odd path[fill="none"] { fill: none; }
.node .row-rect-even path { fill: #F5F6F8; stroke: #5A8BB5; }
.node .row-rect-even path[fill="none"] { fill: none; }
.divider path { stroke: #5A8BB5; }
.mindmap-node .label, .mindmap-node .label div { color: #1B1F26 !important; }
.mindmap-node .label, .mindmap-node .label div, .mindmap-node .label span, .mindmap-node .label p, .mindmap-node .text-inner-tspan { color: #1B1F26 !important; fill: #1B1F26 !important; }
.mindmap-node.section--1 rect, .mindmap-node.section--1 path, .mindmap-node.section--1 circle { fill: #F4F7FA !important; stroke: #5A8BB5 !important; stroke-width: 1.5px !important; }
.mindmap-node.section-0 rect, .mindmap-node.section-0 path, .mindmap-node.section-0 circle { fill: #F3F8F4 !important; stroke: #7F9E88 !important; }
.mindmap-node.section-1 rect, .mindmap-node.section-1 path, .mindmap-node.section-1 circle { fill: #FBF7F1 !important; stroke: #C4A06C !important; }
.mindmap-node.section-2 rect, .mindmap-node.section-2 path, .mindmap-node.section-2 circle { fill: #F6F4F9 !important; stroke: #8A7EAA !important; }
.mindmap-node.section-3 rect, .mindmap-node.section-3 path, .mindmap-node.section-3 circle { fill: #F3F8F7 !important; stroke: #6A9A96 !important; }
.mindmap-node.section-4 rect, .mindmap-node.section-4 path, .mindmap-node.section-4 circle { fill: #FBF6F3 !important; stroke: #B08A9A !important; }
.mindmap-node.section-5 rect, .mindmap-node.section-5 path, .mindmap-node.section-5 circle { fill: #F5F6F8 !important; stroke: #8B9199 !important; }
.radarCurve-0 { color: #5C8EC4 !important; fill: #5C8EC4 !important; }
.radarCurve-1 { color: #6BAF8E !important; fill: #6BAF8E !important; }
.radarCurve-2 { color: #6D7686 !important; fill: #6D7686 !important; }
.radarCurve-3 { color: #C9A84C !important; fill: #C9A84C !important; }
.radarCurve-4 { color: #C46B5A !important; fill: #C46B5A !important; }
.radarCurve-5 { color: #6BA8C4 !important; fill: #6BA8C4 !important; }
.radarCurve-6 { color: #8A7EAA !important; fill: #8A7EAA !important; }
.radarCurve-7 { color: #C4924A !important; fill: #C4924A !important; }
.radarCurve-8 { color: #5A9A68 !important; fill: #5A9A68 !important; }
.radarCurve-9 { color: #B08A9A !important; fill: #B08A9A !important; }
.radarCurve-10 { color: #8B9199 !important; fill: #8B9199 !important; }
.radarCurve-11 { color: #7A6B9E !important; fill: #7A6B9E !important; }
.timeline-node .node-bkg { stroke: #D8DCE3 !important; stroke-width: 1px !important; }
.treemapSection.section1, .treemapSection.section1 .treemapLeaf { fill: #C5D6E8 !important; stroke: #FFFFFF !important; }
.treemapSection.section2, .treemapSection.section2 .treemapLeaf { fill: #C5DDD0 !important; stroke: #FFFFFF !important; }
.treemapSection.section3, .treemapSection.section3 .treemapLeaf { fill: #D0D4DB !important; stroke: #FFFFFF !important; }
.treemapSection.section4, .treemapSection.section4 .treemapLeaf { fill: #E6D9B8 !important; stroke: #FFFFFF !important; }
.treemapSection.section5, .treemapSection.section5 .treemapLeaf { fill: #E4C9C3 !important; stroke: #FFFFFF !important; }
.treemapSection.section6, .treemapSection.section6 .treemapLeaf { fill: #C5DCE6 !important; stroke: #FFFFFF !important; }
.treemapSectionHeader { stroke: #D8DCE3 !important; }
.face { fill: #FBF7F1; stroke: #D8DCE3; }
.pieCircle, .legend, g.legend { overflow: visible; }
.slice { overflow: visible; }
.xAxis .tick text, .yAxis .tick text { font-size: 12px; fill: #6B7280; }
.actor-0 { fill: #6E8AAA; stroke: #FFFFFF; }
.actor-1 { fill: #7F9E88; stroke: #FFFFFF; }
.actor-2 { fill: #6A9A96; stroke: #FFFFFF; }
.actor-3 { fill: #C4A06C; stroke: #FFFFFF; }
.actor-4 { fill: #8B9199; stroke: #FFFFFF; }
.actor-5 { fill: #B08A9A; stroke: #FFFFFF; }
`;

const tech: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    theme: 'base',
    // classic + hairline CSS: neo's gradient/shadow reads as stock mermaid
    block: { padding: 16 },
    radar: { curveOpacity: 0.28, curveStrokeWidth: 2, graticuleColor: '#D8DCE3', graticuleOpacity: 0.7 },
    themeVariables: {
      ...((baseConfig('#FFFFFF').themeVariables as Record<string, unknown>) ?? {}),
      // ---- core derivation chain: every diagram inherits from these.
      // primaryColor in particular must be set — its default (#fff4dd cream)
      // is the "native mermaid" look leaking through every unset corner.
      primaryColor: '#F4F7FA',
      primaryTextColor: '#1B1F26',
      primaryBorderColor: '#5A8BB5',
      secondaryColor: '#F5F6F8',
      secondaryTextColor: '#1B1F26',
      secondaryBorderColor: '#D8DCE3',
      tertiaryColor: '#F5F6F8',
      tertiaryTextColor: '#6B7280',
      tertiaryBorderColor: '#D8DCE3',
      background: '#FFFFFF',
      fontFamily: FONT_STACK,
      fontSize: '15px',
      textColor: '#1B1F26',
      lineColor: '#8A9199',
      defaultLinkColor: '#8A9199',
      arrowheadColor: '#8A9199',
      gradientStart: '#F4F7FA',
      gradientStop: '#FFFFFF',
      mainBkg: '#F4F7FA',
      nodeBkg: '#F4F7FA',
      nodeBorder: '#5A8BB5',
      nodeTextColor: '#1B1F26',
      classText: '#1B1F26',
      clusterBkg: '#F5F6F8',
      clusterBorder: '#D8DCE3',
      titleColor: '#1B1F26',
      edgeLabelBackground: '#FFFFFF',
      labelBackgroundColor: '#FFFFFF',
      actorBkg: '#FFFFFF',
      actorBorder: '#8A9199',
      actorTextColor: '#1B1F26',
      actorLineColor: '#D8DCE3',
      signalColor: '#8A9199',
      signalTextColor: '#1B1F26',
      labelBoxBkgColor: '#F4F7FA',
      labelBoxBorderColor: '#5A8BB5',
      labelTextColor: '#1B1F26',
      loopTextColor: '#6B7280',
      activationBkgColor: '#F4F7FA',
      activationBorderColor: '#5A8BB5',
      sequenceNumberColor: '#6B7280',
      noteBkgColor: '#FBF7F1',
      noteTextColor: '#1B1F26',
      noteBorderColor: '#C4924A',
      stateBkg: '#F4F7FA',
      stateBorder: '#5A8BB5',
      stateLabelColor: '#1B1F26',
      specialStateColor: '#1B1F26',
      compositeBackground: '#F5F6F8',
      compositeBorder: '#D8DCE3',
      compositeTitleBackground: '#F5F6F8',
      transitionColor: '#8A9199',
      transitionLabelColor: '#6B7280',
      labelColor: '#1B1F26',
      altBackground: '#FFFFFF',
      // ---- ER ----
      rowOdd: '#FFFFFF',
      rowEven: '#F5F6F8',
      relationColor: '#8A9199',
      relationLabelColor: '#1B1F26',
      relationLabelBackground: '#FFFFFF',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#F5F6F8',
      requirementBackground: '#F4F7FA',
      requirementBorderColor: '#5A8BB5',
      requirementBorderSize: '1px',
      requirementTextColor: '#1B1F26',
      requirementEdgeLabelBackground: '#FFFFFF',
      sectionBkgColor: '#FFFFFF',
      altSectionBkgColor: '#F5F6F8',
      sectionBkgColor2: '#FFFFFF',
      taskBkgColor: '#F4F7FA',
      taskBorderColor: '#5A8BB5',
      taskTextColor: '#1B1F26',
      taskTextDarkColor: '#1B1F26',
      taskTextOutsideColor: '#1B1F26',
      taskTextClickableColor: '#1B1F26',
      activeTaskBkgColor: '#FBF7F1',
      activeTaskBorderColor: '#C4924A',
      doneTaskBkgColor: '#F5F6F8',
      doneTaskBorderColor: '#C5C8D0',
      critBkgColor: '#F6F4F9',
      critBorderColor: '#7A6B9E',
      gridColor: '#E6E7EC',
      todayLineColor: '#C4924A',
      vertLineColor: '#D8DCE3',
      excludeBkgColor: '#F5F6F8',
      cScale0: '#F4F7FA', cScale1: '#F3F8F4', cScale2: '#FBF7F1', cScale3: '#F6F4F9',
      cScale4: '#F3F8F7', cScale5: '#FBF6F3', cScale6: '#F5F6F8', cScale7: '#F4F7FA',
      cScale8: '#F3F8F4', cScale9: '#FBF7F1', cScale10: '#F6F4F9', cScale11: '#F3F8F7',
      cScale12: '#1B1F26',
      cScaleLabel0: '#1B1F26', cScaleLabel1: '#1B1F26', cScaleLabel2: '#1B1F26',
      cScaleLabel3: '#1B1F26', cScaleLabel4: '#1B1F26', cScaleLabel5: '#1B1F26',
      cScaleLabel6: '#1B1F26', cScaleLabel7: '#1B1F26', cScaleLabel8: '#1B1F26',
      cScaleLabel9: '#1B1F26', cScaleLabel10: '#1B1F26', cScaleLabel11: '#1B1F26',
      cScaleInv0: '#6E94BB', cScaleInv1: '#7FB08A', cScaleInv2: '#D2A36C', cScaleInv3: '#9A8CC0',
      cScaleInv4: '#63A8A4', cScaleInv5: '#C48BA6', cScaleInv6: '#8B99A8', cScaleInv7: '#C9B06A',
      cScaleInv8: '#6E94BB', cScaleInv9: '#7FB08A', cScaleInv10: '#D2A36C', cScaleInv11: '#9A8CC0',
      // ---- user journey: official section fills (themes) — actor dot
      // colours live in the journey CONFIG section below
      fillType0: '#F4F7FA', fillType1: '#F3F8F4', fillType2: '#FBF7F1', fillType3: '#F6F4F9',
      fillType4: '#F3F8F7', fillType5: '#FBF6F3', fillType6: '#F5F6F8', fillType7: '#F4F7FA',
      // ---- gitgraph: desaturated slate/sage/sand branches
      git0: '#6E94BB', git1: '#7FB08A', git2: '#D2A36C', git3: '#9A8CC0',
      git4: '#63A8A4', git5: '#C48BA6', git6: '#8B99A8', git7: '#C9B06A',
      gitBranchLabel0: '#FFFFFF', gitBranchLabel1: '#FFFFFF', gitBranchLabel2: '#FFFFFF',
      gitBranchLabel3: '#FFFFFF', gitBranchLabel4: '#FFFFFF', gitBranchLabel5: '#FFFFFF',
      gitBranchLabel6: '#FFFFFF', gitBranchLabel7: '#FFFFFF',
      gitInv0: '#FFFFFF', gitInv1: '#FFFFFF', gitInv2: '#FFFFFF', gitInv3: '#FFFFFF',
      gitInv4: '#FFFFFF', gitInv5: '#FFFFFF', gitInv6: '#FFFFFF', gitInv7: '#FFFFFF',
      commitLabelColor: '#1B1F26',
      commitLabelBackground: '#F5F6F8',
      tagLabelColor: '#1B1F26',
      tagLabelBackground: '#F4F7FA',
      tagLabelBorder: '#5A8BB5',
      // ---- pie: AntV G2 default categorical palette — modern report style,
      // harmonised saturation, pairs with the Arco theme family
      pie1: '#5C8EC4', pie2: '#6BAF8E', pie3: '#6D7686', pie4: '#C9A84C',
      pie5: '#C46B5A', pie6: '#6BA8C4', pie7: '#8A7EAA', pie8: '#C4924A',
      pie9: '#5A9A68', pie10: '#B08A9A', pie11: '#8B9199', pie12: '#7A6B9E',
      pieOpacity: '1',
      pieStrokeColor: '#FFFFFF',
      pieStrokeWidth: '1px',
      pieOuterStrokeColor: '#D8DCE3',
      pieOuterStrokeWidth: '1px',
      pieTitleTextColor: '#1B1F26',
      pieSectionTextColor: '#1B1F26',
      pieLegendTextColor: '#1B1F26',
      quadrant1Fill: '#F5F6F8', quadrant2Fill: '#F5F6F8',
      quadrant3Fill: '#F5F6F8', quadrant4Fill: '#F5F6F8',
      quadrantPointFill: '#5A8BB5',
      quadrantPointTextFill: '#1B1F26',
      quadrantXAxisTextFill: '#6B7280',
      quadrantYAxisTextFill: '#6B7280',
      quadrantInternalBorderStrokeFill: '#D8DCE3',
      quadrantExternalBorderStrokeFill: '#D8DCE3',
      quadrantTitleFill: '#1B1F26',
      xyChart: {
        backgroundColor: '#FFFFFF',
        plotColorBackground: '#FFFFFF',
        xAxisLabelColor: '#1B1F26',
        yAxisLabelColor: '#1B1F26',
        xAxisTitleColor: '#1B1F26',
        yAxisTitleColor: '#1B1F26',
        xAxisTickColor: '#D8DCE3',
        yAxisTickColor: '#D8DCE3',
        xAxisLineColor: '#D8DCE3',
        yAxisLineColor: '#D8DCE3',
        plotColorPalette: '#5C8EC4,#C9A84C,#6BAF8E,#8A7EAA,#C46B5A,#6BA8C4',
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
    // sankey nodes/links default to the tableau10 set (no theme variables)
    '#4e79a7': '#6E94BB', '#f28e2c': '#D2A36C', '#e15759': '#C48BA6',
    '#76b7b2': '#63A8A4', '#59a14f': '#7FB08A', '#edc949': '#C9B06A',
    '#af7aa1': '#9A8CC0', '#ff9da7': '#D2A36C', '#9c755f': '#8B99A8',
    '#bab0ac': '#C9CDD4',
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

const openaiDark: ThemePreset = {
  config: clone(openai.config),
  background: '#1A1A1A',
  dark: true,
};
{
  const v = openaiDark.config.themeVariables as Record<string, unknown>;
  Object.assign(v, {
    primaryColor: '#1A1A1A',
    primaryTextColor: '#ECECF1',
    primaryBorderColor: '#8E8EA0',
    secondaryColor: '#12332B',
    secondaryTextColor: '#ECECF1',
    tertiaryColor: '#26262B',
    tertiaryTextColor: '#ECECF1',
    lineColor: '#6B6B78',
    textColor: '#ECECF1',
    titleColor: '#ECECF1',
    clusterBkg: '#202123',
    clusterBorder: '#3E3E44',
    actorBkg: '#1A1A1A',
    actorBorder: '#8E8EA0',
    actorTextColor: '#ECECF1',
    actorLineColor: '#3E3E44',
    signalColor: '#B4B4BD',
    signalTextColor: '#ECECF1',
    noteBkgColor: '#26262B',
    noteTextColor: '#ECECF1',
    noteBorderColor: '#3E3E44',
    edgeLabelBackground: '#1A1A1A',
    attributeBackgroundColorOdd: '#1A1A1A',
    attributeBackgroundColorEven: '#26262B',
    sectionBkgColor: '#202123',
    altSectionBkgColor: '#1A1A1A',
  });
  openaiDark.config.themeCSS =
    (openaiDark.config.themeCSS as string) +
    `
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: #1A1A1A; stroke: #8E8EA0; }
.node polygon { fill: #26262B; }
.cluster rect { fill: #202123; stroke: #3E3E44; }
`;
}

// ---------------------------------------------------------------------------
// minimal — Kepano's Minimal theme for Obsidian: warm paper neutrals, quiet
// gray borders, a single violet accent. For prose-first notes.
// ---------------------------------------------------------------------------

const MINIMAL_CSS = `
.node rect, .node circle, .node ellipse, .node polygon, .node path { fill: #F6F5F2; stroke: #B7B5B0; }
.node rect { fill: #FFFFFF; }
.cluster rect { fill: #FAF9F7; stroke: #DDDCD8; }
.cluster-label { color: #6B6961; }
`;

const minimal: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    theme: 'base',
    themeVariables: {
      fontFamily: FONT_STACK,
      fontSize: '15px',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#222222',
      primaryBorderColor: '#B7B5B0',
      lineColor: '#8A8880',
      textColor: '#222222',
      titleColor: '#222222',
      clusterBkg: '#FAF9F7',
      clusterBorder: '#DDDCD8',
      actorBkg: '#FFFFFF',
      actorBorder: '#555350',
      actorTextColor: '#222222',
      actorLineColor: '#DDDCD8',
      signalColor: '#555350',
      signalTextColor: '#222222',
      noteBkgColor: '#F6F5F2',
      noteTextColor: '#222222',
      noteBorderColor: '#DDDCD8',
      activationBkgColor: '#F1EEFB',
      activationBorderColor: '#7C5CFF',
      labelColor: '#222222',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#F6F5F2',
      gridColor: '#EAE8E3',
      sectionBkgColor: '#FAF9F7',
      altSectionBkgColor: '#FFFFFF',
      sectionBkgColor2: '#F1EEFB',
    },
    themeCSS: (baseConfig('#FFFFFF').themeCSS as string) + MINIMAL_CSS,
  },
  background: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// latte / mocha — Catppuccin palettes (soft accent colors)
// ---------------------------------------------------------------------------

const catppuccin = (
  bg: string,
  text: string,
  subtle: string,
  edge: string,
  containerFill: string,
  containerBorder: string,
  blue: string,
  peach: string,
  green: string,
  mauve: string,
  yellow: string,
  dark: boolean,
): ThemePreset => {
  const css = `
.node rect { fill: ${containerFill}; stroke: ${blue}; }
.node polygon { fill: ${containerFill}; stroke: ${peach}; }
.node circle, .node ellipse { fill: ${containerFill}; stroke: ${green}; }
.node path { fill: ${containerFill}; stroke: ${mauve}; }
.cluster rect { fill: ${containerFill}; stroke: ${containerBorder}; opacity: 0.55; }
`;
  return {
    config: {
      ...baseConfig(bg),
      theme: 'base',
      themeVariables: {
        fontFamily: FONT_STACK,
        fontSize: '15px',
        primaryColor: containerFill,
        primaryTextColor: text,
        primaryBorderColor: blue,
        secondaryColor: containerFill,
        secondaryTextColor: text,
        secondaryBorderColor: mauve,
        tertiaryColor: containerFill,
        tertiaryTextColor: text,
        tertiaryBorderColor: containerBorder,
        lineColor: edge,
        textColor: text,
        titleColor: text,
        clusterBkg: containerFill,
        clusterBorder: containerBorder,
        actorBkg: containerFill,
        actorBorder: subtle,
        actorTextColor: text,
        actorLineColor: containerBorder,
        signalColor: edge,
        signalTextColor: text,
        noteBkgColor: containerFill,
        noteTextColor: text,
        noteBorderColor: yellow,
        activationBkgColor: containerFill,
        activationBorderColor: blue,
        labelColor: text,
        attributeBackgroundColorOdd: containerFill,
        attributeBackgroundColorEven: bg,
        gridColor: containerBorder,
        sectionBkgColor: containerFill,
        altSectionBkgColor: bg,
        sectionBkgColor2: containerFill,
      },
      themeCSS: (baseConfig(bg).themeCSS as string) + css,
    },
    background: bg,
    dark,
  };
};

const latte = catppuccin(
  '#EFF1F5', '#4C4F69', '#8C8FA1', '#7C7F93',
  '#DCE7FD', '#BCC6DA', '#1E66F5', '#FE640B', '#40A02B', '#8839EF', '#DF8E1D', false,
);

const mocha = catppuccin(
  '#1E1E2E', '#CDD6F4', '#9399B2', '#7F849C',
  '#313244', '#585B70', '#89B4FA', '#FAB387', '#A6E3A1', '#CBA6F7', '#F9E2AF', true,
);

// ---------------------------------------------------------------------------
// sketch — hand-drawn whiteboard look (Mermaid `look: handDrawn`)
// ---------------------------------------------------------------------------

const sketch: ThemePreset = {
  config: {
    ...baseConfig('#FBF7F0'),
    look: 'handDrawn',
    theme: 'base',
    themeVariables: {
      fontFamily: `"Segoe Print", "Comic Sans MS", "Noto Sans SC", cursive, sans-serif`,
      fontSize: '15px',
      primaryColor: '#FDF6E3',
      primaryTextColor: '#4A4039',
      primaryBorderColor: '#8A7968',
      secondaryColor: '#F4E9DC',
      secondaryTextColor: '#4A4039',
      secondaryBorderColor: '#B08968',
      tertiaryColor: '#FAF0E6',
      tertiaryTextColor: '#4A4039',
      tertiaryBorderColor: '#D6C3B3',
      lineColor: '#8A7968',
      textColor: '#4A4039',
      titleColor: '#4A4039',
      clusterBkg: '#F7F0E3',
      clusterBorder: '#D6C3B3',
      edgeLabelBackground: '#FBF7F0',
      actorBkg: '#FDF6E3',
      actorBorder: '#8A7968',
      actorTextColor: '#4A4039',
      actorLineColor: '#D6C3B3',
      signalColor: '#8A7968',
      signalTextColor: '#4A4039',
      noteBkgColor: '#FFF9E8',
      noteTextColor: '#4A4039',
      noteBorderColor: '#D6C3B3',
      labelColor: '#4A4039',
    },
    themeCSS: (baseConfig('#FBF7F0').themeCSS as string) + `
.node rect { fill: #FDF6E3; stroke: #8A7968; }
.node polygon { fill: #F4E9DC; stroke: #B08968; }
.node circle, .node ellipse { fill: #FAF0E6; stroke: #8A7968; }
.node path { fill: #F7F0E3; stroke: #8A7968; }
.cluster rect { fill: #F7F0E3; stroke: #D6C3B3; }
`,
  },
  background: '#FBF7F0',
};

export const PRESETS: Record<string, ThemePreset> = {
  tech,
  openai,
  'openai-dark': openaiDark,
  minimal,
  latte,
  mocha,
  sketch,
};

export const DEFAULT_THEME = 'tech';

export const SIZE_PRESETS = {
  slide: { width: 1600, scale: 2 },
  a4: { width: 900, scale: 2 },
  square: { width: 1080, scale: 2 },
} as const;

export type SizePreset = keyof typeof SIZE_PRESETS;

/** Slide deck density: larger node type and spacing. Mutates the cloned config. */
export function applySlideDensity(config: Record<string, unknown>): void {
  config.fontSize = 16;
  const tv = (config.themeVariables ?? {}) as Record<string, unknown>;
  tv.fontSize = '16px';
  config.themeVariables = tv;
  const fc = (config.flowchart ?? {}) as Record<string, unknown>;
  fc.nodeSpacing = 80;
  fc.rankSpacing = 80;
  fc.padding = 20;
  fc.wrappingWidth = 280;
  config.flowchart = fc;
  const seq = (config.sequence ?? {}) as Record<string, unknown>;
  seq.actorMargin = 72;
  seq.messageMargin = 52;
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
