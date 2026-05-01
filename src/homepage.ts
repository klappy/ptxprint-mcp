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
  <meta name="description" content="A Cloudflare-native MCP server that turns 50 years of Paratext + XeTeX engineering into three async tools an AI agent can call. Live demo + live telemetry." />
  <meta property="og:title" content="PTXprint MCP — Typeset scripture from a prompt" />
  <meta property="og:description" content="A Cloudflare-native MCP server that drives PTXprint headlessly for Bible translation teams." />
  <meta property="og:url" content="https://ptxprint.klappy.dev/" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://ptxprint.klappy.dev/" />

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
    html, body { background: #0E0C08; color: #F4ECDC; }
    body { font-family: 'Manrope', system-ui, sans-serif; font-feature-settings: 'ss01', 'cv11', 'tnum'; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    .grain::before { content: ''; position: fixed; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.96  0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); opacity: 0.55; mix-blend-mode: overlay; z-index: 1; }
    .grain > * { position: relative; z-index: 2; }
    .display-xl { font-family:'Fraunces',serif; font-variation-settings:'opsz' 144,'SOFT' 30,'WONK' 0; font-weight:400; letter-spacing:-0.035em; line-height:0.9; }
    .display-lg { font-family:'Fraunces',serif; font-variation-settings:'opsz' 120,'SOFT' 50; font-weight:400; letter-spacing:-0.025em; line-height:0.95; }
    .display-md { font-family:'Fraunces',serif; font-variation-settings:'opsz' 72,'SOFT' 50; font-weight:500; letter-spacing:-0.015em; line-height:1.0; }
    .italic-wonk { font-style:italic; font-variation-settings:'opsz' 144,'SOFT' 100,'WONK' 1; }
    .eyebrow { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:#BFB294; }
    .smallcaps { font-variant-caps: all-small-caps; letter-spacing:0.08em; }
    .marginalia { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#8A7E66; }
    .folio { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:#6F6450; }
    .dropcap::first-letter { font-family:'Fraunces',serif; font-variation-settings:'opsz' 144,'SOFT' 30; font-weight:600; color:#C8331A; float:left; font-size:4.2em; line-height:0.85; padding-right:10px; padding-top:4px; }
    @keyframes pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(217,169,62,0.7); } 50% { box-shadow: 0 0 0 8px rgba(217,169,62,0); } }
    .live-dot { width:8px; height:8px; border-radius:50%; background:#D9A93E; animation:pulse-dot 2s infinite; display:inline-block; }
    .live-dot.ok { background:#6FAA72; box-shadow: 0 0 0 0 rgba(111,170,114,0.7); animation-name:pulse-ok; }
    @keyframes pulse-ok { 0%,100% { box-shadow: 0 0 0 0 rgba(111,170,114,0.7); } 50% { box-shadow: 0 0 0 8px rgba(111,170,114,0); } }
    .live-dot.bad { background:#C8331A; animation:none; }
    .hr-thin { border-top: 1px solid #3A2F1F; }
    .hr-rubric { border-top: 1px solid #C8331A; opacity:0.55; }
    .specimen { background: linear-gradient(180deg,#15110B 0%, #1F1810 100%); border:1px solid #3A2F1F; border-radius:6px; }
    .specimen-glow { box-shadow: inset 0 1px 0 rgba(244,236,220,0.04), 0 1px 0 rgba(0,0,0,0.4), 0 30px 80px -40px rgba(217,169,62,0.18); }
    .code { font-family:'JetBrains Mono',monospace; font-size:12.5px; line-height:1.55; color:#E8DDC4; }
    .tok-key { color:#D9A93E; }
    .tok-str { color:#C8B47A; }
    .tok-num { color:#C8331A; }
    .tok-com { color:#6F6450; font-style:italic; }
    .bar { transition: width 1.2s cubic-bezier(.2,.7,.1,1); }
    .amper { font-family:'Fraunces',serif; font-style:italic; font-variation-settings:'opsz' 144,'SOFT' 100,'WONK' 1; font-weight:300; color:#D9A93E; }
    .grid-bg { background-image: linear-gradient(rgba(244,236,220,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(244,236,220,0.025) 1px, transparent 1px); background-size: 32px 32px; }
    .ed-link { background-image: linear-gradient(currentColor,currentColor); background-size: 0 1px; background-position: 0 100%; background-repeat: no-repeat; transition: background-size 0.4s; }
    .ed-link:hover { background-size: 100% 1px; }
    .btn { font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; padding: 12px 18px; border-radius:4px; transition: all 0.2s; display: inline-flex; align-items:center; gap:10px; cursor: pointer; }
    .btn-primary { background:#D9A93E; color:#0E0C08; border:1px solid #D9A93E; }
    .btn-primary:hover { background:#E8BC52; transform: translateY(-1px); }
    .btn-ghost { background: transparent; color:#F4ECDC; border:1px solid #3A2F1F; }
    .btn-ghost:hover { border-color:#D9A93E; color:#D9A93E; }
    .btn-rubric { background: transparent; color:#C8331A; border:1px solid #C8331A; }
    .btn-rubric:hover { background:#C8331A; color:#F4ECDC; }
    .btn-sm { font-size:10.5px; padding: 8px 12px; }
    .btn:disabled { opacity:0.45; cursor:not-allowed; transform:none; }
    .term { background:#0A0805; border:1px solid #3A2F1F; border-radius:6px; font-family:'JetBrains Mono',monospace; font-size:12px; }
    .term-bar { background:#15110B; border-bottom:1px solid #3A2F1F; padding:8px 14px; display:flex; align-items:center; gap:10px; }
    .term-dot { width:10px; height:10px; border-radius:50%; background:#3A2F1F; }
    .pill { display: inline-flex; align-items:center; gap:6px; padding: 3px 9px; border-radius:999px; font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; border:1px solid currentColor; }
    .pill-idle      { color:#8A7E66; }
    .pill-init      { color:#8A7E66; }
    .pill-queued    { color:#8A7E66; }
    .pill-running   { color:#D9A93E; }
    .pill-succeeded { color:#6FAA72; }
    .pill-cached    { color:#6FAA72; }
    .pill-failed    { color:#C8331A; }
    .pill-cancelled { color:#8A7E66; }
    .counter { font-family:'Fraunces',serif; font-variation-settings:'opsz' 144,'SOFT' 30; font-weight:400; letter-spacing:-0.03em; line-height:1; font-feature-settings:'tnum'; }
    @keyframes draw { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
    .spark-line { stroke-dasharray: 1000; animation: draw 1.8s ease forwards; }
    .tool-num { font-family:'Fraunces',serif; font-variation-settings:'opsz' 144,'SOFT' 100,'WONK' 1; font-style:italic; font-weight:300; color:#D9A93E; opacity:0.4; font-size:80px; line-height:1; }
    .pdf-frame { background:#0A0805; border:1px solid #3A2F1F; border-radius:6px; overflow:hidden; }
    .pdf-frame iframe { width:100%; height:560px; border:0; background:#fff; }
    .chip { display:inline-flex; align-items:center; gap:6px; padding: 4px 9px; border-radius:4px; border:1px solid #3A2F1F; background:#15110B; font-family:'JetBrains Mono',monospace; font-size:11px; color:#E8DDC4; }
    .chip-ok  { border-color:#6FAA72; color:#6FAA72; }
    .chip-bad { border-color:#C8331A; color:#C8331A; }
    ::selection { background:#C8331A; color:#F4ECDC; }
  </style>
</head>

<body class="grain">

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
      <a href="#docs-live" class="text-paper-2 ed-link hover:text-gilt">docs</a>
      <a href="#telemetry" class="text-paper-2 ed-link hover:text-gilt">telemetry</a>
    </div>
  </div>
</div>

<header class="relative overflow-hidden">
  <div class="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
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
          <a href="#tools" class="btn btn-ghost"><span>Read the contract</span></a>
        </div>

        <div class="mt-10 flex flex-wrap gap-2">
          <code class="text-[11.5px] text-paper-mute border border-rule rounded px-2.5 py-1">
            <span class="text-rubric">POST</span> <span class="text-paper-2">https://ptxprint.klappy.dev</span><span class="text-gilt">/mcp</span>
          </code>
          <code class="text-[11.5px] text-paper-mute border border-rule rounded px-2.5 py-1">
            <span class="text-sap">GET</span> <span class="text-paper-2">https://ptxprint.klappy.dev</span><span class="text-gilt">/health</span>
          </code>
        </div>
      </div>

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
          <div id="panel-tools" class="flex flex-wrap gap-1.5 mt-2"></div>
          <div class="folio mt-5 text-paper-mute" id="panel-stamp">checked just now</div>
        </div>

        <div class="mt-4 specimen p-4">
          <div class="flex items-baseline justify-between">
            <div>
              <div class="folio">tool calls · 30d</div>
              <div class="counter text-paper text-[42px] mt-1" id="mini-7d">—</div>
            </div>
            <div class="text-right">
              <div class="folio">this server</div>
              <div class="text-[11px] text-gilt mt-1 font-mono">live</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</header>

<section id="pitch" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="grid grid-cols-12 gap-8 mb-14">
      <div class="col-span-12 lg:col-span-4">
        <div class="eyebrow mb-3"><span class="text-rubric">§ I.</span> &nbsp; The pitch</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">A thin, opinionless layer over a deeply opinionated craft.</h2>
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

<section id="demo" class="border-t border-rule bg-ink-2/40">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-10">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ II.</span> &nbsp; Live demo · real MCP calls</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">Submit a job. Get a real PDF.</h2>
        <p class="text-paper-2 max-w-[680px] mt-4 leading-relaxed text-[15px]">
          Both demo payloads are checked-in smoke fixtures from the repo's <span class="font-mono text-paper">smoke/</span>
          directory and have been rendered before, so they cache-hit and return instantly &mdash; zero container CPU.
          The PDF below is the real artifact served from R2.
        </p>
      </div>
      <div class="hidden md:block text-right">
        <div class="folio">protocol</div>
        <div class="text-paper-2 font-mono text-[12px] mt-1">JSON-RPC 2.0 / MCP 2025-06-18</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      <span class="folio mr-2">payload</span>
      <button data-payload="jhn" class="payload-btn btn btn-ghost btn-sm">
        <span>BSB · Gospel of John</span>
      </button>
      <button data-payload="psa" class="payload-btn btn btn-ghost btn-sm">
        <span>BSB · Book of Psalms</span>
      </button>
      <a id="payload-source" href="#" target="_blank" rel="noopener" class="folio text-paper-mute hover:text-gilt ml-auto ed-link">
        view the JSON source on github →
      </a>
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-12 lg:col-span-7">
        <div class="specimen p-5 mb-4">
          <div class="folio mb-3">actions</div>
          <div class="hr-thin mb-4"></div>
          <div class="flex flex-wrap gap-2">
            <button id="btn-submit" class="btn btn-primary">
              <span>submit_typeset</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
            <button id="btn-status" class="btn btn-ghost" disabled><span>get_job_status</span></button>
            <button id="btn-cancel" class="btn btn-rubric" disabled><span>cancel_job</span></button>
            <button id="btn-tools-list" class="btn btn-ghost btn-sm ml-auto"><span>tools/list</span></button>
            <button id="btn-clear" class="btn btn-ghost btn-sm"><span>clear log</span></button>
          </div>
          <div class="mt-4 text-[11px] text-paper-mute leading-relaxed">
            Each call is a real <span class="font-mono">tools/call</span> over MCP streamable-http. Response envelopes are
            shown verbatim. The page identifies itself with <span class="font-mono">x-ptxprint-client</span> headers so
            it appears on the transparency leaderboard.
          </div>
        </div>

        <div class="term">
          <div class="term-bar">
            <span class="term-dot"></span><span class="term-dot"></span><span class="term-dot"></span>
            <span class="text-paper-mute text-[11px] ml-3">browser ⇌ ptxprint.klappy.dev/mcp</span>
            <span id="job-pill" class="ml-auto pill pill-idle">idle</span>
          </div>
          <div id="term-body" class="p-4 h-[460px] overflow-auto code"></div>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-5">
        <div class="specimen p-5">
          <div class="flex items-baseline justify-between mb-3">
            <div class="folio">artifact</div>
            <div id="pdf-meta" class="folio text-paper-mute">awaiting submit</div>
          </div>
          <div class="hr-rubric mb-4"></div>

          <div class="pdf-frame" id="pdf-shell">
            <div id="pdf-empty" class="h-[560px] flex flex-col items-center justify-center p-6 text-center">
              <div class="display-md text-paper-2 text-[24px] mb-3">No artifact yet.</div>
              <div class="text-paper-mute text-[13px] max-w-[260px] leading-relaxed">
                Click <span class="font-mono text-paper">submit_typeset</span> to call the real MCP server.
                A cached PDF will load right here.
              </div>
            </div>
            <iframe id="pdf-iframe" class="hidden" title="PTXprint output PDF"></iframe>
          </div>

          <div class="mt-3 flex items-baseline justify-between text-[12px]">
            <a id="pdf-link" href="#" target="_blank" rel="noopener" class="text-gilt font-mono ed-link hidden">
              open in new tab ↗
            </a>
            <div class="text-paper-mute font-mono" id="pdf-bytes">—</div>
          </div>
        </div>

        <div id="tools-list-panel" class="specimen p-5 mt-4 hidden">
          <div class="flex items-baseline justify-between mb-3">
            <div class="folio">tools advertised by /mcp</div>
            <div class="folio text-paper-mute" id="tools-list-stamp">—</div>
          </div>
          <div class="hr-thin mb-3"></div>
          <div id="tools-list-chips" class="flex flex-wrap gap-2"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="docs-live" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
    <div class="grid grid-cols-12 gap-8 mb-8">
      <div class="col-span-12 lg:col-span-5">
        <div class="eyebrow mb-3"><span class="text-rubric">§ III.</span> &nbsp; The canon, live</div>
        <h2 class="display-lg text-paper text-[40px] lg:text-[56px]">Ask the <span class="italic-wonk text-gilt">docs</span> tool anything.</h2>
        <p class="text-paper-2 mt-4 leading-relaxed">
          The MCP server's <span class="font-mono text-paper">docs(query)</span> tool searches the project's
          canon &mdash; the prose articles, specs, and governance documents that give an agent enough context
          to drive PTXprint. Type a question; see the actual answer plus the canon URIs that backed it.
        </p>
      </div>

      <div class="col-span-12 lg:col-span-7">
        <div class="specimen p-5">
          <div class="folio mb-3">docs(query, audience=headless)</div>
          <div class="hr-thin mb-4"></div>
          <div class="flex gap-2 flex-wrap">
            <input id="docs-q" placeholder="e.g. vodka architecture, payload schema, font resolution"
                   value="vodka architecture"
                   class="flex-1 min-w-[220px] bg-ink border border-rule rounded px-3 py-2 font-mono text-[13px] text-paper focus:outline-none focus:border-gilt" />
            <button id="docs-go" class="btn btn-primary"><span>ask</span></button>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 items-baseline">
            <span class="folio">try:</span>
            <button class="docs-suggestion folio text-paper-2 hover:text-gilt ed-link" data-q="vodka architecture">vodka architecture</button>
            <span class="text-rule">·</span>
            <button class="docs-suggestion folio text-paper-2 hover:text-gilt ed-link" data-q="submit_typeset payload schema">payload schema</button>
            <span class="text-rule">·</span>
            <button class="docs-suggestion folio text-paper-2 hover:text-gilt ed-link" data-q="font resolution">font resolution</button>
            <span class="text-rule">·</span>
            <button class="docs-suggestion folio text-paper-2 hover:text-gilt ed-link" data-q="failure mode taxonomy">failure modes</button>
          </div>
        </div>

        <div id="docs-result" class="specimen p-5 mt-4 hidden">
          <div class="flex items-baseline justify-between mb-3">
            <div class="folio">answer</div>
            <div class="folio text-paper-mute" id="docs-stamp">—</div>
          </div>
          <div class="hr-rubric mb-4"></div>
          <div id="docs-answer" class="text-paper-2 text-[14px] leading-relaxed mb-4 whitespace-pre-wrap"></div>
          <div class="folio mb-2">sources</div>
          <div id="docs-sources" class="space-y-2"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="tools" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-12">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ IV.</span> &nbsp; The contract</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">
          Three tools. One <span class="italic-wonk text-gilt">contract</span>.
        </h2>
        <p class="text-paper-2 max-w-[640px] mt-4 leading-relaxed">
          A typesetting job for a whole New Testament can take half an hour. Synchronous tools collide with
          every chat-shaped surface in existence. So the protocol is async: submit returns immediately, status
          is pollable, cancellation is honored.
        </p>
      </div>
      <div class="folio hidden md:block text-right">SPECIMEN<br/>PLATE</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div class="specimen p-5 relative overflow-hidden">
        <div class="absolute right-3 top-3 tool-num">i</div>
        <div class="folio mb-2">tool · async</div>
        <h3 class="display-md text-paper text-[22px] mb-2"><code class="font-mono text-paper">submit_typeset</code></h3>
        <p class="text-paper-2 text-[14px] leading-relaxed mb-4">
          Hand it a project, a config, a book selection. Returns a <code class="font-mono text-gilt">job_id</code>
          immediately and a predicted output URL. Identical payloads cache-hit.
        </p>
        <pre class="code bg-ink/60 p-3 rounded border border-rule overflow-auto"><code><span class="tok-com">// returns immediately</span>
{
  <span class="tok-key">job_id</span>: <span class="tok-str">"611700a0…"</span>,
  <span class="tok-key">payload_hash</span>: <span class="tok-str">"611700a0…"</span>,
  <span class="tok-key">cached</span>: <span class="tok-num">true</span>,
  <span class="tok-key">predicted_pdf_url</span>: <span class="tok-str">"…/r2/…/pdf"</span>
}</code></pre>
      </div>

      <div class="specimen p-5 relative overflow-hidden">
        <div class="absolute right-3 top-3 tool-num">ii</div>
        <div class="folio mb-2">tool · pollable</div>
        <h3 class="display-md text-paper text-[22px] mb-2"><code class="font-mono text-paper">get_job_status</code></h3>
        <p class="text-paper-2 text-[14px] leading-relaxed mb-4">
          Per-pass progress, log tail, error list, overfull-box count. A
          <code class="font-mono text-gilt">human_summary</code> string for downstream chat agents.
        </p>
        <pre class="code bg-ink/60 p-3 rounded border border-rule overflow-auto"><code>{
  <span class="tok-key">state</span>: <span class="tok-str">"succeeded"</span>,
  <span class="tok-key">progress</span>: { <span class="tok-key">passes_completed</span>: <span class="tok-num">1</span> },
  <span class="tok-key">overfull_count</span>: <span class="tok-num">8</span>,
  <span class="tok-key">errors</span>: [],
  <span class="tok-key">human_summary</span>: <span class="tok-str">"Done. 61 pages."</span>
}</code></pre>
      </div>

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
  <span class="tok-key">was_running</span>: <span class="tok-num">false</span>,
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

<section id="telemetry" class="border-t border-rule bg-ink-2/40">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="flex items-end justify-between mb-12">
      <div>
        <div class="eyebrow mb-3"><span class="text-rubric">§ V.</span> &nbsp; Live telemetry · this server</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">No information asymmetry.</h2>
        <p class="text-paper-2 max-w-[680px] mt-4 leading-relaxed">
          Every tool call against <span class="font-mono text-paper">ptxprint.klappy.dev</span> writes one
          structural data point to <span class="font-mono text-paper">ptxprint_telemetry</span>. Same data
          the maintainer sees, queried over MCP from this page in your browser, right now.
          Identify yourself with <a href="https://github.com/klappy/ptxprint-mcp/blob/main/canon/governance/telemetry-governance.md"
            target="_blank" rel="noopener" class="text-gilt ed-link">an x-ptxprint-client header</a> and you'll
          appear on the consumer leaderboard below.
        </p>
      </div>
      <div class="folio hidden md:block text-right">
        <div>DATASET</div>
        <div class="text-paper-2 mt-1 font-mono">ptxprint_telemetry</div>
        <div class="text-paper-mute mt-1">cloudflare AE</div>
      </div>
    </div>

    <!-- Hero numbers: 30d total + 24h sparkline (PTXPRINT) -->
    <div class="grid grid-cols-12 gap-5 mb-8">
      <div class="col-span-12 md:col-span-4 specimen p-6">
        <div class="folio mb-2">events · last 30d</div>
        <div class="counter text-paper text-[88px]" id="t-7d">—</div>
        <div class="text-paper-mute text-[12px] mt-2 font-mono" id="t-7d-rate">—</div>
      </div>

      <div class="col-span-12 md:col-span-8 specimen p-6">
        <div class="flex items-baseline justify-between mb-2">
          <div class="folio">activity · last 24h · this server</div>
          <div class="folio text-paper-mute" id="t-24h-total">—</div>
        </div>
        <svg id="spark" viewBox="0 0 600 140" class="w-full h-[140px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#D9A93E" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#D9A93E" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g id="spark-grid"></g>
          <path id="spark-area" fill="url(#sparkfill)" d=""/>
          <polyline id="spark-poly" class="spark-line" fill="none" stroke="#D9A93E" stroke-width="1.5" points=""/>
        </svg>
      </div>
    </div>

    <!-- Tool leaderboard (PTXPRINT) -->
    <div class="specimen p-6 mb-5">
      <div class="flex items-baseline justify-between mb-5">
        <div class="folio">tool_call leaderboard · last 30d · ptxprint</div>
        <div class="folio text-paper-mute">SUM(_sample_interval) on blob3</div>
      </div>
      <div id="t-tools" class="space-y-2.5">
        <div class="text-paper-mute font-mono text-[12px]">loading…</div>
      </div>
    </div>

    <!-- Consumer leaderboard (PTXPRINT) -->
    <div class="specimen p-6 mb-5">
      <div class="flex items-baseline justify-between mb-3">
        <div class="folio">consumer leaderboard · who is calling this server</div>
        <div class="folio text-paper-mute" id="ptx-t-stamp">—</div>
      </div>
      <div class="hr-thin mb-4"></div>
      <div id="ptx-t-content">
        <div class="text-paper-mute font-mono text-[12px]">querying…</div>
      </div>
    </div>

    <!-- Companion: oddkit canon traffic (smaller, contextual) -->
    <details class="specimen p-5 group mb-5">
      <summary class="flex items-center justify-between cursor-pointer list-none">
        <div class="folio">companion · oddkit_telemetry — for context, the related canon service</div>
        <div class="folio text-paper-mute group-open:hidden">show</div>
        <div class="folio text-paper-mute hidden group-open:block">hide</div>
      </summary>
      <div class="mt-4 hr-thin"></div>
      <div id="oddkit-companion" class="mt-4">
        <div class="text-paper-mute font-mono text-[12px]">loading…</div>
      </div>
    </details>

    <details class="specimen p-5 group mb-5">
      <summary class="flex items-center justify-between cursor-pointer list-none">
        <div class="folio">live · telemetry_policy() — what this server tracks and why</div>
        <div class="folio text-paper-mute group-open:hidden">show</div>
        <div class="folio text-paper-mute hidden group-open:block">hide</div>
      </summary>
      <div class="mt-4 hr-thin"></div>
      <div id="policy-summary" class="mt-4 text-paper-2 text-[13px] leading-relaxed">loading…</div>
    </details>

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

<section id="architecture" class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
    <div class="grid grid-cols-12 gap-8 mb-12">
      <div class="col-span-12 lg:col-span-5">
        <div class="eyebrow mb-3"><span class="text-rubric">§ VI.</span> &nbsp; Architecture</div>
        <h2 class="display-lg text-paper text-[44px] lg:text-[64px]">Vodka <span class="italic-wonk text-gilt">architecture</span>.</h2>
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
        <div class="specimen p-6">
          <div class="folio mb-4">flow</div>
          <svg viewBox="0 0 720 360" class="w-full">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#D9A93E"/></marker>
              <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#C8331A"/></marker>
            </defs>
            <g>
              <rect x="20" y="140" width="140" height="80" fill="#15110B" stroke="#3A2F1F"/>
              <text x="90" y="175" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">Agent</text>
              <text x="90" y="195" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">CLAUDE / GEMMA / GPT</text>
            </g>
            <g>
              <rect x="280" y="40" width="180" height="100" fill="#15110B" stroke="#C8331A"/>
              <text x="370" y="78" text-anchor="middle" fill="#C8331A" font-family="JetBrains Mono" font-size="9" letter-spacing="2">KNOWING</text>
              <text x="370" y="102" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">oddkit MCP</text>
              <text x="370" y="124" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">canon · search · get</text>
            </g>
            <g>
              <rect x="280" y="220" width="180" height="100" fill="#15110B" stroke="#D9A93E"/>
              <text x="370" y="258" text-anchor="middle" fill="#D9A93E" font-family="JetBrains Mono" font-size="9" letter-spacing="2">DOING</text>
              <text x="370" y="282" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="20">ptxprint MCP</text>
              <text x="370" y="304" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">submit · status · cancel</text>
            </g>
            <g>
              <rect x="540" y="220" width="160" height="100" fill="#15110B" stroke="#3A2F1F" stroke-dasharray="3,3"/>
              <text x="620" y="258" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="9" letter-spacing="2">CONTAINER</text>
              <text x="620" y="282" text-anchor="middle" fill="#F4ECDC" font-family="Fraunces" font-size="18">PTXprint</text>
              <text x="620" y="304" text-anchor="middle" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">XeTeX · fonts</text>
            </g>
            <line x1="160" y1="170" x2="278" y2="100" stroke="#C8331A" stroke-width="1.5" marker-end="url(#arrR)"/>
            <line x1="160" y1="190" x2="278" y2="260" stroke="#D9A93E" stroke-width="1.5" marker-end="url(#arr)"/>
            <line x1="460" y1="270" x2="538" y2="270" stroke="#D9A93E" stroke-width="1.5" marker-end="url(#arr)"/>
            <text x="220" y="125" fill="#C8331A" font-family="JetBrains Mono" font-size="10">search canon</text>
            <text x="220" y="245" fill="#D9A93E" font-family="JetBrains Mono" font-size="10">submit_typeset</text>
            <text x="500" y="263" fill="#8A7E66" font-family="JetBrains Mono" font-size="10">service binding</text>
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

<section class="border-t border-rule">
  <div class="max-w-[1280px] mx-auto px-6 py-16 lg:py-20">
    <div class="eyebrow mb-3"><span class="text-rubric">§ VII.</span> &nbsp; Stack</div>
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
          <li><span class="text-gilt font-mono text-[12px]">Analytics Engine</span> &nbsp;— public usage telemetry</li>
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
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://ptxprint.klappy.dev/health">ptxprint.klappy.dev/health</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://ptxprint.klappy.dev/mcp">ptxprint.klappy.dev/mcp</a></li>
          <li><a class="ed-link hover:text-gilt" target="_blank" rel="noopener" href="https://oddkit.klappy.dev/health">oddkit.klappy.dev/health</a></li>
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

<script>
const PTX_BASE   = 'https://ptxprint.klappy.dev';
const PTX_MCP    = PTX_BASE + '/mcp';
const ODDKIT_MCP = 'https://oddkit.klappy.dev/mcp';

const SELF_REPORT_HEADERS = {
  'x-ptxprint-client': 'ptxprint-mcp-homepage',
  'x-ptxprint-client-version': '0.2.0',
  'x-ptxprint-surface': 'homepage',
  'x-ptxprint-contact-url': 'https://github.com/klappy/ptxprint-mcp',
  'x-ptxprint-policy-url': 'https://ptxprint.klappy.dev/',
  'x-ptxprint-capabilities': 'submit,poll,cancel,docs,telemetry',
};

const PAYLOADS = {
  jhn: {
    label: 'BSB · Gospel of John',
    url: 'https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/smoke/bsb-jhn-empirical.json',
    source: 'https://github.com/klappy/ptxprint-mcp/blob/main/smoke/bsb-jhn-empirical.json',
    expected: { label: '21 chapters · ~360 KB' },
  },
  psa: {
    label: 'BSB · Book of Psalms',
    url: 'https://raw.githubusercontent.com/klappy/ptxprint-mcp/main/smoke/bsb-psa-empirical.json',
    source: 'https://github.com/klappy/ptxprint-mcp/blob/main/smoke/bsb-psa-empirical.json',
    expected: { label: '150 chapters' },
  },
};
let activePayload = 'jhn';
let lastJobId = null;
let lastPdfUrl = null;

// 1. /health probe
async function probeHealth() {
  const t0 = performance.now();
  try {
    const r = await fetch(PTX_BASE + '/health', { cache: 'no-store' });
    const latency = Math.round(performance.now() - t0);
    if (r.ok) { paintHealth(await r.json(), latency, true); return; }
  } catch (e) {}
  paintHealth(null, 0, false);
}
function paintHealth(data, latency, ok) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (ok && data) {
    dot.classList.remove('bad'); dot.classList.add('ok');
    text.textContent = 'live · ' + (data.service || 'ptxprint-mcp');
    document.getElementById('status-version').textContent = data.version || '?';
    document.getElementById('status-spec').textContent = data.spec || '?';
    document.getElementById('status-tools').textContent = (data.tools || []).length;
    document.getElementById('panel-server').textContent = data.service;
    document.getElementById('panel-version').textContent = data.version;
    document.getElementById('panel-spec').textContent = data.spec;
    document.getElementById('panel-latency').textContent = latency + ' ms';
    document.getElementById('panel-tools').innerHTML = (data.tools || []).map(t =>
      \`<code class="text-[10.5px] font-mono px-1.5 py-0.5 border border-rule rounded text-paper-2">\${t}</code>\`
    ).join('');
    document.getElementById('panel-stamp').textContent = 'checked ' + new Date().toLocaleTimeString();
  } else {
    dot.classList.add('bad'); text.textContent = 'unreachable';
    document.getElementById('panel-stamp').textContent = 'fetch failed · check console';
  }
}
probeHealth();
setInterval(probeHealth, 30000);

// 2. MCP client
class MCPClient {
  constructor(endpoint, extraHeaders = {}) {
    this.endpoint = endpoint;
    this.extraHeaders = extraHeaders;
    this.session = null;
    this.initPromise = null;
    // Monotonic JSON-RPC id counter. Crucial: Date.now() COLLIDES under
    // Promise.all() because all parallel calls execute in the same
    // millisecond, which causes the MCP transport to cross-wire the
    // responses (tools/list response delivered to a tools/call promise,
    // etc.). A simple incrementing integer guarantees uniqueness.
    this.nextId = 100;
  }
  _headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...this.extraHeaders,
      ...(this.session ? { 'Mcp-Session-Id': this.session } : {}),
    };
  }
  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const r = await fetch(this.endpoint, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ptxprint-mcp-homepage', version: '0.2.0' } },
        }),
      });
      this.session = r.headers.get('Mcp-Session-Id') || r.headers.get('mcp-session-id');
      await r.text();
      if (this.session) {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: this._headers(),
          body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
        });
      }
    })();
    return this.initPromise;
  }
  static parseSse(text) {
    const m = text.match(/^data:\\s*(\\{[\\s\\S]*\\})\\s*$/m);
    return JSON.parse(m ? m[1] : text);
  }
  async raw(method, params) {
    await this.init();
    const r = await fetch(this.endpoint, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ jsonrpc: '2.0', id: ++this.nextId, method, params }),
    });
    return MCPClient.parseSse(await r.text());
  }
  async tool(name, args) {
    const env = await this.raw('tools/call', { name, arguments: args });
    if (env.error) throw new Error(env.error.message || JSON.stringify(env.error));
    const inner = env.result?.content?.[0]?.text;
    return inner ? JSON.parse(inner) : env.result;
  }
  async toolsList() {
    const env = await this.raw('tools/list', {});
    return env.result?.tools || [];
  }
}

const ptx    = new MCPClient(PTX_MCP, SELF_REPORT_HEADERS);
const oddkit = new MCPClient(ODDKIT_MCP);

// 3. Demo terminal
const term      = document.getElementById('term-body');
const pill      = document.getElementById('job-pill');
const btnSubmit = document.getElementById('btn-submit');
const btnStatus = document.getElementById('btn-status');
const btnCancel = document.getElementById('btn-cancel');
const btnClear  = document.getElementById('btn-clear');
const btnTools  = document.getElementById('btn-tools-list');

function setPill(state, label) {
  pill.className = 'ml-auto pill pill-' + state;
  pill.textContent = label || state;
}
function ts() { return new Date().toISOString().split('T')[1].replace('Z',''); }
function termWriteHTML(html) {
  term.insertAdjacentHTML('beforeend', html);
  term.scrollTop = term.scrollHeight;
}
function jsonHL(obj) {
  if (obj === null || obj === undefined) return '<span class="tok-num">null</span>';
  const s = JSON.stringify(obj, null, 2);
  return s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("[^"\\n]+")(\\s*:)/g, '<span class="tok-key">$1</span>$2')
    .replace(/:\\s*("[^"\\n]*")/g, ': <span class="tok-str">$1</span>')
    .replace(/:\\s*(true|false|null)/g, ': <span class="tok-num">$1</span>')
    .replace(/:\\s*(-?\\d+(\\.\\d+)?)/g, ': <span class="tok-num">$1</span>');
}
function termSection(t) { termWriteHTML(\`<div class="mt-3 text-paper-mute">[\${ts()}] <span class="text-gilt">\${t}</span></div>\`); }
function termComment(s) { termWriteHTML(\`<div class="mt-1 tok-com">// \${s}</div>\`); }
function termJSON(o)    { termWriteHTML(\`<pre class="mt-1">\${jsonHL(o)}</pre>\`); }
function termError(m)   { termWriteHTML(\`<div class="mt-2 text-rubric">! \${String(m).replace(/</g,'&lt;')}</div>\`); }

async function loadPayload(which) {
  const meta = PAYLOADS[which];
  termSection(\`fetch \${meta.label} payload\`);
  termComment(meta.url);
  const r = await fetch(meta.url, { cache: 'force-cache' });
  if (!r.ok) throw new Error('payload fetch failed: HTTP ' + r.status);
  const json = await r.json();
  termComment(\`\${(JSON.stringify(json).length / 1024).toFixed(1)} KB · sha256 keyed at server\`);
  return json;
}

async function doSubmit() {
  btnSubmit.disabled = true; btnStatus.disabled = true; btnCancel.disabled = true;
  setPill('init', 'connecting');
  hidePdf();
  try {
    const payload = await loadPayload(activePayload);
    termSection('tools/call · submit_typeset');
    termJSON({ jsonrpc:'2.0', method:'tools/call', params:{ name:'submit_typeset', arguments:{ payload:'<…elided in log…>' } } });
    setPill('queued');
    const t0 = performance.now();
    const result = await ptx.tool('submit_typeset', { payload });
    const ms = Math.round(performance.now() - t0);
    termSection(\`← response · \${ms} ms\`);
    termJSON(result);
    lastJobId = result.job_id;
    lastPdfUrl = result.predicted_pdf_url;
    btnStatus.disabled = false; btnCancel.disabled = false;
    if (result.cached) {
      setPill('cached', 'cache hit');
      termComment('cache hit — payload sha256 already typeset; PDF served from R2');
      await showPdf(result, PAYLOADS[activePayload].expected);
    } else {
      setPill('running', 'dispatched');
      termComment('cache MISS — container dispatched. Polling get_job_status…');
      pollUntilDone(result.job_id, result.predicted_pdf_url);
    }
  } catch (e) {
    termError('submit failed: ' + e.message);
    setPill('failed');
  } finally {
    btnSubmit.disabled = false;
  }
}

async function doStatus() {
  if (!lastJobId) return;
  btnStatus.disabled = true;
  try {
    termSection('tools/call · get_job_status');
    termJSON({ jsonrpc:'2.0', method:'tools/call', params:{ name:'get_job_status', arguments:{ job_id:lastJobId } } });
    const t0 = performance.now();
    const status = await ptx.tool('get_job_status', { job_id: lastJobId });
    const ms = Math.round(performance.now() - t0);
    termSection(\`← response · \${ms} ms\`);
    termJSON(status);
    if (status.state === 'succeeded') setPill('succeeded');
    else if (status.state === 'failed') setPill('failed');
    else if (status.state === 'cancelled') setPill('cancelled');
    else setPill('running', status.state || 'running');
  } catch (e) { termError('status failed: ' + e.message); }
  finally { btnStatus.disabled = false; }
}

async function doCancel() {
  if (!lastJobId) return;
  btnCancel.disabled = true;
  try {
    termSection('tools/call · cancel_job');
    termJSON({ jsonrpc:'2.0', method:'tools/call', params:{ name:'cancel_job', arguments:{ job_id:lastJobId } } });
    const t0 = performance.now();
    const result = await ptx.tool('cancel_job', { job_id: lastJobId });
    const ms = Math.round(performance.now() - t0);
    termSection(\`← response · \${ms} ms\`);
    termJSON(result);
    if (result.was_running) setPill('cancelled');
    else termComment('was_running: false — nothing to cancel (cached jobs have no live process)');
  } catch (e) { termError('cancel failed: ' + e.message); }
  finally { btnCancel.disabled = false; }
}

async function pollUntilDone(jobId, predicted) {
  let n = 0;
  while (n < 20) {
    n++;
    await new Promise(r => setTimeout(r, 5000));
    try {
      const status = await ptx.tool('get_job_status', { job_id: jobId });
      termSection(\`poll \${n} · get_job_status\`);
      termJSON({ state: status.state, progress: status.progress, human_summary: status.human_summary });
      if (status.state === 'succeeded') {
        setPill('succeeded');
        await showPdf({ predicted_pdf_url: predicted, job_id: jobId, cached: false }, PAYLOADS[activePayload].expected);
        return;
      }
      if (status.state === 'failed' || status.state === 'cancelled') {
        setPill(status.state); termError('terminal state: ' + status.state); return;
      }
    } catch (e) { termError('poll failed: ' + e.message); return; }
  }
  termComment('poll cap reached — keep polling manually with get_job_status');
}

async function doToolsList() {
  btnTools.disabled = true;
  try {
    termSection('tools/list');
    const tools = await ptx.toolsList();
    termJSON(tools.map(t => ({ name: t.name, description: (t.description || '').slice(0, 90) + '…' })));
    const panel = document.getElementById('tools-list-panel');
    const chips = document.getElementById('tools-list-chips');
    chips.innerHTML = tools.map(t =>
      \`<span class="chip chip-ok" title="\${(t.description||'').replace(/"/g,'&quot;').slice(0,200)}">● \${t.name}</span>\`
    ).join('');
    document.getElementById('tools-list-stamp').textContent = new Date().toLocaleTimeString();
    panel.classList.remove('hidden');
  } catch (e) { termError('tools/list failed: ' + e.message); }
  finally { btnTools.disabled = false; }
}

function hidePdf() {
  document.getElementById('pdf-empty').classList.remove('hidden');
  const ifr = document.getElementById('pdf-iframe');
  ifr.classList.add('hidden'); ifr.removeAttribute('src');
  document.getElementById('pdf-link').classList.add('hidden');
  document.getElementById('pdf-bytes').textContent = '—';
  document.getElementById('pdf-meta').textContent = 'awaiting submit';
}

async function showPdf(result, expected) {
  let url = result.predicted_pdf_url;
  if (!url) return;
  // Rewrite legacy workers.dev paths to the canonical domain (worker still
  // returns the workers.dev URL until WORKER_URL env var is updated)
  url = url.replace('https://ptxprint-mcp.klappy.workers.dev', 'https://ptxprint.klappy.dev');
  let sizeLabel = '—';
  try {
    const h = await fetch(url, { method: 'HEAD' });
    if (h.ok) {
      const len = h.headers.get('content-length');
      if (len) sizeLabel = (parseInt(len, 10) / 1024).toFixed(1) + ' KB';
    } else { termError('PDF HEAD returned HTTP ' + h.status); }
  } catch (e) { termComment('PDF HEAD probe blocked (CORS); iframe load is unaffected.'); }
  document.getElementById('pdf-empty').classList.add('hidden');
  const ifr = document.getElementById('pdf-iframe');
  ifr.src = url;
  ifr.classList.remove('hidden');
  const link = document.getElementById('pdf-link');
  link.href = url;
  link.classList.remove('hidden');
  document.getElementById('pdf-bytes').textContent = sizeLabel + (expected ? ' · ' + expected.label : '');
  document.getElementById('pdf-meta').textContent = (result.cached ? 'cache · hit · ' : 'just rendered · ') + (result.job_id || '').slice(0, 12) + '…';
  termComment('PDF loaded into iframe — see right panel');
}

btnSubmit.addEventListener('click', doSubmit);
btnStatus.addEventListener('click', doStatus);
btnCancel.addEventListener('click', doCancel);
btnTools.addEventListener('click', doToolsList);
btnClear.addEventListener('click', () => { term.innerHTML = ''; });

function refreshPayloadButtons() {
  document.querySelectorAll('.payload-btn').forEach(b => {
    const active = b.dataset.payload === activePayload;
    b.classList.toggle('btn-primary', active);
    b.classList.toggle('btn-ghost', !active);
  });
  document.getElementById('payload-source').href = PAYLOADS[activePayload].source;
}
document.querySelectorAll('.payload-btn').forEach(b => {
  b.addEventListener('click', () => { activePayload = b.dataset.payload; refreshPayloadButtons(); });
});
refreshPayloadButtons();

termWriteHTML(\`<div class="text-paper-mute">[\${ts()}] $ ready · click <span class="text-gilt">submit_typeset</span> to call the live MCP</div>\`);

// 4. docs() live
const docsQ = document.getElementById('docs-q');
const docsGo = document.getElementById('docs-go');
const docsResult = document.getElementById('docs-result');

async function runDocs(query) {
  docsGo.disabled = true;
  docsResult.classList.add('hidden');
  try {
    const t0 = performance.now();
    const out = await ptx.tool('docs', { query, audience: 'headless', depth: 1 });
    const ms = Math.round(performance.now() - t0);
    document.getElementById('docs-stamp').textContent = \`\${ms} ms · governance: \${out.governance_source || 'unknown'}\`;
    document.getElementById('docs-answer').textContent = out.answer || out.error || '(no answer returned)';
    const sources = (out.sources || []).slice(0, 5);
    document.getElementById('docs-sources').innerHTML = sources.length
      ? sources.map(s => \`
          <div class="border border-rule rounded p-3">
            <div class="font-mono text-[11px] text-gilt">\${(s.uri || '').replace(/</g,'&lt;')}</div>
            <div class="text-paper text-[13px] mt-1">\${(s.title || '').replace(/</g,'&lt;')}</div>
            <div class="text-paper-mute text-[12px] mt-1">\${(s.snippet || '').replace(/</g,'&lt;').slice(0, 220)}…</div>
            <div class="folio mt-2">score: \${(+s.score || 0).toFixed(2)}</div>
          </div>\`).join('')
      : '<div class="text-paper-mute font-mono text-[12px]">no sources returned</div>';
    docsResult.classList.remove('hidden');
  } catch (e) {
    document.getElementById('docs-stamp').textContent = 'error';
    document.getElementById('docs-answer').textContent = 'docs query failed: ' + e.message;
    document.getElementById('docs-sources').innerHTML = '';
    docsResult.classList.remove('hidden');
  } finally {
    docsGo.disabled = false;
  }
}
docsGo.addEventListener('click', () => runDocs(docsQ.value));
docsQ.addEventListener('keydown', e => { if (e.key === 'Enter') runDocs(docsQ.value); });
document.querySelectorAll('.docs-suggestion').forEach(b => {
  b.addEventListener('click', () => { docsQ.value = b.dataset.q; runDocs(b.dataset.q); });
});

// 5. Telemetry — PTXprint is the subject; oddkit is the companion.
const SQL_TOP    = \`SELECT tool_name, SUM(_sample_interval) AS calls FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '7' DAY AND tool_name IS NOT NULL AND tool_name != '' GROUP BY tool_name ORDER BY calls DESC LIMIT 5\`;
const SQL_24H    = \`SELECT toStartOfHour(timestamp) AS hour, SUM(_sample_interval) AS calls FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '24' HOUR GROUP BY hour ORDER BY hour ASC\`;
const SQL_7D_TOT = \`SELECT SUM(_sample_interval) AS total FROM oddkit_telemetry WHERE timestamp > NOW() - INTERVAL '7' DAY\`;
const PTX_SQL_TOTAL = \`SELECT SUM(_sample_interval) AS total FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '30' DAY\`;
const PTX_SQL_TOOLS = \`SELECT blob3 AS tool_name, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '30' DAY AND blob1 = 'tool_call' AND blob3 != '' GROUP BY tool_name ORDER BY calls DESC LIMIT 10\`;
const PTX_SQL_24H   = \`SELECT toStartOfHour(timestamp) AS hour, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '24' HOUR GROUP BY hour ORDER BY hour ASC\`;
const PTX_SQL_CONS  = \`SELECT blob4 AS consumer, SUM(_sample_interval) AS calls FROM ptxprint_telemetry WHERE timestamp > NOW() - INTERVAL '30' DAY AND blob4 != '' GROUP BY consumer ORDER BY calls DESC LIMIT 8\`;

function fmt(n) { return Number(n).toLocaleString('en-US'); }
async function runOddkitSQL(sql) { return (await oddkit.tool('telemetry_public', { sql }))?.result?.data; }
async function runPtxSQL(sql)    { return await ptx.tool('telemetry_public', { sql }); }

function renderTopTools(rows) {
  if (!rows.length) { document.getElementById('t-tools').innerHTML = '<div class="text-paper-mute font-mono text-[12px]">no rows</div>'; return; }
  const max = Math.max(...rows.map(r => +r.calls));
  document.getElementById('t-tools').innerHTML = rows.map(r => {
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
  requestAnimationFrame(() => {
    document.querySelectorAll('#t-tools .bar').forEach(el => { el.style.width = el.dataset.w + '%'; });
  });
}

function renderSparkline(values) {
  const w = 600, h = 140, pad = 4;
  const max = Math.max(...values, 1);
  const step = (w - pad*2) / Math.max(values.length - 1, 1);
  const points = values.map((v,i) => \`\${(pad + i * step).toFixed(1)},\${(h - pad - (v / max) * (h - pad*2)).toFixed(1)}\`);
  document.getElementById('spark-poly').setAttribute('points', points.join(' '));
  const area = \`M\${pad},\${h-pad} L\${points.join(' L')} L\${pad + (values.length-1)*step},\${h-pad} Z\`;
  document.getElementById('spark-area').setAttribute('d', area);
  const grid = [];
  for (let i = 0; i < values.length; i++) {
    const x = pad + i * step;
    grid.push(\`<line x1="\${x}" y1="0" x2="\${x}" y2="\${h}" stroke="#3A2F1F" stroke-width="0.5" opacity="0.4"/>\`);
  }
  document.getElementById('spark-grid').innerHTML = grid.join('');
  document.getElementById('t-24h-total').textContent = fmt(values.reduce((a,b)=>a+(+b||0),0)) + ' calls in last 24h';
}

// PTXprint drives the hero numbers, sparkline, tool leaderboard, AND the
// consumer leaderboard. This is the page about THIS server, after all.
async function loadPtxTelemetry() {
  const consumerTarget = document.getElementById('ptx-t-content');
  const stamp          = document.getElementById('ptx-t-stamp');
  const sqlTarget      = document.getElementById('t-sql');
  const sqlStamp       = document.getElementById('t-stamp');

  // Audit panel SQL (always rendered, even before queries return)
  sqlTarget.textContent =
    \`-- ptxprint_telemetry  (the subject — this server)\\n\\n\${PTX_SQL_TOTAL};\\n\\n\${PTX_SQL_24H};\\n\\n\${PTX_SQL_TOOLS};\\n\\n\${PTX_SQL_CONS};\\n\\n-- oddkit_telemetry  (companion — the related canon service)\\n\\n\${SQL_7D_TOT};\\n\\n\${SQL_24H};\\n\\n\${SQL_TOP};\`;

  try {
    const [tot, tools, hourly, consumers] = await Promise.all([
      runPtxSQL(PTX_SQL_TOTAL),
      runPtxSQL(PTX_SQL_TOOLS),
      runPtxSQL(PTX_SQL_24H),
      runPtxSQL(PTX_SQL_CONS),
    ]);

    if (tot?.error || tools?.error) {
      const errMsg = (tot?.error || tools?.error || 'unknown').replace(/</g, '&lt;');
      // Surface the underlying error AND link to the live diagnostic.
      document.getElementById('t-7d').textContent = '!';
      document.getElementById('mini-7d').textContent = '!';
      document.getElementById('t-7d-rate').textContent = 'see diagnostic';
      document.getElementById('t-tools').innerHTML = \`
        <div class="space-y-2">
          <div class="folio text-rubric">! \${errMsg}</div>
          <p class="text-paper-2 text-[12px] leading-relaxed">
            Visit <a href="https://ptxprint.klappy.dev/diagnostics/telemetry"
              target="_blank" rel="noopener" class="text-gilt ed-link font-mono">/diagnostics/telemetry</a>
            for a boolean breakdown of every required env var; or read
            <a href="https://github.com/klappy/ptxprint-mcp/blob/main/DEPLOY.md"
              target="_blank" rel="noopener" class="text-gilt ed-link">DEPLOY.md</a>.
          </p>
        </div>\`;
      consumerTarget.innerHTML = '';
      stamp.textContent = 'error · see diagnostic';
      sqlStamp.textContent = 'error';
      return;
    }

    const totalNum     = +(tot?.rows?.[0]?.total || 0);
    const toolRows     = tools?.rows || [];
    const hourlyRows   = hourly?.rows || [];
    const consumerRows = consumers?.rows || [];
    const hours24      = hourlyRows.reduce((a, r) => a + (+r.calls || 0), 0);

    // Hero numbers — PTXprint's own data
    document.getElementById('t-7d').textContent = fmt(totalNum);
    document.getElementById('mini-7d').textContent = fmt(totalNum);
    document.getElementById('t-7d-rate').textContent = (totalNum / 30).toFixed(0) + ' avg / day · ptxprint events';

    // Big sparkline — PTXprint's 24h hourly buckets
    renderSparkline(hourlyRows.map(r => +r.calls));

    // Tool leaderboard — PTXprint's tool_call counts
    renderTopTools(toolRows);

    // Consumer leaderboard — who is identifying themselves to this server
    const maxCons = Math.max(...consumerRows.map(r => +r.calls), 1);
    consumerTarget.innerHTML = consumerRows.length
      ? \`<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          \${consumerRows.map(r => {
            const pct = (+r.calls / maxCons * 100).toFixed(0);
            const verified = (r.consumer === 'ptxprint-mcp-homepage' || r.consumer === 'bt-servant-worker');
            return \`
              <div class="border \${verified ? 'border-gilt/60' : 'border-rule'} rounded p-3 bg-ink/40">
                <code class="text-[11px] \${verified ? 'text-gilt' : 'text-paper'} truncate block">\${r.consumer}</code>
                <div class="counter text-paper text-[24px] mt-1">\${fmt(r.calls)}</div>
                <div class="h-1 bg-ink mt-2 rounded-sm overflow-hidden">
                  <div style="width:\${pct}%; height:100%; background:\${verified ? '#D9A93E' : '#8A7E66'};"></div>
                </div>
              </div>\`;
          }).join('')}
        </div>
        <div class="folio text-paper-mute mt-3">
          \${consumerRows.length} labeled consumers · gold = identified via x-ptxprint-client header · grey = inferred from User-Agent
        </div>\`
      : '<div class="text-paper-mute font-mono text-[12px]">no labeled consumers yet — be the first by setting x-ptxprint-client</div>';

    stamp.textContent = \`live · \${new Date().toLocaleTimeString()} · \${fmt(totalNum)} events in 30d\`;
    sqlStamp.textContent = 'live · queried ' + new Date().toLocaleTimeString();
  } catch (e) {
    consumerTarget.innerHTML = \`<div class="text-rubric font-mono text-[12px]">! \${e.message}</div>\`;
    stamp.textContent = 'error';
  }
}
loadPtxTelemetry();
setInterval(loadPtxTelemetry, 60000);

// Companion view — oddkit data, smaller, tucked behind a details disclosure.
// This is contextual ("here's what's happening on the related canon service")
// but does not lead the page.
async function loadOddkitCompanion() {
  const target = document.getElementById('oddkit-companion');
  try {
    const [tot, top] = await Promise.all([ runOddkitSQL(SQL_7D_TOT), runOddkitSQL(SQL_TOP) ]);
    const totalNum = +(tot?.data?.[0]?.total || 0);
    const rows = (top?.data || []).slice(0, 5);
    const max = Math.max(...rows.map(r => +r.calls), 1);
    target.innerHTML = \`
      <div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 md:col-span-4">
          <div class="folio mb-1">oddkit canon ops · 7d</div>
          <div class="counter text-paper-2 text-[42px] leading-none">\${fmt(totalNum)}</div>
          <div class="folio text-paper-mute mt-1">\${(totalNum / 7).toFixed(0)} avg / day</div>
          <div class="text-paper-mute text-[11px] mt-3 leading-relaxed">
            For context: this is the related <a href="https://oddkit.klappy.dev"
              target="_blank" rel="noopener" class="text-gilt ed-link">canon-retrieval service</a>
            an agent uses alongside ptxprint MCP. Vodka architecture: knowing &amp; doing on separate servers.
          </div>
        </div>
        <div class="col-span-12 md:col-span-8">
          <div class="folio mb-3">top oddkit actions · 7d</div>
          <div class="space-y-1.5">
            \${rows.map(r => {
              const w = (+r.calls / max * 100).toFixed(0);
              return \`
                <div class="flex items-center gap-3">
                  <code class="text-[11px] text-paper-mute w-32 shrink-0">\${r.tool_name}</code>
                  <div class="flex-1 h-3 bg-ink/60 rounded-sm overflow-hidden border border-rule/40">
                    <div style="width:\${w}%; height:100%; background:#8A7E66;"></div>
                  </div>
                  <code class="text-[11px] text-paper-mute w-12 text-right tabular-nums">\${fmt(r.calls)}</code>
                </div>\`;
            }).join('')}
          </div>
        </div>
      </div>\`;
  } catch (e) {
    target.innerHTML = \`<div class="text-rubric font-mono text-[12px]">! \${e.message}</div>\`;
  }
}
loadOddkitCompanion();
setInterval(loadOddkitCompanion, 60000);

// 6. telemetry_policy
async function loadPolicy() {
  const target = document.getElementById('policy-summary');
  try {
    const out = await ptx.tool('telemetry_policy', {});
    const headers = out.self_report_headers || {};
    const chain = out.fallback_chain || [];
    const sentCount = Object.keys(headers).filter(k => SELF_REPORT_HEADERS[k] !== undefined).length;
    target.innerHTML = \`
      <div class="mb-4">
        <div class="folio mb-2">policy URI</div>
        <code class="text-gilt text-[12px] font-mono">\${(out.policy_uri || '—').replace(/</g,'&lt;')}</code>
        <span class="folio text-paper-mute ml-3">tier: \${out.governance_source || '—'}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div class="folio mb-2">self-report headers (this page sends \${sentCount}/\${Object.keys(headers).length})</div>
          <div class="space-y-1">
            \${Object.entries(headers).map(([k, desc]) => {
              const sent = SELF_REPORT_HEADERS[k] !== undefined;
              return \`<div class="text-[12px] flex items-baseline gap-2">
                <span class="\${sent ? 'text-sap' : 'text-paper-mute'} font-mono">\${sent ? '✓' : '·'}</span>
                <code class="font-mono \${sent ? 'text-paper' : 'text-paper-mute'}">\${k}</code>
              </div>\`;
            }).join('')}
          </div>
        </div>
        <div>
          <div class="folio mb-2">policy fallback chain</div>
          <div class="space-y-2">
            \${chain.map((tier, i) => \`
              <div class="text-[12px]">
                <span class="font-mono \${tier.tier === out.governance_source ? 'text-gilt' : 'text-paper-mute'}">\${i+1}. \${tier.tier}</span>
                <div class="text-paper-mute font-mono text-[11px] pl-5 break-all">\${(tier.source || '').replace(/</g,'&lt;')}</div>
              </div>\`).join('')}
          </div>
        </div>
      </div>\`;
  } catch (e) {
    target.innerHTML = \`<div class="text-rubric font-mono text-[12px]">! \${e.message}</div>\`;
  }
}
loadPolicy();
</script>

</body>
</html>
`;
