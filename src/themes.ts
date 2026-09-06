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
      nodeSpacing: 60,
      rankSpacing: 70,
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
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1.25px; }
.node rect { rx: 8px; ry: 8px; }
.cluster rect { rx: 10px; ry: 10px; stroke-width: 1px; }
.edgePath .path { stroke-width: 1.25px; }
.edgeLabel .label { padding: 2px 8px; }
/* breathing room between text and node borders — mermaid measures the div,
   so padding grows the node instead of clipping */
.nodeLabel div, .nodeLabel span, .nodeLabel p { padding: 2px 5px; }
.nodeLabel { font-weight: 500; }
/* never let a 1px measurement miss clip the last glyph */
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
.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke-width: 1.25px; }
.node rect { rx: 8px; ry: 8px; }
/* shape-coding: mermaid variables only offer a single primaryColor for node
   shapes, so the rect=process / diamond=decision / circle=state / store=purple
   colour roles are painted here */
.node rect { fill: #E8F3FF; stroke: #4098FC; }
.node polygon { fill: #FFF7E6; stroke: #FF9A2E; }
.node circle, .node ellipse { fill: #E8FFEA; stroke: #23C343; }
.node path { fill: #F5E8FF; stroke: #722ED1; }
.cluster rect { fill: #F7F8FA; stroke: #C9CDD4; }
.cluster-label { color: #4E5969; }
/* ER entity shells are .node paths (the generic path rule above would paint
   them purple); attribute rows take attributeBackgroundColorOdd/Even from
   themeVariables */
.node .outer-path path { fill: #E8F3FF; stroke: #4098FC; }
.node .outer-path path[fill="none"] { fill: none; }
.node .row-rect-odd path { fill: #FFFFFF; stroke: #4098FC; }
.node .row-rect-odd path[fill="none"] { fill: none; }
.node .row-rect-even path { fill: #F7F8FA; stroke: #4098FC; }
.node .row-rect-even path[fill="none"] { fill: none; }
/* class member dividers would hit the .node path rule */
.divider path { stroke: #4098FC; }
/* mindmap root/child labels are HTML (foreignObject) — colour via CSS */
.mindmap-node .label, .mindmap-node .label div { color: #1D2129 !important; }
/* mindmap labels are HTML (foreignObject) — colour via CSS; the root's
   text-inner-tspan would otherwise take gitBranchLabel0 (white) via the
   section-root rule */
.mindmap-node .label, .mindmap-node .label div, .mindmap-node .label span, .mindmap-node .label p, .mindmap-node .text-inner-tspan { color: #1D2129 !important; fill: #1D2129 !important; }
/* under look:'neo' the generated gradient rule (appended later, same
   specificity) paints EVERY section box mainBkg + gradient stroke, masking
   the cScale section colours; restore the per-branch pastels here */
.mindmap-node.section--1 rect, .mindmap-node.section--1 path, .mindmap-node.section--1 circle { fill: #E8F3FF !important; stroke: #4098FC !important; stroke-width: 2.5px !important; }
.mindmap-node.section-0 rect, .mindmap-node.section-0 path, .mindmap-node.section-0 circle { fill: #E8FFEA !important; stroke: #7FB08A !important; }
.mindmap-node.section-1 rect, .mindmap-node.section-1 path, .mindmap-node.section-1 circle { fill: #FFF7E6 !important; stroke: #D2A36C !important; }
.mindmap-node.section-2 rect, .mindmap-node.section-2 path, .mindmap-node.section-2 circle { fill: #F5E8FF !important; stroke: #9A8CC0 !important; }
.mindmap-node.section-3 rect, .mindmap-node.section-3 path, .mindmap-node.section-3 circle { fill: #E8FFFB !important; stroke: #63A8A4 !important; }
.mindmap-node.section-4 rect, .mindmap-node.section-4 path, .mindmap-node.section-4 circle { fill: #FFF1E8 !important; stroke: #C48BA6 !important; }
.mindmap-node.section-5 rect, .mindmap-node.section-5 path, .mindmap-node.section-5 circle { fill: #F2F3F5 !important; stroke: #8B99A8 !important; }
/* radar curves take cScale pastels, which vanish on the graticule; give
   them the AntV categorical colours (fill translucency via curveOpacity) */
.radarCurve-0 { color: #5B8FF9 !important; fill: #5B8FF9 !important; }
.radarCurve-1 { color: #5AD8A6 !important; fill: #5AD8A6 !important; }
.radarCurve-2 { color: #5D7092 !important; fill: #5D7092 !important; }
.radarCurve-3 { color: #F6BD16 !important; fill: #F6BD16 !important; }
.radarCurve-4 { color: #E8684A !important; fill: #E8684A !important; }
.radarCurve-5 { color: #6DC8EC !important; fill: #6DC8EC !important; }
.radarCurve-6 { color: #9270CA !important; fill: #9270CA !important; }
.radarCurve-7 { color: #FF9D4D !important; fill: #FF9D4D !important; }
.radarCurve-8 { color: #269A99 !important; fill: #269A99 !important; }
.radarCurve-9 { color: #FF99C3 !important; fill: #FF99C3 !important; }
.radarCurve-10 { color: #A0D911 !important; fill: #A0D911 !important; }
.radarCurve-11 { color: #F08BB4 !important; fill: #F08BB4 !important; }
/* timeline node backgrounds draw with no stroke */
.timeline-node .node-bkg { stroke: #C9CDD4 !important; stroke-width: 1px !important; }
/* treemap: categories would all take near-identical cScale pastels; give
   each section a distinct AntV tint with white separation strokes */
.treemapSection.section1, .treemapSection.section1 .treemapLeaf { fill: #A9CFFB !important; stroke: #FFFFFF !important; }
.treemapSection.section2, .treemapSection.section2 .treemapLeaf { fill: #A4E3C8 !important; stroke: #FFFFFF !important; }
.treemapSection.section3, .treemapSection.section3 .treemapLeaf { fill: #C6CEDA !important; stroke: #FFFFFF !important; }
.treemapSection.section4, .treemapSection.section4 .treemapLeaf { fill: #FBE3AE !important; stroke: #FFFFFF !important; }
.treemapSection.section5, .treemapSection.section5 .treemapLeaf { fill: #F6C6BD !important; stroke: #FFFFFF !important; }
.treemapSection.section6, .treemapSection.section6 .treemapLeaf { fill: #C5E7F7 !important; stroke: #FFFFFF !important; }
.treemapSectionHeader { stroke: #C9CDD4 !important; }
/* journey emotion faces default to cornsilk */
.face { fill: #FFF7E6; stroke: #C9CDD4; }
/* journey actor dots: config.journey.actorColours is useless — mermaid's
   assignWithDepth APPENDS arrays, so the hardcoded defaults keep slots 0-5.
   Presentation-attribute fills lose to plain CSS, so pin the dots here. */
.actor-0 { fill: #6E94BB; stroke: #FFFFFF; }
.actor-1 { fill: #7FB08A; stroke: #FFFFFF; }
.actor-2 { fill: #63A8A4; stroke: #FFFFFF; }
.actor-3 { fill: #D2A36C; stroke: #FFFFFF; }
.actor-4 { fill: #8B99A8; stroke: #FFFFFF; }
.actor-5 { fill: #C48BA6; stroke: #FFFFFF; }
`;

const tech: ThemePreset = {
  config: {
    ...baseConfig('#FFFFFF'),
    theme: 'base',
    // neo look: rounded corners, soft gradients + shadows on node shapes —
    // the classic look's sharp flat rectangles read as stock mermaid
    look: 'neo',
    block: { padding: 16 },
    radar: { curveOpacity: 0.35, curveStrokeWidth: 2.5, graticuleColor: '#C9CDD4', graticuleOpacity: 0.6 },
    themeVariables: {
      ...((baseConfig('#FFFFFF').themeVariables as Record<string, unknown>) ?? {}),
      // ---- core derivation chain: every diagram inherits from these.
      // primaryColor in particular must be set — its default (#fff4dd cream)
      // is the "native mermaid" look leaking through every unset corner.
      primaryColor: '#E8F3FF',
      primaryTextColor: '#1D2129',
      primaryBorderColor: '#4098FC',
      secondaryColor: '#F2F3F5',
      secondaryTextColor: '#1D2129',
      secondaryBorderColor: '#C9CDD4',
      tertiaryColor: '#F7F8FA',
      tertiaryTextColor: '#4E5969',
      tertiaryBorderColor: '#C9CDD4',
      background: '#FFFFFF',
      fontFamily: FONT_STACK,
      fontSize: '15px',
      textColor: '#1D2129',
      lineColor: '#4E5969',
      defaultLinkColor: '#4E5969',
      arrowheadColor: '#4E5969',
      // neo look gradient stops (official knobs) — keep blends on-palette
      gradientStart: '#E8F3FF',
      gradientStop: '#FFFFFF',
      // ---- node shapes: flowchart boxes, class boxes, ER entity shells
      mainBkg: '#E8F3FF',
      nodeBkg: '#E8F3FF',
      nodeBorder: '#4098FC',
      nodeTextColor: '#1D2129',
      classText: '#1D2129',
      clusterBkg: '#F7F8FA',
      clusterBorder: '#C9CDD4',
      titleColor: '#1D2129',
      edgeLabelBackground: '#FFFFFF',
      labelBackgroundColor: '#FFFFFF',
      // ---- sequence ----
      actorBkg: '#FFFFFF',
      actorBorder: '#4E5969',
      actorTextColor: '#1D2129',
      actorLineColor: '#C9CDD4',
      signalColor: '#4E5969',
      signalTextColor: '#1D2129',
      labelBoxBkgColor: '#E8F3FF',
      labelBoxBorderColor: '#4098FC',
      labelTextColor: '#1D2129',
      loopTextColor: '#4E5969',
      activationBkgColor: '#E8F3FF',
      activationBorderColor: '#4098FC',
      sequenceNumberColor: '#4E5969',
      // ---- notes ----
      noteBkgColor: '#FFF7E6',
      noteTextColor: '#1D2129',
      noteBorderColor: '#FF9A2E',
      // ---- state (incl. composite frames, which default to cream) ----
      stateBkg: '#E8F3FF',
      stateBorder: '#4098FC',
      stateLabelColor: '#1D2129',
      specialStateColor: '#1D2129',
      compositeBackground: '#F7F8FA',
      compositeBorder: '#C9CDD4',
      compositeTitleBackground: '#F7F8FA',
      transitionColor: '#4E5969',
      transitionLabelColor: '#4E5969',
      labelColor: '#1D2129',
      altBackground: '#FFFFFF',
      // ---- ER ----
      rowOdd: '#FFFFFF',
      rowEven: '#F7F8FA',
      relationColor: '#4E5969',
      relationLabelColor: '#1D2129',
      relationLabelBackground: '#FFFFFF',
      attributeBackgroundColorOdd: '#FFFFFF',
      attributeBackgroundColorEven: '#F7F8FA',
      // ---- requirement ----
      requirementBackground: '#E8F3FF',
      requirementBorderColor: '#4098FC',
      requirementBorderSize: '1.25px',
      requirementTextColor: '#1D2129',
      requirementEdgeLabelBackground: '#FFFFFF',
      // ---- gantt ----
      sectionBkgColor: '#FFFFFF',
      altSectionBkgColor: '#F7F8FA',
      sectionBkgColor2: '#FFFFFF',
      taskBkgColor: '#E8F3FF',
      taskBorderColor: '#4098FC',
      taskTextColor: '#1D2129',
      taskTextDarkColor: '#1D2129',
      taskTextOutsideColor: '#1D2129',
      taskTextClickableColor: '#1D2129',
      activeTaskBkgColor: '#FFF7E6',
      activeTaskBorderColor: '#FF9A2E',
      doneTaskBkgColor: '#F2F3F5',
      doneTaskBorderColor: '#A9AEB8',
      critBkgColor: '#F5E8FF',
      critBorderColor: '#722ED1',
      gridColor: '#E5E6EB',
      todayLineColor: '#FF9A2E',
      vertLineColor: '#C9CDD4',
      excludeBkgColor: '#F7F8FA',
      // ---- timeline / journey / mindmap banding cycle: Arco pastels with
      // dark labels; cScaleInv drives mindmap strokes + timeline event lines
      cScale0: '#E8F3FF', cScale1: '#E8FFEA', cScale2: '#FFF7E6', cScale3: '#F5E8FF',
      cScale4: '#E8FFFB', cScale5: '#FFF1E8', cScale6: '#F2F3F5', cScale7: '#E8F3FF',
      cScale8: '#E8FFEA', cScale9: '#FFF7E6', cScale10: '#F5E8FF', cScale11: '#E8FFFB',
      cScale12: '#1D2129',
      cScaleLabel0: '#1D2129', cScaleLabel1: '#1D2129', cScaleLabel2: '#1D2129',
      cScaleLabel3: '#1D2129', cScaleLabel4: '#1D2129', cScaleLabel5: '#1D2129',
      cScaleLabel6: '#1D2129', cScaleLabel7: '#1D2129', cScaleLabel8: '#1D2129',
      cScaleLabel9: '#1D2129', cScaleLabel10: '#1D2129', cScaleLabel11: '#1D2129',
      cScaleInv0: '#6E94BB', cScaleInv1: '#7FB08A', cScaleInv2: '#D2A36C', cScaleInv3: '#9A8CC0',
      cScaleInv4: '#63A8A4', cScaleInv5: '#C48BA6', cScaleInv6: '#8B99A8', cScaleInv7: '#C9B06A',
      cScaleInv8: '#6E94BB', cScaleInv9: '#7FB08A', cScaleInv10: '#D2A36C', cScaleInv11: '#9A8CC0',
      // ---- user journey: official section fills (themes) — actor dot
      // colours live in the journey CONFIG section below
      fillType0: '#E8F3FF', fillType1: '#E8FFEA', fillType2: '#FFF7E6', fillType3: '#F5E8FF',
      fillType4: '#E8FFFB', fillType5: '#FFF1E8', fillType6: '#F2F3F5', fillType7: '#E8F3FF',
      // ---- gitgraph: desaturated slate/sage/sand branches
      git0: '#6E94BB', git1: '#7FB08A', git2: '#D2A36C', git3: '#9A8CC0',
      git4: '#63A8A4', git5: '#C48BA6', git6: '#8B99A8', git7: '#C9B06A',
      gitBranchLabel0: '#FFFFFF', gitBranchLabel1: '#FFFFFF', gitBranchLabel2: '#FFFFFF',
      gitBranchLabel3: '#FFFFFF', gitBranchLabel4: '#FFFFFF', gitBranchLabel5: '#FFFFFF',
      gitBranchLabel6: '#FFFFFF', gitBranchLabel7: '#FFFFFF',
      gitInv0: '#FFFFFF', gitInv1: '#FFFFFF', gitInv2: '#FFFFFF', gitInv3: '#FFFFFF',
      gitInv4: '#FFFFFF', gitInv5: '#FFFFFF', gitInv6: '#FFFFFF', gitInv7: '#FFFFFF',
      commitLabelColor: '#1D2129',
      commitLabelBackground: '#F2F3F5',
      tagLabelColor: '#1D2129',
      tagLabelBackground: '#E8F3FF',
      tagLabelBorder: '#4098FC',
      // ---- pie: AntV G2 default categorical palette — modern report style,
      // harmonised saturation, pairs with the Arco theme family
      pie1: '#5B8FF9', pie2: '#5AD8A6', pie3: '#5D7092', pie4: '#F6BD16',
      pie5: '#E8684A', pie6: '#6DC8EC', pie7: '#9270CA', pie8: '#FF9D4D',
      pie9: '#269A99', pie10: '#FF99C3', pie11: '#A0D911', pie12: '#F08BB4',
      pieOpacity: '1',
      pieStrokeColor: '#FFFFFF',
      pieStrokeWidth: '1px',
      pieOuterStrokeColor: '#C9CDD4',
      pieOuterStrokeWidth: '1px',
      pieTitleTextColor: '#1D2129',
      pieSectionTextColor: '#1D2129',
      pieLegendTextColor: '#1D2129',
      // ---- quadrant: neutral panes, blue points, hairline borders
      quadrant1Fill: '#F7F8FA', quadrant2Fill: '#F7F8FA',
      quadrant3Fill: '#F7F8FA', quadrant4Fill: '#F7F8FA',
      quadrantPointFill: '#4098FC',
      quadrantPointTextFill: '#1D2129',
      quadrantXAxisTextFill: '#4E5969',
      quadrantYAxisTextFill: '#4E5969',
      quadrantInternalBorderStrokeFill: '#C9CDD4',
      quadrantExternalBorderStrokeFill: '#C9CDD4',
      quadrantTitleFill: '#1D2129',
      // ---- xyChart: axis colours + plot palette (defaults start with
      // mermaid purple #ECECFF)
      xyChart: {
        backgroundColor: '#FFFFFF',
        plotColorBackground: '#FFFFFF',
        xAxisLabelColor: '#1D2129',
        yAxisLabelColor: '#1D2129',
        xAxisTitleColor: '#1D2129',
        yAxisTitleColor: '#1D2129',
        xAxisTickColor: '#C9CDD4',
        yAxisTickColor: '#C9CDD4',
        xAxisLineColor: '#C9CDD4',
        yAxisLineColor: '#C9CDD4',
        plotColorPalette: '#5B8FF9,#F6BD16,#5AD8A6,#9270CA,#E8684A,#6DC8EC',
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
