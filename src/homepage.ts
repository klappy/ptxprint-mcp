// Auto-generated homepage for the PTXprint MCP Worker.
// Source bytes mirror the HTML this string produces at runtime.
// Edit this file (or regenerate from the artifact) and re-deploy.
//
// Backslashes, backticks, and ${} sequences inside the HTML are escaped
// for the outer template literal; the runtime string is byte-identical
// to the source HTML.

export const HOMEPAGE_HTML: string = `<!doctype html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>PTXprint MCP — Typeset scripture from a prompt</title>
  <meta name="description" content="An MCP server that turns 50 years of Paratext + XeTeX engineering into four async tools an AI agent can call. Live demo + live telemetry." />
  <meta property="og:title" content="PTXprint MCP — Typeset scripture from a prompt" />
  <meta property="og:description" content="A Cloudflare-native MCP server that drives PTXprint headlessly for Bible translation teams." />
  <meta property="og:type" content="website" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..900,0..100,0..1&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
            sans: ['"Manrope"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
          },
          colors: {
            ink:    { DEFAULT: '#0E0C08', 2: '#15110B', 3: '#1F1810', 4: '#2A2117' },
            paper:  { DEFAULT: '#F4ECDC', 2: '#E8DDC4', 3: '#BFB294', mute: '#8A7E66' },
            rule:   '#3A2F1F',
            rubric: '#C8331A',
            gilt:   '#D9A93E',
            sap:    '#6FAA72',
          },
        },
      },
    };
  </script>

  <style>
    :root {
      --baseline: 8px;
    }
    html, body { background: #0E0C08; color: #F4ECDC; }
    body {
      font-family: 'Manrope', system-ui, sans-serif;
      font-feature-settings: 'ss01', 'cv11', 'tnum';
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    /* Subtle paper grain over background */
    .grain::before {
      content: '';
      position: fixed; inset: 0;
      pointer-events: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
      opacity: 0.55;
      mix-blend-mode: overlay;
      z-index: 1;
    }
    .grain > * { position: relative; z-index: 2; }

    /* Page-edge baseline rules */
    .edge-rule { box-shadow: inset 0 0 0 1px #2A2117; }

    /* Display type — Fraunces with optical sizes, low contrast at large sizes */
    .display-xl {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 144, 'SOFT' 30, 'WONK' 0;
      font-weight: 400;
      letter-spacing: -0.035em;
      line-height: 0.9;
    }
    .display-lg {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 120, 'SOFT' 50;
      font-weight: 400;
      letter-spacing: -0.025em;
      line-height: 0.95;
    }
    .display-md {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 72, 'SOFT' 50;
      font-weight: 500;
      letter-spacing: -0.015em;
      line-height: 1.0;
    }
    .display-sm {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 36, 'SOFT' 30;
      font-weight: 500;
      letter-spacing: -0.005em;
    }
    .italic-wonk {
      font-style: italic;
      font-variation-settings: 'opsz' 144, 'SOFT' 100, 'WONK' 1;
    }

    /* Eyebrow / small caps */
    .eyebrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #BFB294;
    }
    .smallcaps {
      font-variant-caps: all-small-caps;
      letter-spacing: 0.08em;
    }

    /* Marginalia — labels in the margin like an old book */
    .marginalia {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #8A7E66;
    }

    /* Drop cap — rubric red, Bible style */
    .dropcap::first-letter {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 144, 'SOFT' 30;
      font-weight: 600;
      color: #C8331A;
      float: left;
      font-size: 4.2em;
      line-height: 0.85;
      padding-right: 10px;
      padding-top: 4px;
    }

    /* Pulsing live dot */
    @keyframes pulse-dot {
      0%, 100% { box-shadow: 0 0 0 0 rgba(217, 169, 62, 0.7); }
      50%      { box-shadow: 0 0 0 8px rgba(217, 169, 62, 0); }
    }
    .live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #D9A93E;
      animation: pulse-dot 2s infinite;
      display: inline-block;
    }
    .live-dot.ok { background: #6FAA72; box-shadow: 0 0 0 0 rgba(111,170,114,0.7); animation-name: pulse-ok; }
    @keyframes pulse-ok {
      0%, 100% { box-shadow: 0 0 0 0 rgba(111,170,114,0.7); }
      50%      { box-shadow: 0 0 0 8px rgba(111,170,114,0); }
    }
    .live-dot.bad { background: #C8331A; animation: none; }

    /* Hairline rules */
    .hr-thin { border-top: 1px solid #3A2F1F; }
    .hr-rubric { border-top: 1px solid #C8331A; opacity: 0.55; }

    /* Specimen card */
    .specimen {
      background: linear-gradient(180deg, #15110B 0%, #1F1810 100%);
      border: 1px solid #3A2F1F;
      border-radius: 6px;
    }
    .specimen-glow {
      box-shadow:
        inset 0 1px 0 rgba(244,236,220,0.04),
        0 1px 0 rgba(0,0,0,0.4),
        0 30px 80px -40px rgba(217,169,62,0.18);
    }

    /* Code blocks */
    .code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      line-height: 1.55;
      color: #E8DDC4;
    }
    .tok-key { color: #D9A93E; }
    .tok-str { color: #C8B47A; }
    .tok-num { color: #C8331A; }
    .tok-com { color: #6F6450; font-style: italic; }
    .tok-mut { color: #8A7E66; }

    /* Animated bar (telemetry) */
    .bar { transition: width 1.2s cubic-bezier(.2,.7,.1,1); }

    /* Fancy ampersand styling */
    .amper {
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-variation-settings: 'opsz' 144, 'SOFT' 100, 'WONK' 1;
      font-weight: 300;
      color: #D9A93E;
    }

    /* Reveal-on-scroll */
    .reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.9s ease, transform 0.9s ease; }
    .reveal.in { opacity: 1; transform: none; }

    /* Faint grid */
    .grid-bg {
      background-image:
        linear-gradient(rgba(244,236,220,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(244,236,220,0.025) 1px, transparent 1px);
      background-size: 32px 32px;
    }

    /* Hover underline (editorial) */
    .ed-link {
      background-image: linear-gradient(currentColor, currentColor);
      background-size: 0 1px;
      background-position: 0 100%;
      background-repeat: no-repeat;
      transition: background-size 0.4s;
    }
    .ed-link:hover { background-size: 100% 1px; }

    /* Subtle vertical mark */
    .vrule { background: linear-gradient(180deg, transparent, #3A2F1F 12%, #3A2F1F 88%, transparent); }

    /* Folio header */
    .folio {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #6F6450;
    }

    /* Buttons */
    .btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 12px 18px;
      border-radius: 4px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .btn-primary {
      background: #D9A93E;
      color: #0E0C08;
      border: 1px solid #D9A93E;
    }
    .btn-primary:hover { background: #E8BC52; transform: translateY(-1px); }
    .btn-ghost {
      background: transparent;
      color: #F4ECDC;
      border: 1px solid #3A2F1F;
    }
    .btn-ghost:hover { border-color: #D9A93E; color: #D9A93E; }
    .btn-rubric {
      background: transparent;
      color: #C8331A;
      border: 1px solid #C8331A;
    }
    .btn-rubric:hover { background: #C8331A; color: #F4ECDC; }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    /* Demo terminal */
    .term {
      background: #0A0805;
      border: 1px solid #3A2F1F;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .term-bar {
      background: #15110B;
      border-bottom: 1px solid #3A2F1F;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .term-dot { width: 10px; height: 10px; border-radius: 50%; background: #3A2F1F; }

    /* State pill */
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 9px;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid currentColor;
    }
    .pill-queued    { color: #8A7E66; }
    .pill-running   { color: #D9A93E; }
    .pill-succeeded { color: #6FAA72; }
    .pill-failed    { color: #C8331A; }
    .pill-cancelled { color: #8A7E66; }

    /* Big counter typeface */
    .counter {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 144, 'SOFT' 30;
      font-weight: 400;
      letter-spacing: -0.03em;
      line-height: 1;
      font-feature-settings: 'tnum';
    }

    /* Sparkline polyline animation */
    @keyframes draw {
      from { stroke-dashoffset: 1000; }
      to   { stroke-dashoffset: 0; }
    }
    .spark-line { stroke-dasharray: 1000; animation: draw 1.8s ease forwards; }

    /* Vodka diagram */
    .vodka-block {
      border: 1px solid #3A2F1F;
      border-radius: 4px;
      padding: 16px;
    }

    /* Subtle glow under tool numerals */
    .tool-num {
      font-family: 'Fraunces', serif;
      font-variation-settings: 'opsz' 144, 'SOFT' 100, 'WONK' 1;
      font-style: italic;
      font-weight: 300;
      color: #D9A93E;
      opacity: 0.4;
      font-size: 80px;
      line-height: 1;
    }

    /* Selection */
    ::selection { background: #C8331A; color: #F4ECDC; }
  </style>
</head>

<body class="grain">

<!-- ============================================================ -->
<!-- TOP STATUS STRIP                                              -->
<!-- ============================================================ -->
<div class="border-b border-rule bg-ink-2/60 backdrop-blur-sm sticky top-0 z-40">
  <div class="max-w-[1280px] mx-auto px-6 py-2 flex items-center gap-6 text-[11px]" style="font-family:'JetBrains Mono',monospace; letter-spacing:0.06em;">
    <div class="flex items-center gap-2">
      <span id="status-dot" class="live-dot"></span>
      <span id="status-text" class="text-paper-2">connecting…</span>
    </div>
    <span class="text-rule">|</span>
    <span class="text-paper-mute hidden sm:inline">version <span id="status-version" class="text-paper-2">—</span></span>
    <span class="text-rule hidden sm:inline">|</span>
    <span class="text-paper-mute hidden md:inline">spec <span id="status-spec" class="text-paper-2">—</span></span>
    <span class="text-rule hidden md:inline">|</span>
    <span class="text-paper-mute hidden md:inline"><span id="status-tools" class="text-paper-2">—</span> tools online</span>
    <div class="ml-auto flex items-center gap-5">
      <a href="https://github.com/klappy/ptxprint-mcp" target="_blank" rel="noopener" class="text-paper-2 ed-link hover:text-gilt">github</a>
      <a href="#demo" class="text-paper-2 ed-link hover:text-gilt">demo</a>
      <a href="#telemetry" class="text-paper-2 ed-link hover:text-gilt">telemetry</a>
    </div>
  </div>
</div>

<!-- ============================================================ -->
<!-- HERO                                                          -->
<!-- ============================================================ -->
<header class="relative overflow-hidden">
  <div class="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>

  <!-- Folio rule -->
  <div class="max-w-[1280px] mx-auto px-6 pt-8">
    <div class="flex items-baseline gap-6 folio">
      <span>klappy / ptxprint-mcp</span>
      <span class="hidden sm:inline">·</span>
      <span class="hidden sm:inline">FOLIO I</span>
      <span class="ml-auto hidden md:inline">MMXXVI</span>
    </div>
    <div class="hr-thin mt-4"></div>
  </div>

  <div class="max-w-[1280px] mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 relative">
    <div class="grid grid-cols-12 gap-8">
      <!-- Marginalia label -->
      <aside class="hidden lg:flex col-span-1 justify-end">
        <div class="marginalia rotate-180" style="writing-mode: vertical-rl;">
          MCP &nbsp;·&nbsp; ACT.&nbsp;I &nbsp;·&nbsp; TYPESETTING AS A SERVICE
        </div>
      </aside>

      <div class="col-span-12 lg:col-span-8">
        <div class="eyebrow mb-6 flex items-center gap-3">
          <span class="text-rubric">●</span>
          <span>Cloudflare-native MCP server &nbsp;·&nbsp; v1.3-draft</span>
        </div>

        <h1 class="display-xl text-paper text-[64px] sm:text-[88px] lg:text-[120px]">
          Typeset scripture<br/>
          <span class="text-paper-2">from a</span> <span class="italic-wonk text-gilt">prompt.</span>
        </h1>

        <p class="mt-10 max-w-[640px] text-paper-2 text-lg leading-relaxed">
          Fifty years of <span class="smallcaps text-paper">Paratext</span> and <span class="smallcaps text-paper">XeTeX</span> craft compressed into
          <span class="text-gilt">three async tools</span> an AI agent can call.
          Submit a typesetting job. Poll for status. Cancel if it overruns.
          Get a publication-quality PDF back.
        </p>

        <div class="mt-12 flex flex-wrap gap-3">
          <a href="#demo" class="btn btn-primary">
            <span>Run the live demo</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
          <a href="https://github.com/klappy/ptxprint-mcp" target="_blank" rel="noopener" class="btn btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
            <span>Open the repo</span>
          </a>
          <a href="#tools" class="btn btn-ghost">
            <span>Read the contract</span>
          </a>
        </div>

        <!-- Endpoint chips -->
        <div class="mt-10 flex flex-wrap gap-2">
          <code class="text-[11.5px] text-paper-mute border border-rule rounded px-2.5 py-1">
            <span class="text-rubric">POST</span> <span class="text-paper-2">https://ptxprint-mcp.klappy.workers.dev</span><span class="text-gilt">/mcp</span>
          </code>
          <code class="text-[11.5px] text-paper-mute border border-rule rounded px-2.5 py-1">
            <span class="text-sap">GET</span> <span class="text-paper-2">https://ptxprint-mcp.klappy.workers.dev</span><span class="text-gilt">/health</span>
          </code>
        </div>
      </div>

      <!-- Live status panel -->
      <aside class="col-span-12 lg:col-span-3 lg:col-start-10">
        <div class="specimen specimen-glow p-5">
          <div class="folio mb-3">live observation</div>
          <div class="hr-rubric mb-4"></div>
          <div class="flex items-baseline justify-between mb-2">
            <span class="eyebrow">Server</span>
            <span id="panel-server" class="text-paper-2 text-[12px] font-mono">probing…</span>
          </div>
          <div class="flex items-baseline justify-between mb-2">
            <span class="eyebrow">Version</span>
            <span id="panel-version" class="text-paper-2 text-[12px] font-mono">—</span>
          </div>
          <div class="flex items-baseline justify-between mb-2">
            <span class="eyebrow">Spec</span>
            <span id="panel-spec" class="text-paper-2 text-[12px] font-mono">—</span>
          </div>
          <div class="flex items-baseline justify-between mb-4">
            <span class="eyebrow">Latency</span>
            <span id="panel-latency" class="text-paper-2 text-[12px] font-mono">—</span>
          </div>
          <div class="hr-thin mb-3"></div>
          <div class="folio mb-2">tools published</div>
          <div id="panel-tools" class="flex flex-wrap gap-1.5 mt-2">
            <!-- filled by JS -->
          </div>
          <div class="folio mt-5 text-paper-mute" id="panel-stamp">checked just now</div>
        </div>

        <!-- Mini stat -->
        <div class="mt-4 specimen p-4">
          <div class="flex items-baseline justify-between">
            <div>
              <div class="folio">canon ops · 7d</div>
              <div class="counter text-paper text-[42px] mt-1" id="mini-7d">—</div>
            </div>
            <div class="text-right">
              <div class="folio">via oddkit</div>
              <div class="text-[11px] text-gilt mt-1 font-mono">live</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</header>

<!-- ============================================================ -->
<!-- MANIFESTO / PITCH                                             -->
<!-- ============================================================ -->
<section id="pitch" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="grid grid-cols-12 gap-8 mb-14">
      <div class="col-span-12 lg:col-span-4">
        <div class="eyebrow mb-3"><span class="text-rubric">§ I.</span> &nbsp; The pitch</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">
          A thin, opinionless layer over a deeply opinionated craft.
        </h2>
      </div>
      <div class="col-span-12 lg:col-span-7 lg:col-start-6">
        <p class="dropcap text-paper-2 text-lg leading-[1.7]">
          PTXprint is the tool Bible translation teams use to typeset Paratext projects into print-ready
          PDFs &mdash; <span class="amper">&amp;</span> it is glorious. Hundreds of settings. Real diglot, polyglot, study-Bible layouts.
          Real XeTeX under the hood. The MCP server you are looking at does not pretend to know any of that.
          It exposes filesystem-shaped IO, content-addressed job submission,
          <span class="text-paper">&nbsp;and gets out of the way.</span>
        </p>
        <p class="text-paper-2 text-base leading-[1.7] mt-6">
          The opinions live next door, in a canon repository served by
          <a href="https://oddkit.klappy.dev" class="text-gilt ed-link" target="_blank" rel="noopener">oddkit</a>.
          The agent searches canon to learn what to change, then uses this server's actions to apply it.
          Two MCPs in concert: one for knowing, one for doing. Vodka architecture &mdash; each server holds opinions
          about exactly one concern.
        </p>
      </div>
    </div>

    <div class="hr-thin mb-10"></div>

    <!-- Three pillars -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-14">
      <div>
        <div class="folio mb-4">i.</div>
        <h3 class="display-md text-paper text-[28px] mb-3">For translation teams</h3>
        <p class="text-paper-2 leading-relaxed text-[15px]">
          Hand a translation agent your Paratext project &mdash; in any language, any script &mdash; and get a
          publication-quality PDF back. The agent knows when to ask, what to tweak, and when the result is ready
          to send to the press.
        </p>
      </div>
      <div>
        <div class="folio mb-4">ii.</div>
        <h3 class="display-md text-paper text-[28px] mb-3">For agent builders</h3>
        <p class="text-paper-2 leading-relaxed text-[15px]">
          Three async tools. No domain quiz to pass. Submit a job, poll for status, cancel if it overruns.
          The server takes care of XeTeX, autofill passes, content-addressed caching, and surfacing failures
          in language a model can reason about.
        </p>
      </div>
      <div>
        <div class="folio mb-4">iii.</div>
        <h3 class="display-md text-paper text-[28px] mb-3">For systems people</h3>
        <p class="text-paper-2 leading-relaxed text-[15px]">
          Cloudflare Worker dispatches via service binding into a Container running PTXprint &amp; XeTeX.
          Durable Objects hold per-job state. R2 stores content-addressed outputs.
          SHA-256 of the canonical payload is the cache key &mdash; identical jobs cost zero CPU.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================ -->
<!-- LIVE DEMO                                                     -->
<!-- ============================================================ -->
<section id="demo" class="border-t border-rule bg-ink-2/40">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-10">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ II.</span> &nbsp; Live demo</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">Submit a job. Watch it run.</h2>
      </div>
      <div class="hidden md:block text-right">
        <div class="folio">protocol</div>
        <div class="text-paper-2 font-mono text-[12px] mt-1">JSON-RPC 2.0 / MCP 2025-06-18</div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <!-- Form -->
      <div class="col-span-12 lg:col-span-5">
        <div class="specimen p-5">
          <div class="folio mb-3">submit_typeset · arguments</div>
          <div class="hr-thin mb-4"></div>

          <label class="block mb-4">
            <span class="eyebrow">project_id</span>
            <input id="f-project" value="WSG" class="mt-1 w-full bg-ink border border-rule rounded px-3 py-2 font-mono text-[13px] text-paper focus:outline-none focus:border-gilt" />
          </label>

          <label class="block mb-4">
            <span class="eyebrow">config_name</span>
            <input id="f-config" value="FancyNT" class="mt-1 w-full bg-ink border border-rule rounded px-3 py-2 font-mono text-[13px] text-paper focus:outline-none focus:border-gilt" />
          </label>

          <label class="block mb-4">
            <span class="eyebrow">books (USFM codes)</span>
            <input id="f-books" value="MAT MRK LUK JHN" class="mt-1 w-full bg-ink border border-rule rounded px-3 py-2 font-mono text-[13px] text-paper focus:outline-none focus:border-gilt" />
          </label>

          <label class="block mb-4">
            <span class="eyebrow">mode</span>
            <select id="f-mode" class="mt-1 w-full bg-ink border border-rule rounded px-3 py-2 font-mono text-[13px] text-paper focus:outline-none focus:border-gilt">
              <option value="simple">simple — one pass, fast</option>
              <option value="autofill">autofill — multi-pass layout</option>
            </select>
          </label>

          <label class="block mb-5">
            <span class="eyebrow">define (-D overrides)</span>
            <textarea id="f-define" rows="3" class="mt-1 w-full bg-ink border border-rule rounded px-3 py-2 font-mono text-[12px] text-paper focus:outline-none focus:border-gilt">{ "s_linespacing": "13", "c_fighiderefs": "True" }</textarea>
          </label>

          <button id="run-demo" class="btn btn-primary w-full justify-center">
            <span>Submit typesetting job</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
          <button id="cancel-demo" class="btn btn-rubric w-full justify-center mt-2 hidden">
            <span>Cancel job</span>
          </button>

          <div class="mt-4 text-[11px] text-paper-mute leading-relaxed">
            Demo plays the real protocol against deterministic mock state in your browser.
            Once CORS is enabled on <span class="font-mono text-paper-2">/mcp</span>, the same form submits live.
            Status indicator above this section already pings <span class="font-mono text-paper-2">/health</span> in real time.
          </div>
        </div>
      </div>

      <!-- Terminal -->
      <div class="col-span-12 lg:col-span-7">
        <div class="term">
          <div class="term-bar">
            <span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span>
            <span class="text-paper-mute text-[11px] ml-3">agent ⇌ ptxprint-mcp</span>
            <span id="job-pill" class="ml-auto pill pill-queued">idle</span>
          </div>
          <div id="term-body" class="p-4 h-[480px] overflow-auto code"></div>
        </div>

        <!-- Result panel -->
        <div id="result-panel" class="specimen p-5 mt-4 hidden">
          <div class="flex items-baseline justify-between mb-3">
            <div class="folio">job artifact</div>
            <div class="folio text-paper-mute"><span id="result-cache" class="text-gilt"></span></div>
          </div>
          <div class="hr-rubric mb-4"></div>

          <!-- Faux PDF cover -->
          <div class="grid grid-cols-12 gap-5 items-center">
            <div class="col-span-4">
              <div class="aspect-[3/4] border border-rule rounded relative overflow-hidden" style="background: linear-gradient(180deg,#1F1810 0%, #15110B 100%);">
                <div class="absolute inset-0 grid-bg opacity-25"></div>
                <div class="relative h-full p-4 flex flex-col">
                  <div class="folio text-[8px]">SBL · MAT–JHN · WSG · FANCY NT</div>
                  <div class="hr-rubric my-2 opacity-60"></div>
                  <div class="display-md text-paper text-[18px] leading-[1.05]">The<br/><span class="text-rubric">Gospels</span></div>
                  <div class="mt-auto text-[8px] text-paper-mute font-mono">412 pp · A5 · ptxp</div>
                </div>
              </div>
            </div>
            <div class="col-span-8 text-[13px] text-paper-2 font-mono leading-relaxed">
              <div><span class="text-paper-mute">pdf_path:</span><br/><span id="result-pdf" class="text-gilt break-all">—</span></div>
              <div class="mt-3"><span class="text-paper-mute">pages:</span> <span id="result-pages" class="text-paper">—</span> <span class="text-paper-mute">·</span> <span class="text-paper-mute">overfull boxes:</span> <span id="result-overfull" class="text-paper">—</span></div>
              <div class="mt-3"><span class="text-paper-mute">elapsed:</span> <span id="result-elapsed" class="text-paper">—</span></div>
              <div class="mt-3"><span class="text-paper-mute">human_summary:</span><br/><span id="result-summary" class="text-paper">—</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================ -->
<!-- THE FOUR TOOLS — specimen plate                               -->
<!-- ============================================================ -->
<section id="tools" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-12">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ III.</span> &nbsp; The contract</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">
          Three tools. One <span class="italic-wonk text-gilt">contract</span>.
        </h2>
        <p class="text-paper-2 max-w-[640px] mt-4 leading-relaxed">
          A typesetting job for a whole New Testament can take half an hour. Synchronous tools collide with
          every chat-shaped surface in existence. So the protocol is async: submit returns immediately, status
          is pollable, cancellation is honored.
        </p>
      </div>
      <div class="folio hidden md:block text-right">
        SPECIMEN<br/>PLATE
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

      <!-- Tool 1 -->
      <div class="specimen p-5 relative overflow-hidden">
        <div class="absolute right-3 top-3 tool-num">i</div>
        <div class="folio mb-2">tool · async</div>
        <h3 class="display-md text-paper text-[22px] mb-2"><code class="font-mono text-paper">submit_typeset</code></h3>
        <p class="text-paper-2 text-[14px] leading-relaxed mb-4">
          Hand it a project, a config, a book selection. Returns a <code class="font-mono text-gilt">job_id</code>
          immediately and a predicted output path. Identical payloads cache-hit.
        </p>
        <pre class="code bg-ink/60 p-3 rounded border border-rule overflow-auto"><code><span class="tok-com">// returns immediately</span>
{
  <span class="tok-key">job_id</span>: <span class="tok-str">"job_a1f9…"</span>,
  <span class="tok-key">cache_id</span>: <span class="tok-str">"sha256:b91c…"</span>,
  <span class="tok-key">cache_status</span>: <span class="tok-str">"miss"</span>,
  <span class="tok-key">predicted_pdf_path</span>: <span class="tok-str">"…/WSG_…ptxp.pdf"</span>
}</code></pre>
      </div>

      <!-- Tool 2 -->
      <div class="specimen p-5 relative overflow-hidden">
        <div class="absolute right-3 top-3 tool-num">ii</div>
        <div class="folio mb-2">tool · pollable</div>
        <h3 class="display-md text-paper text-[22px] mb-2"><code class="font-mono text-paper">get_job_status</code></h3>
        <p class="text-paper-2 text-[14px] leading-relaxed mb-4">
          Per-pass progress, log tail, error list, overfull-box count. A
          <code class="font-mono text-gilt">human_summary</code> string for downstream chat agents.
        </p>
        <pre class="code bg-ink/60 p-3 rounded border border-rule overflow-auto"><code>{
  <span class="tok-key">state</span>: <span class="tok-str">"running"</span>,
  <span class="tok-key">progress</span>: { <span class="tok-key">passes_completed</span>: <span class="tok-num">3</span> },
  <span class="tok-key">overfull_count</span>: <span class="tok-num">8</span>,
  <span class="tok-key">errors</span>: [],
  <span class="tok-key">human_summary</span>: <span class="tok-str">"Pass 3 of ~5. Steady."</span>
}</code></pre>
      </div>

      <!-- Tool 3 -->
      <div class="specimen p-5 relative overflow-hidden">
        <div class="absolute right-3 top-3 tool-num">iii</div>
        <div class="folio mb-2">tool · safety valve</div>
        <h3 class="display-md text-paper text-[22px] mb-2"><code class="font-mono text-paper">cancel_job</code></h3>
        <p class="text-paper-2 text-[14px] leading-relaxed mb-4">
          A 30-minute autofill pass needs a kill switch. SIGTERM to the subprocess; partial outputs preserved
          on disk; state moves to <code class="font-mono text-gilt">cancelled</code>.
        </p>
        <pre class="code bg-ink/60 p-3 rounded border border-rule overflow-auto"><code>{
  <span class="tok-key">ok</span>: <span class="tok-num">true</span>,
  <span class="tok-key">was_running</span>: <span class="tok-num">true</span>,
  <span class="tok-key">cancelled_at</span>: <span class="tok-str">"2026-04-30T23:24:00Z"</span>
}</code></pre>
      </div>
    </div>

    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-paper-2 text-[14px]">
      <div>
        <div class="folio mb-2">cache</div>
        <p class="leading-relaxed">SHA-256 of the canonical payload (RFC 8785 JCS) is the only cache key. No TTL. Identical jobs cost zero CPU and return the same R2 object.</p>
      </div>
      <div>
        <div class="folio mb-2">timeout discipline</div>
        <p class="leading-relaxed">Per-job timeout in the request, default 30 min for autofill, 5 min for simple. No platform-edge timeout exposed to the caller.</p>
      </div>
      <div>
        <div class="folio mb-2">progress shape</div>
        <p class="leading-relaxed">Per-pass, not per-page. PTXprint doesn't expose useful per-page progress in headless mode &mdash; honest "pass 3 of ~5" beats fabricated percentages.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================ -->
<!-- LIVE TELEMETRY                                                -->
<!-- ============================================================ -->
<section id="telemetry" class="border-t border-rule bg-ink-2/40">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-12">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ IV.</span> &nbsp; Live telemetry</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">No information asymmetry.</h2>
        <p class="text-paper-2 max-w-[680px] mt-4 leading-relaxed">
          The same data the maintainer sees, served from
          <a href="https://oddkit.klappy.dev" target="_blank" rel="noopener" class="text-gilt ed-link">oddkit</a>'s public telemetry endpoint.
          Cloudflare Analytics Engine, queried over MCP from this page, in your browser, right now.
        </p>
      </div>
      <div class="folio hidden md:block text-right">
        <div>SOURCE</div>
        <div class="text-paper-2 mt-1">oddkit_telemetry</div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-5 mb-8">
      <!-- Big counter: 7d -->
      <div class="col-span-12 md:col-span-4 specimen p-6">
        <div class="folio mb-2">canon ops · last 7d</div>
        <div class="counter text-paper text-[88px]" id="t-7d">—</div>
        <div class="text-paper-mute text-[12px] mt-2 font-mono" id="t-7d-rate">—</div>
      </div>

      <!-- 24h sparkline -->
      <div class="col-span-12 md:col-span-8 specimen p-6">
        <div class="flex items-baseline justify-between mb-2">
          <div class="folio">activity · last 24h</div>
          <div class="folio text-paper-mute" id="t-24h-total">—</div>
        </div>
        <svg id="spark" viewBox="0 0 600 140" class="w-full h-[140px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#D9A93E" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#D9A93E" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <!-- Hourly grid -->
          <g id="spark-grid"></g>
          <path id="spark-area" fill="url(#sparkfill)" d=""/>
          <polyline id="spark-poly" class="spark-line" fill="none" stroke="#D9A93E" stroke-width="1.5" points=""/>
        </svg>
        <div class="flex justify-between text-paper-mute font-mono text-[10px] mt-1">
          <span id="t-24h-start">—</span>
          <span id="t-24h-end">—</span>
        </div>
      </div>
    </div>

    <!-- Top tools bar chart -->
    <div class="specimen p-6 mb-5">
      <div class="flex items-baseline justify-between mb-5">
        <div class="folio">top oddkit actions · last 7d</div>
        <div class="folio text-paper-mute">SUM(_sample_interval)</div>
      </div>
      <div id="t-tools" class="space-y-2.5">
        <!-- bars filled by JS -->
        <div class="text-paper-mute font-mono text-[12px]">loading…</div>
      </div>
    </div>

    <!-- SQL receipt -->
    <details class="specimen p-5 group">
      <summary class="flex items-center justify-between cursor-pointer list-none">
        <div class="folio">audit · the SQL this page just ran</div>
        <div class="folio text-paper-mute group-open:hidden">show</div>
        <div class="folio text-paper-mute hidden group-open:block">hide</div>
      </summary>
      <div class="mt-4 hr-thin"></div>
      <pre id="t-sql" class="code mt-4 text-[12px] text-paper-2 whitespace-pre-wrap"></pre>
      <div class="mt-3 text-paper-mute text-[11px] font-mono" id="t-stamp">—</div>
    </details>
  </div>
</section>

<!-- ============================================================ -->
<!-- ARCHITECTURE — VODKA                                           -->
<!-- ============================================================ -->
<section id="architecture" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="grid grid-cols-12 gap-8 mb-12">
      <div class="col-span-12 lg:col-span-5">
        <div class="eyebrow mb-3"><span class="text-rubric">§ V.</span> &nbsp; Architecture</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">
          Vodka <span class="italic-wonk text-gilt">architecture</span>.
        </h2>
        <p class="text-paper-2 mt-4 leading-relaxed">
          Each MCP server holds opinions about exactly one concern. The PTXprint server holds <span class="text-paper">none</span>
          about typesetting craft &mdash; only about subprocess lifecycle, content-addressed caching, and sandboxed
          file IO. Domain knowledge lives next door, in canon, served by oddkit.
        </p>
        <p class="text-paper-2 mt-4 leading-relaxed">
          The agent's reasoning loop becomes legible: <span class="smallcaps text-paper">search canon</span> &rarr;
          <span class="smallcaps text-paper">understand</span> &rarr;
          <span class="smallcaps text-paper">act</span> &rarr;
          <span class="smallcaps text-paper">observe</span>. Two MCPs in concert. Each thin enough to maintain by one
          person indefinitely.
        </p>
      </div>

      <div class="col-span-12 lg:col-span-7">
        <!-- Vodka diagram, hand-drawn-ish in SVG -->
        <div class="specimen p-6">
          <div class="folio mb-4">flow</div>
          <svg viewBox="0 0 720 360" class="w-full">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#D9A93E"/>
              </marker>
              <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#C8331A"/>
              </marker>
            </defs>

            <!-- Agent -->
            <g>
              <rect x="20" y="140" width="140" height="80" fill="#15110B" stroke="#3A2F1F"/>
              <text x="90" y="175" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">Agent</text>
              <text x="90" y="195" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">CLAUDE / GEMMA / GPT</text>
            </g>

            <!-- oddkit (knowing) -->
            <g>
              <rect x="280" y="40" width="180" height="100" fill="#15110B" stroke="#C8331A"/>
              <text x="370" y="78" text-anchor="middle" fill="#C8331A" font-family="JetBrains Mono" font-size="9" letter-spacing="2">KNOWING</text>
              <text x="370" y="102" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">oddkit MCP</text>
              <text x="370" y="124" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">canon · search · get</text>
            </g>

            <!-- PTXprint (doing) -->
            <g>
              <rect x="280" y="220" width="180" height="100" fill="#15110B" stroke="#D9A93E"/>
              <text x="370" y="258" text-anchor="middle" fill="#D9A93E" font-family="JetBrains Mono" font-size="9" letter-spacing="2">DOING</text>
              <text x="370" y="282" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">ptxprint MCP</text>
              <text x="370" y="304" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">submit · status · cancel</text>
            </g>

            <!-- Container -->
            <g>
              <rect x="540" y="220" width="160" height="100" fill="#15110B" stroke="#3A2F1F" stroke-dasharray="3,3"/>
              <text x="620" y="258" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="9" letter-spacing="2">CONTAINER</text>
              <text x="620" y="282" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="18">PTXprint</text>
              <text x="620" y="304" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">XeTeX · fonts</text>
            </g>

            <!-- Arrows -->
            <line x1="160" y1="170" x2="278" y2="100" stroke="#C8331A" stroke-width="1.5" marker-end="url(#arrR)"/>
            <line x1="160" y1="190" x2="278" y2="260" stroke="#D9A93E" stroke-width="1.5" marker-end="url(#arr)"/>
            <line x1="460" y1="270" x2="538" y2="270" stroke="#D9A93E" stroke-width="1.5" marker-end="url(#arr)"/>

            <!-- Labels on arrows -->
            <text x="220" y="125" fill="#C8331A" font-family="JetBrains Mono" font-size="10">search canon</text>
            <text x="220" y="245" fill="#D9A93E" font-family="JetBrains Mono" font-size="10">submit_typeset</text>
            <text x="500" y="263" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">service binding</text>

            <!-- Storage -->
            <g>
              <rect x="540" y="40" width="160" height="100" fill="#15110B" stroke="#3A2F1F" stroke-dasharray="3,3"/>
              <text x="620" y="78" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="9" letter-spacing="2">STATE / OUTPUTS</text>
              <text x="620" y="102" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="16">DO &nbsp;·&nbsp; R2</text>
              <text x="620" y="124" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">SHA-256 cache key</text>
            </g>
            <line x1="460" y1="80" x2="538" y2="80" stroke="#3A2F1F" stroke-width="1" stroke-dasharray="2,2"/>
            <line x1="460" y1="280" x2="538" y2="120" stroke="#3A2F1F" stroke-width="1" stroke-dasharray="2,2"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Principles row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 pt-8 border-t border-rule">
      <div>
        <div class="folio mb-2">opinionless server</div>
        <p class="text-paper-2 text-[13.5px] leading-relaxed">No piclist syntax. No adjlist semantics. No font tables. No USFM. The server treats every file as opaque text and every subprocess as opaque action.</p>
      </div>
      <div>
        <div class="folio mb-2">content-addressed</div>
        <p class="text-paper-2 text-[13.5px] leading-relaxed">Cache keys are SHA-256 hashes (RFC 8785 JCS) of the canonical payload. No TTL. No staleness. Two identical jobs share one PDF.</p>
      </div>
      <div>
        <div class="folio mb-2">async by design</div>
        <p class="text-paper-2 text-[13.5px] leading-relaxed">Cloudflare's 30s Worker timeout collides with 30-minute autofill jobs. The two-step contract is the only honest answer.</p>
      </div>
      <div>
        <div class="folio mb-2">canon-governed</div>
        <p class="text-paper-2 text-[13.5px] leading-relaxed">Every architectural decision is encoded in OLDC+H artifacts and stored under <span class="font-mono text-gilt">canon/</span>. The repo is the spec.</p>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================ -->
<!-- TECH STACK                                                    -->
<!-- ============================================================ -->
<section class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-16 lg:py-20">
    <div class="eyebrow mb-3"><span class="text-rubric">§ VI.</span> &nbsp; Stack</div>
    <h2 class="display-md text-paper text-[28px] mb-8">Built on the shoulders of two giants.</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="specimen p-6">
        <div class="folio mb-3">edge runtime</div>
        <h3 class="display-md text-paper text-[22px] mb-3">Cloudflare</h3>
        <ul class="text-paper-2 text-[14px] space-y-2 leading-relaxed">
          <li><span class="text-gilt font-mono text-[12px]">Workers</span> &nbsp;— MCP transport, auth, dispatch via service binding</li>
          <li><span class="text-gilt font-mono text-[12px]">Containers</span> &nbsp;— PTXprint + XeTeX + SIL Charis (standard-2: 1 vCPU, 6 GiB)</li>
          <li><span class="text-gilt font-mono text-[12px]">Durable Objects</span> &nbsp;— per-job state, cancellation, polling</li>
          <li><span class="text-gilt font-mono text-[12px]">R2</span> &nbsp;— content-addressed PDF and log storage</li>
          <li><span class="text-gilt font-mono text-[12px]">Cache API</span> &nbsp;— hot path for repeat reads</li>
        </ul>
      </div>

      <div class="specimen p-6">
        <div class="folio mb-3">typesetting</div>
        <h3 class="display-md text-paper text-[22px] mb-3">SIL &amp; Paratext</h3>
        <ul class="text-paper-2 text-[14px] space-y-2 leading-relaxed">
          <li><span class="text-gilt font-mono text-[12px]">PTXprint</span> &nbsp;— Hosken, Penny, Gardner et al · headless CLI mode</li>
          <li><span class="text-gilt font-mono text-[12px]">XeTeX</span> &nbsp;— Unicode-native typesetting engine</li>
          <li><span class="text-gilt font-mono text-[12px]">USFM</span> &nbsp;— scripture markup as the source format</li>
          <li><span class="text-gilt font-mono text-[12px]">SIL Charis</span> &nbsp;— bundled font for the English-first scope</li>
          <li><span class="text-gilt font-mono text-[12px]">LFF</span> &nbsp;— Language Font Finder for BCP 47 → font resolution</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================ -->
<!-- COLOPHON / FOOTER                                             -->
<!-- ============================================================ -->
<footer class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-14">
    <div class="grid grid-cols-12 gap-8">
      <div class="col-span-12 lg:col-span-6">
        <div class="display-md text-paper text-[28px]">
          ptxprint <span class="amper">&amp;</span> oddkit
        </div>
        <p class="text-paper-2 mt-3 max-w-[520px] leading-relaxed">
          Built in canon-governed sessions for translation teams who need
          the press to move at the speed of a conversation.
        </p>
      </div>
      <div class="col-span-6 lg:col-span-3">
        <div class="folio mb-3">repository</div>
        <ul class="space-y-2 text-paper-2 text-[14px]">
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://github.com/klappy/ptxprint-mcp">github.com/klappy/ptxprint-mcp</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://github.com/sillsdev/ptx2pdf">sillsdev/ptx2pdf</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://software.sil.org/ptxprint/">software.sil.org/ptxprint</a></li>
        </ul>
      </div>
      <div class="col-span-6 lg:col-span-3">
        <div class="folio mb-3">endpoints</div>
        <ul class="space-y-2 text-paper-2 text-[14px] font-mono text-[12.5px]">
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://ptxprint-mcp.klappy.workers.dev/health">/health</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://ptxprint-mcp.klappy.workers.dev/">/</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://oddkit.klappy.dev/health">oddkit /health</a></li>
        </ul>
      </div>
    </div>
    <div class="hr-thin mt-10 mb-5"></div>
    <div class="flex flex-wrap justify-between gap-3 folio">
      <span>colophon · set in fraunces &amp; manrope · MMXXVI</span>
      <span>klappy / ptxprint-mcp · MIT</span>
    </div>
  </div>
</footer>

<!-- ============================================================ -->
<!-- SCRIPTS                                                       -->
<!-- ============================================================ -->
<script>
const PTXPRINT_BASE = 'https://ptxprint-mcp.klappy.workers.dev';
const ODDKIT_MCP    = 'https://oddkit.klappy.dev/mcp';

// ---------- 1. LIVE /health PROBE -------------------------------
async function probeHealth() {
  const t0 = performance.now();
  let data = null, latency = 0, ok = false;
  try {
    const r = await fetch(PTXPRINT_BASE + '/health', { cache: 'no-store' });
    latency = Math.round(performance.now() - t0);
    if (r.ok) {
      data = await r.json();
      ok = true;
    }
  } catch (e) {
    // CORS-blocked; we'll degrade gracefully
  }

  const dot       = document.getElementById('status-dot');
  const text      = document.getElementById('status-text');
  const sVer      = document.getElementById('status-version');
  const sSpec     = document.getElementById('status-spec');
  const sTools    = document.getElementById('status-tools');
  const pServer   = document.getElementById('panel-server');
  const pVersion  = document.getElementById('panel-version');
  const pSpec     = document.getElementById('panel-spec');
  const pLatency  = document.getElementById('panel-latency');
  const pTools    = document.getElementById('panel-tools');
  const pStamp    = document.getElementById('panel-stamp');

  if (ok && data) {
    dot.classList.remove('bad'); dot.classList.add('ok');
    text.textContent = 'live · ' + (data.service || 'ptxprint-mcp');
    sVer.textContent = data.version || '?';
    sSpec.textContent = data.spec || '?';
    sTools.textContent = (data.tools || []).length;
    pServer.textContent = data.service;
    pVersion.textContent = data.version;
    pSpec.textContent = data.spec;
    pLatency.textContent = latency + ' ms';
    pTools.innerHTML = (data.tools || []).map(t =>
      \`<code class="text-[10.5px] font-mono px-1.5 py-0.5 border border-rule rounded text-paper-2">\${t}</code>\`
    ).join('');
    pStamp.textContent = 'checked ' + new Date().toLocaleTimeString();
  } else {
    // Fallback — known good snapshot from build time, surfaced as such
    const fallback = {
      service: 'ptxprint-mcp',
      version: '0.1.0',
      spec: 'v1.3-draft',
      tools: ['submit_typeset','get_job_status','cancel_job','docs','telemetry_public','telemetry_policy'],
    };
    dot.classList.add('bad'); text.textContent = 'cors-blocked · snapshot';
    sVer.textContent = fallback.version;
    sSpec.textContent = fallback.spec;
    sTools.textContent = fallback.tools.length;
    pServer.textContent = fallback.service;
    pVersion.textContent = fallback.version;
    pSpec.textContent = fallback.spec;
    pLatency.textContent = 'cors';
    pTools.innerHTML = fallback.tools.map(t =>
      \`<code class="text-[10.5px] font-mono px-1.5 py-0.5 border border-rule rounded text-paper-2">\${t}</code>\`
    ).join('');
    pStamp.textContent = 'snapshot · enable CORS on /health for live';
  }
}
probeHealth();
setInterval(probeHealth, 30_000);

// ---------- 2. ODDKIT MCP CLIENT (browser-side) -----------------
let oddSession = null;

async function oddkitInit() {
  const r = await fetch(ODDKIT_MCP, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'ptxprint-mcp-homepage', version: '0.1.0' },
      },
    }),
  });
  oddSession = r.headers.get('Mcp-Session-Id') || r.headers.get('mcp-session-id');
  await r.text(); // drain
  // notifications/initialized
  await fetch(ODDKIT_MCP, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': oddSession,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
}

function parseSse(text) {
  // Extract data: { ... } from SSE; fall back to plain JSON
  const m = text.match(/^data:\\s*(\\{[\\s\\S]*\\})\\s*$/m);
  return JSON.parse(m ? m[1] : text);
}

async function oddkitCall(name, args) {
  if (!oddSession) await oddkitInit();
  const r = await fetch(ODDKIT_MCP, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': oddSession,
    },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const text = await r.text();
  const env  = parseSse(text);
  const inner = env.result?.content?.[0]?.text;
  return inner ? JSON.parse(inner) : env;
}

async function runTelemetrySQL(sql) {
  const out = await oddkitCall('telemetry_public', { sql });
  return out?.result?.data;
}

// ---------- 3. RENDER TELEMETRY ----------------------------------
const SQL_TOP    = \`SELECT tool_name, SUM(_sample_interval) AS calls FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '7' DAY AND tool_name IS NOT NULL AND tool_name != '' GROUP BY tool_name ORDER BY calls DESC LIMIT 10\`;
const SQL_24H    = \`SELECT toStartOfHour(timestamp) AS hour, SUM(_sample_interval) AS calls FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '24' HOUR GROUP BY hour ORDER BY hour ASC\`;
const SQL_7D_TOT = \`SELECT SUM(_sample_interval) AS total FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '7' DAY\`;

// Snapshot fallback (taken at page generation time)
const SNAPSHOT = {
  top: [
    { tool_name: 'oddkit',           calls: 763 },
    { tool_name: 'oddkit_catalog',   calls: 443 },
    { tool_name: 'oddkit_challenge', calls: 395 },
    { tool_name: 'oddkit_search',    calls: 381 },
    { tool_name: 'oddkit_time',      calls: 337 },
    { tool_name: 'oddkit_gate',      calls: 261 },
    { tool_name: 'oddkit_encode',    calls: 245 },
    { tool_name: 'oddkit_resolve',   calls: 174 },
    { tool_name: 'oddkit_get',       calls: 133 },
    { tool_name: 'oddkit_validate',  calls: 109 },
  ],
  hourly: [7,11,54,44,60,6,6,13,39,61,66,113,272,50,41,83,90,31,57,16],
  total7d: 7560,
};

function fmt(n) { return Number(n).toLocaleString('en-US'); }

function renderTopTools(rows, isLive) {
  const max = Math.max(...rows.map(r => +r.calls));
  const html = rows.map(r => {
    const w = (+r.calls / max * 100).toFixed(1);
    return \`
      <div class="flex items-center gap-3">
        <code class="text-[12px] text-paper-2 w-44 shrink-0">\${r.tool_name}</code>
        <div class="flex-1 h-6 bg-ink/60 rounded-sm overflow-hidden border border-rule/60">
          <div class="bar h-full" style="width:0%; background: linear-gradient(90deg,#D9A93E,#C8331A);" data-w="\${w}"></div>
        </div>
        <code class="text-[12px] text-gilt w-20 text-right tabular-nums">\${fmt(r.calls)}</code>
      </div>\`;
  }).join('');
  document.getElementById('t-tools').innerHTML = html;
  // Animate bars
  requestAnimationFrame(() => {
    document.querySelectorAll('#t-tools .bar').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  });
}

function renderSparkline(values, isLive) {
  const w = 600, h = 140, pad = 4;
  const max = Math.max(...values, 1);
  const step = (w - pad*2) / Math.max(values.length - 1, 1);
  const points = values.map((v,i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad*2);
    return \`\${x.toFixed(1)},\${y.toFixed(1)}\`;
  });
  document.getElementById('spark-poly').setAttribute('points', points.join(' '));
  // Area fill
  const area = \`M\${pad},\${h-pad} L\${points.join(' L')} L\${pad + (values.length-1)*step},\${h-pad} Z\`;
  document.getElementById('spark-area').setAttribute('d', area);
  // Grid
  const grid = [];
  for (let i = 0; i < values.length; i++) {
    const x = pad + i * step;
    grid.push(\`<line x1="\${x}" y1="0" x2="\${x}" y2="\${h}" stroke="#3A2F1F" stroke-width="0.5" opacity="0.4"/>\`);
  }
  document.getElementById('spark-grid').innerHTML = grid.join('');
  document.getElementById('t-24h-total').textContent = fmt(values.reduce((a,b)=>a+(+b||0),0)) + ' calls';
}

async function loadTelemetry() {
  const stamp = document.getElementById('t-stamp');
  const sqlBox = document.getElementById('t-sql');
  sqlBox.textContent = \`-- 7d total\\n\${SQL_7D_TOT};\\n\\n-- 24h hourly\\n\${SQL_24H};\\n\\n-- top tools 7d\\n\${SQL_TOP};\`;

  let live = false;
  try {
    const [tot, hourly, top] = await Promise.all([
      runTelemetrySQL(SQL_7D_TOT),
      runTelemetrySQL(SQL_24H),
      runTelemetrySQL(SQL_TOP),
    ]);
    if (tot && hourly && top && top.data) {
      live = true;
      const totalRow = tot.data?.[0];
      const totalNum = totalRow ? +totalRow.total : 0;
      document.getElementById('t-7d').textContent = fmt(totalNum);
      document.getElementById('mini-7d').textContent = fmt(totalNum);
      document.getElementById('t-7d-rate').textContent = (totalNum / 7).toFixed(0) + ' avg / day';

      const hours = (hourly.data || []).map(r => +r.calls);
      renderSparkline(hours, true);
      if (hourly.data?.length) {
        document.getElementById('t-24h-start').textContent = hourly.data[0].hour.split(' ')[1] || '';
        document.getElementById('t-24h-end').textContent   = hourly.data[hourly.data.length-1].hour.split(' ')[1] || '';
      }

      renderTopTools((top.data || []).slice(0,10), true);
      stamp.textContent = 'live · queried ' + new Date().toLocaleTimeString() + ' · oddkit_telemetry (Cloudflare AE)';
      return;
    }
  } catch (e) { /* fall through */ }

  // Fallback — snapshot
  document.getElementById('t-7d').textContent = fmt(SNAPSHOT.total7d);
  document.getElementById('mini-7d').textContent = fmt(SNAPSHOT.total7d);
  document.getElementById('t-7d-rate').textContent = (SNAPSHOT.total7d / 7).toFixed(0) + ' avg / day';
  renderSparkline(SNAPSHOT.hourly, false);
  renderTopTools(SNAPSHOT.top, false);
  stamp.textContent = 'snapshot · live failed · oddkit_telemetry (Cloudflare AE)';
}
loadTelemetry();
setInterval(loadTelemetry, 60_000);

// ---------- 4. DEMO TERMINAL -------------------------------------
const term = document.getElementById('term-body');
const pill = document.getElementById('job-pill');
const runBtn    = document.getElementById('run-demo');
const cancelBtn = document.getElementById('cancel-demo');
const result    = document.getElementById('result-panel');

let jobActive = false;
let jobCancelled = false;

function setPill(state) {
  pill.className = 'ml-auto pill pill-' + state;
  pill.textContent = state;
}

function termWrite(html) {
  term.insertAdjacentHTML('beforeend', html);
  term.scrollTop = term.scrollHeight;
}

function ts() { return new Date().toISOString().split('T')[1].replace('Z',''); }

function jsonHL(obj) {
  const s = JSON.stringify(obj, null, 2);
  return s
    .replace(/("[^"]+")(\\s*:)/g, '<span class="tok-key">$1</span>$2')
    .replace(/:\\s*("[^"]*")/g, ': <span class="tok-str">$1</span>')
    .replace(/:\\s*(true|false|null)/g, ': <span class="tok-num">$1</span>')
    .replace(/:\\s*(\\d+(\\.\\d+)?)/g, ': <span class="tok-num">$1</span>');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fakeHash() {
  const a='0123456789abcdef'; let s=''; for(let i=0;i<64;i++) s+=a[Math.floor(Math.random()*16)]; return s;
}
function fakeJobId() {
  const a='0123456789abcdef'; let s=''; for(let i=0;i<8;i++) s+=a[Math.floor(Math.random()*16)]; return 'job_'+s;
}

async function runDemo() {
  if (jobActive) return;
  jobActive = true; jobCancelled = false;
  result.classList.add('hidden');
  term.innerHTML = '';
  runBtn.disabled = true;
  cancelBtn.classList.remove('hidden');

  const project = document.getElementById('f-project').value.trim();
  const config  = document.getElementById('f-config').value.trim();
  const books   = document.getElementById('f-books').value.trim();
  const mode    = document.getElementById('f-mode').value;
  let define = {};
  try { define = JSON.parse(document.getElementById('f-define').value || '{}'); } catch (e) {}

  const args = { project_id: project, config_name: config, books, mode, define };

  termWrite(\`<div class="text-paper-mute">[\${ts()}] $ submit_typeset</div>\`);
  termWrite(\`<div class="mt-1"><span class="tok-com">// JSON-RPC over MCP streamable-http</span></div>\`);
  termWrite(\`<pre class="mt-1">\${jsonHL({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'submit_typeset',arguments:args}})}</pre>\`);

  setPill('queued');
  await sleep(450);
  if (jobCancelled) return finishCancelled();

  const cacheHit = Math.random() < 0.18;
  const cache = cacheHit ? 'hit' : 'miss';
  const job_id = fakeJobId();
  const cache_id = 'sha256:' + fakeHash().slice(0,16) + '…';
  const predicted = \`…/\${project}/local/ptxprint/\${project}_\${config}_\${books.split(' ')[0]}-\${books.split(' ').pop()}_ptxp.pdf\`;

  termWrite(\`<div class="mt-3 text-paper-mute">[\${ts()}] ← response (\${cacheHit ? '8' : '47'} ms)</div>\`);
  termWrite(\`<pre class="mt-1">\${jsonHL({job_id, cache_id, cache_status: cache, predicted_pdf_path: predicted, submitted_at: new Date().toISOString()})}</pre>\`);

  if (cacheHit) {
    termWrite(\`<div class="mt-2 text-sap">// cache hit — identical payload already typeset; PDF served from R2</div>\`);
    setPill('succeeded');
    showResult({pages: 412, overfull: 8, elapsed: '0.3 s', cache: 'hit', cache_id, pdf: predicted, summary: 'Cached PDF served. No CPU spent.'});
    finish();
    return;
  }

  setPill('running');
  const passes = mode === 'autofill' ? 5 : 1;
  const delays = mode === 'autofill' ? [900, 1200, 1100, 1300, 1000] : [1600];
  let overfull = 24;
  for (let p = 1; p <= passes; p++) {
    if (jobCancelled) return finishCancelled();
    await sleep(delays[p-1]);
    overfull = Math.max(0, overfull - Math.ceil(overfull * 0.5));
    termWrite(\`<div class="mt-2 text-paper-mute">[\${ts()}] $ get_job_status</div>\`);
    termWrite(\`<pre class="mt-1">\${jsonHL({
      job_id,
      state: 'running',
      progress: { passes_completed: p, passes_total_estimate: mode==='autofill' ? '~5' : 1, current_phase: p===passes ? 'finishing' : 'typesetting' },
      overfull_count: overfull,
      errors: [],
      log_tail: \`[XeTeX] pass \${p} complete · \${overfull} overfull boxes remaining\`,
      human_summary: mode==='autofill'
        ? \`Autofill pass \${p} of ~\${passes}. \${overfull} overfull boxes; trending down.\`
        : \`Typesetting pass complete. \${overfull} overfull boxes.\`,
    })}</pre>\`);
  }

  if (jobCancelled) return finishCancelled();
  await sleep(700);
  setPill('succeeded');
  termWrite(\`<div class="mt-2 text-sap">// pdf written to R2 · job complete</div>\`);
  termWrite(\`<pre class="mt-1">\${jsonHL({
    job_id, state: 'succeeded',
    progress: { passes_completed: passes, current_phase: 'finishing' },
    pdf_path: predicted,
    overfull_count: overfull,
    completed_at: new Date().toISOString(),
    human_summary: \`Done. 412 pages. \${overfull} residual overfull boxes.\`,
  })}</pre>\`);
  showResult({pages: 412, overfull, elapsed: ((delays.reduce((a,b)=>a+b,0)+1150)/1000).toFixed(1) + ' s', cache: 'miss', cache_id, pdf: predicted, summary: \`Done. \${412} pages, \${overfull} residual overfull boxes.\`});
  finish();
}

function showResult({pages, overfull, elapsed, cache, cache_id, pdf, summary}) {
  result.classList.remove('hidden');
  document.getElementById('result-pdf').textContent = pdf;
  document.getElementById('result-pages').textContent = pages;
  document.getElementById('result-overfull').textContent = overfull;
  document.getElementById('result-elapsed').textContent = elapsed;
  document.getElementById('result-summary').textContent = summary;
  document.getElementById('result-cache').textContent = \`cache · \${cache} · \${cache_id}\`;
}

function finish() {
  runBtn.disabled = false;
  cancelBtn.classList.add('hidden');
  jobActive = false;
}

function finishCancelled() {
  setPill('cancelled');
  termWrite(\`<div class="mt-3 text-rubric">// SIGTERM sent · partial outputs preserved</div>\`);
  termWrite(\`<pre class="mt-1">\${jsonHL({ok:true, was_running:true, cancelled_at: new Date().toISOString()})}</pre>\`);
  finish();
}

runBtn.addEventListener('click', runDemo);
cancelBtn.addEventListener('click', () => { jobCancelled = true; });

// ---------- 5. REVEAL ON SCROLL ----------------------------------
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>

</body>
</html>
`;
