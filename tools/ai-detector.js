// ── Tokenization ─────────────────────────────────────────────

function sentences(text) {
  return text.replace(/([.!?])[ \t\n]+/g, "$1|SPLIT|").split("|SPLIT|").map(s => s.trim()).filter(s => s.length > 5);
}

function words(text) {
  return text.toLowerCase().replace(/[^a-z \t\n'-]/g, "").split(/[ \t\n]+/).filter(w => w.length > 0);
}

function syllables(word) {
  word = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function paragraphs(text) {
  return text.split(/\n[ \t]*\n/).map(p => p.trim()).filter(p => p.length > 10);
}

// ── Statistics ───────────────────────────────────────────────

function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function std(a) { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }
function cv(a) { const m = mean(a); return m ? std(a) / m : 0; }
function clamp(v) { return Math.max(0, Math.min(1, v)); }

// ── Signals ──────────────────────────────────────────────────

function burstiness(text) {
  const sents = sentences(text);
  if (sents.length < 3) return 0.5;
  const c = cv(sents.map(s => words(s).length));
  return clamp(1.15 - c * 1.75);
}

function vocabulary(text) {
  const w = words(text);
  if (w.length < 20) return 0.5;
  const freq = new Map();
  for (const word of w) freq.set(word, (freq.get(word) || 0) + 1);
  const ttr = freq.size / w.length;
  const expected = 0.8 * Math.pow(w.length, -0.15);
  let hapax = 0;
  for (const c of freq.values()) if (c === 1) hapax++;
  const ttrScore = clamp(1.3 - (ttr / expected) * 0.8);
  const hapaxScore = clamp(1.1 - (hapax / freq.size) * 1.5);
  return ttrScore * 0.6 + hapaxScore * 0.4;
}

function zipf(text) {
  const w = words(text);
  if (w.length < 50) return 0.5;
  const freq = new Map();
  for (const word of w) freq.set(word, (freq.get(word) || 0) + 1);
  const sorted = [...freq.values()].sort((a, b) => b - a);
  const n = Math.min(sorted.length, 30);
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.log(i + 1), y = Math.log(sorted[i]);
    sx += x; sy += y; sxy += x * y; sx2 += x * x;
  }
  const d = n * sx2 - sx * sx;
  const slope = d ? (n * sxy - sx * sy) / d : 0;
  const intercept = (sy - slope * sx) / n;
  const my = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.log(i + 1), y = Math.log(sorted[i]);
    ssTot += (y - my) ** 2;
    ssRes += (y - slope * x - intercept) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return clamp((r2 - 0.75) * 4) * 0.7;
}

const AI_PHRASES = [
  "it's important to note", "it is important to note", "it's worth noting", "it is worth noting",
  "in today's world", "in today's digital", "in conclusion", "additionally", "furthermore", "moreover",
  "delve into", "delve deeper", "it's crucial", "it is crucial", "navigating the", "landscape of",
  "in the realm of", "comprehensive guide", "game-changer", "game changer", "unlock the power",
  "harness the power", "leverage the", "at the end of the day", "shed light on", "in this article",
  "let's explore", "let us explore", "dive into", "deep dive", "seamlessly", "cutting-edge",
  "cutting edge", "revolutionize", "paradigm shift", "robust and", "and robust", "meticulous",
  "meticulously", "tapestry of", "a testament to", "elevate your", "ever-evolving", "in the ever",
  "plays a crucial role", "plays a pivotal role", "stands as a", "serves as a", "whether you're a",
  "embark on", "foster a", "fostering", "underscores", "multifaceted", "nuanced",
];

function aiPhrases(text) {
  const lower = text.toLowerCase();
  const wc = words(text).length;
  if (wc < 20) return 0.5;
  let hits = 0;
  for (const p of AI_PHRASES) {
    const m = lower.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"));
    if (m) hits += m.length;
  }
  return clamp((hits / wc) * 100 * 1.2);
}

function punctuation(text) {
  if (text.length < 100) return 0.5;
  const chars = text.match(/[.,;:!?()"\-]/g) || [];
  if (!chars.length) return 0.6;
  const counts = {};
  for (const c of chars) counts[c] = (counts[c] || 0) + 1;
  const unique = Object.keys(counts).length;
  const basicRatio = ((counts["."] || 0) + (counts[","] || 0)) / chars.length;
  return clamp(1.1 - unique * 0.1) * 0.4 + clamp((basicRatio - 0.5) * 2) * 0.6;
}

function paragraphUniformity(text) {
  const p = paragraphs(text);
  if (p.length < 3) return 0.5;
  return clamp(0.9 - cv(p.map(x => words(x).length)) * 1.5);
}

const TRANSITIONS = [
  "however", "therefore", "furthermore", "moreover", "additionally", "consequently",
  "nevertheless", "nonetheless", "meanwhile", "subsequently", "in addition", "as a result",
  "on the other hand", "in contrast", "for instance", "for example", "in particular",
  "specifically", "similarly", "likewise",
];

function transitions(text) {
  const lower = text.toLowerCase();
  const wc = words(text).length;
  if (wc < 50) return 0.5;
  let count = 0;
  for (const t of TRANSITIONS) {
    const m = lower.match(new RegExp(`(?:^|[ ,.;:!?])${t}(?:$|[ ,.;:!?])`, "gi"));
    if (m) count += m.length;
  }
  return clamp((count / wc * 100 - 0.3) * 1.2);
}

function readability(text) {
  const s = sentences(text), w = words(text);
  if (s.length < 2 || w.length < 30) return 0.5;
  const fre = 206.835 - 1.015 * (w.length / s.length) - 84.6 * (w.reduce((a, x) => a + syllables(x), 0) / w.length);
  return clamp(0.8 - Math.abs(fre - 50) * 0.015);
}

function wordLengths(text) {
  const w = words(text);
  if (w.length < 30) return 0.5;
  const lens = w.map(x => x.length), m = mean(lens), s = std(lens);
  const n = lens.length;
  const skew = (n / ((n - 1) * (n - 2))) * lens.reduce((a, l) => a + ((l - m) / s) ** 3, 0);
  return clamp(0.8 - Math.abs(skew) * 0.6);
}

function repetition(text) {
  const sents = sentences(text);
  if (sents.length < 5) return 0.5;
  const starters = sents.map(s => words(s).slice(0, 2).join(" "));
  const freq = new Map();
  for (const s of starters) freq.set(s, (freq.get(s) || 0) + 1);
  let rep = 0;
  for (const c of freq.values()) if (c > 1) rep += c - 1;
  const w = words(text);
  const tri = new Map();
  for (let i = 0; i < w.length - 2; i++) {
    const t = `${w[i]} ${w[i+1]} ${w[i+2]}`;
    tri.set(t, (tri.get(t) || 0) + 1);
  }
  let triRep = 0;
  for (const c of tri.values()) if (c > 2) triRep += c - 2;
  return clamp(rep / sents.length * 3) * 0.6 + clamp(triRep / w.length * 10) * 0.4;
}

// ── Analysis engine ──────────────────────────────────────────

const SIGNALS = [
  { name: "burstiness",    fn: burstiness,          weight: 0.15 },
  { name: "vocabulary",    fn: vocabulary,           weight: 0.08 },
  { name: "zipf",          fn: zipf,                 weight: 0.06 },
  { name: "aiPhrases",     fn: aiPhrases,            weight: 0.22 },
  { name: "punctuation",   fn: punctuation,          weight: 0.05 },
  { name: "paragraphs",    fn: paragraphUniformity,  weight: 0.10 },
  { name: "transitions",   fn: transitions,          weight: 0.15 },
  { name: "readability",   fn: readability,          weight: 0.05 },
  { name: "wordLengths",   fn: wordLengths,          weight: 0.05 },
  { name: "repetition",    fn: repetition,           weight: 0.09 },
];

function analyze(text) {
  const results = {};
  let wSum = 0, wTotal = 0;
  for (const { name, fn, weight } of SIGNALS) {
    const score = fn(text);
    results[name] = +(score * 100).toFixed(1);
    wSum += score * weight;
    wTotal += weight;
  }
  const probability = +(clamp(wSum / wTotal) * 100).toFixed(1);
  let verdict;
  if (probability < 30) verdict = "LIKELY HUMAN";
  else if (probability < 50) verdict = "PROBABLY HUMAN";
  else if (probability < 70) verdict = "UNCERTAIN";
  else if (probability < 85) verdict = "PROBABLY AI";
  else verdict = "LIKELY AI";

  const w = words(text), s = sentences(text);
  return { probability, verdict, words: w.length, sentences: s.length, paragraphs: paragraphs(text).length, signals: results };
}

// ── CortexOne handler ────────────────────────────────────────

function cortexone_handler(event, context) {
  const text = event.text;

  if (!text || typeof text !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "\"text\" field is required and must be a string" }),
    };
  }

  if (text.trim().length < 50) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Text must be at least 50 characters for reliable analysis" }),
    };
  }

  const result = analyze(text);

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

