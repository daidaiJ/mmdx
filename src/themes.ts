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
