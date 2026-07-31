---
name: infrastructure-moat
description: Rigorous 4-stage SOP for analyzing infrastructure moat stocks. v3.0: Adds deep qualitative analysis (patents, scientific papers, physics, manufacturing processes), P/E valuation context, and dip/crash preference. Quantitative screen now feeds INTO qualitative deep-moat-audit. Designed for concentrated high-conviction portfolios (4-6 positions).
license: MIT
compatibility: opencode
metadata:
  sop_version: "3.0"
  last_updated: "2026-07-03"
  criteria:
    fcf_yield_contextual: "Depends on sector and growth phase — not a kill threshold"
    roic_min: 10
    ebitda_margin_min: 10
    revenue_growth_qoq_min: 5
    market_cap_min_b: 150
    pe_max_guideline: 50
    dip_preference: "Prefer candidates >10% below 52-week high"
---

# Infrastructure Moat Analyzer — 4-Stage SOP v3.0

## Overview

**v3.0 Philosophy: Quantitative excellence is necessary but not sufficient.** A company with great FCF yield and ROIC but a patent portfolio about to expire in 18 months is a value trap dressed in quality metrics. A company with low FCF but 35 patents on a physics-level manufacturing process that competitors have spent 10 years failing to replicate — that's a moat.

**v3.0 adds a NEW Step 2.5: Deep Qualitative Moat Audit.** This is now MANDATORY for any stock receiving a BUY recommendation. The quantitative screen (Steps 0-2) finds candidates. The qualitative audit (Step 2.5) validates the moat. Steps 3-4 assess supply chain and macro resilience.

### The v3.0 Funnel:
```
DYNAMIC DISCOVERY (browser — no hardcoded tickers)
    │
    ▼
Step 0: SECULAR TREND IDENTIFICATION (Macro context first)
    │
    ▼
Step 1: QUANTITATIVE SCREEN (0-40 pts, no auto-kill)
    │  Revenue growth, FCF trajectory, ROIC, EBITDA, P/E, dip context
    │
    ▼
Step 2: QUALITATIVE MOAT AUDIT (0-40 pts) ← NEW in v3.0
    │  2A: Patent Landscape (0-10)
    │  2B: Scientific Foundation (0-10)
    │  2C: Manufacturing Moat (0-10)
    │  2D: Competitive Technology Position (0-10)
    │
    ▼
Step 3: VALUATION CONTEXT ← NEW in v3.0
    │  P/E vs sector, P/E vs history, dip/crash detection
    │
    ▼
Step 4: SUPPLY CHAIN & MACRO RESILIENCE
    │  Manufacturing dependency, geopolitical risk, customer concentration
    │
    ▼
QUANT + QUAL RECONCILIATION → Both must agree for BUY recommendation
```

## The Universe

**v3.0: NO HARDCODED TICKER LISTS.** The universe is dynamically discovered from live market data:

1. **Browser → companiesmarketcap.com** — scrape largest companies by sector
2. **Browser → Yahoo Finance screeners** — filter by market cap >$150B
3. **Fallback: Wikipedia indices + Brave Search** — only if browser fails

Filter to sectors relevant to physical infrastructure:

| INCLUDE (infrastructure sectors) | EXCLUDE |
|----------------------------------|---------|
| Semiconductors & Equipment | Consumer brands / luxury |
| Data Center & Networking | Pure financials (banks, insurance) |
| Energy Infrastructure | Media / advertising / streaming |
| Mining & Commodities | Social media |
| Industrial Automation & Electrical | Pure software / SaaS |
| Railways & Transportation | Retail / consumer goods |
| Defense & Aerospace | Healthcare / pharma (unless diagnostic equipment) |
| Telecom & Tower Infrastructure | Gaming |
| Battery & EV Supply Chain | Food & beverage |
| Industrial Gases & Chemicals | — |
| Nuclear / Advanced Energy | — |
| Water & Environmental Infrastructure | — |
| **Robotics & Physical AI** (v3.2 NEW) | — |
| **Edge Compute / Inference Hardware** (v3.2 NEW) | — |
| **Industrial IoT / Telemetry Platforms** (v3.2 NEW) | — |
| **Autonomous Systems & Fleet Operators** (v3.2 NEW) | — |

---

## Step 0: Secular Trend Identification (NEW in v2.0, enhanced in v3.0)

**⚠️ Search Resilience (v3.1):** When browser-navigating to Google for trend research, expect captcha blocks. If Google blocks you, immediately switch to Bing (`https://www.bing.com/search?q=[query]`) or DuckDuckGo. Direct URLs (Yahoo Finance sector performance, CompaniesMarketCap.com, Wikipedia) rarely block headless browsers — try these before any fallback to `webfetch`. Never waste more than 2 recovery attempts fighting Google's captcha.

**Run BEFORE quantitative screen. Identifies which macro themes matter RIGHT NOW.**

### Active Secular Mega-Trends (update continuously):

| Trend | Sectors | Why It Matters |
|-------|---------|----------------|
| **Physical AI / Robotics Deployment** 🔥 (v3.2 NEW — DOMINANT) | Robotics, industrial automation, edge sensors, manufacturing equipment | AGI is no longer a research race — it's a DEPLOYMENT race. Whoever deploys the most physical AI endpoints (robots, edge devices, sensors) builds the data flywheel that feeds Tier 2/3 metacognitive emergence. Inference costs → zero; the bottleneck shifts from compute to TELEMETRY. Companies deploying robots at scale (Tesla Optimus, Figure, Agility, Amazon warehouse bots, Chinese industrial robots) are building the moats of the next decade. |
| **Data Flywheel Ownership** 🔥 (v3.2 NEW — TIED TO PHYSICAL AI) | Robotics fleets, autonomous vehicles, industrial IoT, smart manufacturing | The decisive moat of the AGI era: models that curate their own training data by critiquing, filtering, and reweighting telemetry streams from physical deployment (Autonomous Telemetry Critique Loops — Tier 3). Failures become the highest-leverage teachers. Whoever owns the richest real-world action-outcome data lake wins. This is a deeper moat than patents or manufacturing process — it compounds with every deployed unit. |
| **Edge Compute & Inference Commoditization** (v3.2 NEW) | Edge AI chips, inference accelerators, low-power compute, on-device ML | Inference costs are racing toward zero (1-bit ternary, quantized FP16, optimized backpropagation variants). The hardware layer is being commoditized. Value shifts from "who makes the best training GPU" to "who deploys the most inference endpoints at the edge." Jevons paradox: cheaper inference → exponentially more inference → different winners than training. |
| **US-China AI Decoupling** (v3.2 NEW — GEOPOLITICAL) | Two separate AI supply chains, two deployment ecosystems | The AI race is splitting into two independent ecosystems: US-led (frontier models + Western robotics) vs China-led (manufacturing scale + state-directed deployment). China's structural advantage in physical manufacturing creates a deployment speed edge. US companies must find manufacturing partners or lose the physical AI race. This creates winners AND losers on BOTH sides. |
| **AI Infrastructure Buildout** | Semis, data centers, networking, power | Hyperscalers $300B+/yr CapEx. Every data center needs chips, networking, and power. BUT: as inference commoditizes, the nature of infrastructure demand shifts from training clusters to edge deployment. |
| **Electrification / Grid Modernization** | Electrical equipment, transformers, switchgear | Global grid investment doubling by 2030. 100+ week lead times on transformers. Physical AI deployment = massive new baseload demand. |
| **Defense / Geopolitical Rearmament** | Aerospace, defense, shipbuilding | NATO spending at Cold War levels. AI-driven autonomous systems are the new arms race. |
| **Energy Security / LNG** | LNG, pipelines, gas processing | European gas decoupling is structural. LNG demand +65% by 2050. Energy to power the physical AI revolution. |
| **Nuclear Renaissance** | SMR, uranium, nuclear services | AI data centers + physical deployment require 24/7 baseload. SMR orders beginning. |

### How to Use This Step:
1. For each stock, determine: **Is this company a direct beneficiary of a verified secular mega-trend?**
2. If YES: Growth metrics weighted higher. Low FCF is contextual (reinvestment). P/E tolerance slightly expanded.
3. If NO: Must win on standalone quality and valuation. Stricter value metrics apply.
4. **CITE SPECIFIC EVIDENCE:** Hyperscaler CapEx guidance, industry backlog data, government policy, segment revenue breakdown.
5. **v3.2 DEPLOYMENT FLYWHEEL CHECK (NEW):** For any company claiming AI exposure, ask: "Is this company feeding a data flywheel from PHYSICAL DEPLOYMENT, or just selling compute?" Companies selling compute into an increasingly commoditized layer are at risk of margin compression. Companies generating telemetry from physical deployment are building compounding moats. This distinction is THE key investment framework shift described in the document.

---

## Step 1: Quantitative Screen v3.0 (Score 0-40)

**Methodology: Extends the catalyst-detector skill's quantitative scoring (see `skills/catalyst-detector/SKILL.md`). Below are infrastructure-specific scoring tiers and sector context. For the general 0-40 scoring framework, cross-source verification requirements, and python implementation, see the catalyst-detector skill. What follows is infrastructure-tuned scoring with sector-specific thresholds.**

### Quantitative Scoring Rubric:

#### 1A. Growth (0-12 points)
| Metric | Threshold | Points |
|--------|-----------|--------|
| Revenue Growth YoY | >50% | 10 |
| Revenue Growth YoY | >30% | 8 |
| Revenue Growth YoY | >15% | 5 |
| Revenue Growth YoY | >5% | 3 |
| Revenue Growth YoY | >0% | 1 |
| Revenue ACCELERATING QoQ (bonus) | Growth rate increasing | +2 |

#### 1B. Profitability (0-8 points)
| Metric | Threshold | Points |
|--------|-----------|--------|
| ROIC | >50% | 4 |
| ROIC | >25% | 3 |
| ROIC | >15% | 2 |
| ROIC | >10% | 1 |
| EBITDA Margin | >40% | 4 |
| EBITDA Margin | >25% | 3 |
| EBITDA Margin | >15% | 2 |
| EBITDA Margin | >10% | 1 |

#### 1C. Valuation / Dip Context (0-12 points)
| Metric | Threshold | Points |
|--------|-----------|--------|
| Trailing P/E | <15 | 6 |
| Trailing P/E | <20 | 5 |
| Trailing P/E | <25 | 3 |
| Trailing P/E | <35 | 1 |
| Trailing P/E | >50 | -2 (penalty) |
| Trailing P/E | >100 | -4 (penalty) |
| % Below 52-week high | >25% below | 4 |
| % Below 52-week high | >15% below | 2 |
| % Below 52-week high | >5% below | 1 |

#### 1D. Momentum / Sentiment (0-5 points)
| Metric | Threshold | Points |
|--------|-----------|--------|
| Short float | >20% | 3 |
| Short float | >10% | 1 |
| Price below analyst consensus | Yes | 2 |
| Price above analyst consensus | Yes | -2 |

#### 1E. Quality / FCF Context (0-3 points)
| Metric | Threshold | Points |
|--------|-----------|--------|
| FCF Yield | >3% | 3 |
| FCF Yield | >1.5% | 2 |
| FCF Yield | >0.5% | 1 |

**Note:** Low FCF yield is NOT penalized (v2.0 backtest lesson). It's contextual — companies in secular trends reinvest cash for growth.

**Total: 0-40 points.** Top 20-30 by score advance to Step 2.

### Data Source (v3.2 RESEARCH-HEAVY):

**🔥 MANDATORY: Every quantitative data point must be verified against 3+ sources. Never trust a single yfinance call.**

1. **Primary pull (Python/yfinance):** Pull ALL metrics listed below. But yfinance is ONLY the starting point.
2. **SEC cross-check (MANDATORY):** For every stock, verify revenue, net income, FCF, and EBITDA against the LATEST 10-K or 10-Q on SEC EDGAR. If yfinance and SEC data diverge >3%, use SEC data.
3. **Competitor pull (MANDATORY):** Pull same metrics for top 2-3 competitors. Is this company outperforming or just riding industry tailwinds?
4. **Historical context (MANDATORY):** Pull 5 years of annual data + 6 quarters of quarterly data — not just snapshot. Compute trends, not just levels.
5. **Earnings call verification (MANDATORY):** Read latest earnings call transcript for revenue guidance, one-time items, segment commentary.
```python
import yfinance as yf
stock = yf.Ticker("TICKER")
info = stock.info

# Core metrics
mc = info.get("marketCap")
fcf = info.get("freeCashflow")
ni = info.get("netIncomeToCommon")
ebitda = info.get("ebitda")
rev = info.get("totalRevenue")
debt = info.get("totalDebt") or 0
cash = info.get("totalCash") or 0
equity = info.get("stockholdersEquity") or info.get("bookValue") or 0
pe = info.get("trailingPE")
fpe = info.get("forwardPE")
peg = info.get("pegRatio")
pb = info.get("priceToBook")

# Growth (v3.0: check acceleration, not just level)
rev_growth = info.get("revenueGrowth")
earn_growth = info.get("earningsGrowth")

# Valuation context
price = info.get("currentPrice") or info.get("regularMarketPrice")
high_52w = info.get("fiftyTwoWeekHigh")
low_52w = info.get("fiftyTwoWeekLow")
target_mean = info.get("targetMeanPrice")
short_float = info.get("shortPercentOfFloat")

# Key ratios
fy = round(fcf / mc * 100, 2) if (fcf and mc) else None
ebitda_m = round(ebitda / rev * 100, 1) if (ebitda and rev) else None
pct_from_high = round((price - high_52w) / high_52w * 100, 1) if price and high_52w else None

if ni and equity:
    ic = equity + debt - cash
    roic = round(ni / ic * 100, 1) if ic > 0 else None
else:
    roic = None

# Acceleration check: pull last 4 quarters
try:
    qf = stock.quarterly_financials
    q_revs = []
    for i in range(min(4, len(qf.columns))):
        col = qf.columns[i]
        r = qf.loc["Total Revenue", col] if "Total Revenue" in qf.index else None
        if r: q_revs.append(float(r))
    rev_accelerating = len(q_revs) >= 4 and (
        (q_revs[0] - q_revs[1]) / abs(q_revs[1]) > (q_revs[2] - q_revs[3]) / abs(q_revs[3])
    ) if all(q_revs) else False
except:
    rev_accelerating = False
```

### Output Format (Step 1):
```
| Ticker | Name | Quant | P/E | RevG% | ROIC% | EB% | FY% | FromHi% | Short% | Accel? |
|--------|------|-------|-----|-------|-------|-----|-----|---------|--------|--------|
| XXXX | ... | 32/40 | 18.5 | +45% | 62.7 | 48.3 | 0.85 | -8.2% | 5.2% | YES |
```

---

## Step 2: Qualitative Moat Audit v3.2 (Score 0-50)

**Methodology: Delegated to @deep-moat-auditor. The deep-moat-auditor agent (see `agents/deep-moat-auditor.md`) performs the full 5-dimension qualitative audit (Patent, Science, Mfg, Competitive, Data Flywheel). This skill provides infrastructure-specific scoring context — use the deep-moat-auditor's standardized output format and scoring scale (0-50).**

#### Source 1: Patent Landscape → Google Patents / USPTO
- What are the 3-5 most cited patents this company owns?
- When do their core patents expire? Is there a patent cliff approaching?
- Who is citing their patents? (Reveals who's trying to work around them)
- Have they filed NEW patents recently that extend their moat?
- Are competitors filing patents that could circumvent their moat?

#### Source 2: Scientific Papers → arXiv, IEEE Xplore, Google Scholar
- What are the seminal papers in this technology domain?
- Is the company's approach backed by published research?
- Are there papers describing superior approaches from competitors?
- What does the latest research say about the technology's physical limits?
- Are there breakthrough papers that could obsolete this technology?

#### Source 3: Technology Physics → IEEE Spectrum, SemiEngineering, Wikipedia technical articles
- How does the technology actually WORK at the physics level?
- What are the fundamental physical constraints? (thermal, power, materials, quantum effects)
- Why can't competitors replicate this? Is it physics, process know-how, or just capital?
- Is the technology on an S-curve that's about to flatten?

#### Source 4: Competitive Technology → Competitor IR pages, benchmarks, analyst tech notes
- What is the competitor's technical approach, and how does it differ?
- Is the competitor ahead, behind, or parallel on the technology roadmap?
- Has the competitor published benchmarks or performance comparisons?
- Are there startup challengers with novel approaches?

#### Source 5: Manufacturing Process → SemiEngineering, trade journals, company technical docs
- What is the manufacturing process, and why is it hard to replicate?
- What are the key equipment dependencies? (Who makes the machines that make their machines?)
- What is the yield learning curve? How long to reach competitive yields?
- What raw materials or rare elements are required? Who controls them?

### Qualitative Scoring Rubric (0-50 — v3.2: was 0-40, added Data Flywheel dimension):

#### 2A: Patent Landscape (0-10)
| Score | Definition |
|-------|-----------|
| 10 | Single-vendor monopoly. Multiple blocking patents with 10+ year duration. Competitors actively paying licensing fees. Citation network shows industry dependence. |
| 8 | Strong IP position. Key patents with 5-10 year duration. Some licensing revenue. Competitors need workarounds that degrade performance. |
| 6 | Moderate IP. Patents exist but some expiring within 3-5 years. Competitors have partial workarounds. |
| 4 | Weak IP. Patents are narrow or easily circumvented. Expiration imminent. |
| 2 | Minimal patent protection. Trade secrets only. |
| 0 | No IP moat. Commodity business. |

#### 2B: Scientific Foundation (0-10)
| Score | Definition |
|-------|-----------|
| 10 | Technology grounded in fundamental physics with well-understood limits. Company's approach is validated by peer-reviewed research. No known alternative physics that could disrupt. |
| 8 | Strong scientific foundation. Some physical limits known but still 5+ years out. |
| 6 | Moderate foundation. Technology works but physics understanding is empirical rather than fundamental. |
| 4 | Weak foundation. Technology is "black box" with no peer-reviewed validation. |
| 2 | Questionable science. Claims contradict established physics. |
| 0 | Pseudoscience or unsupported claims. |

#### 2C: Manufacturing Moat (0-10)
| Score | Definition |
|-------|-----------|
| 10 | Process requires $10B+ and 5-10 years to replicate. Single-source equipment. Yield learning curve is the moat. |
| 8 | $1-10B and 3-5 years to replicate. Limited equipment sources. |
| 6 | $100M-1B and 1-3 years to replicate. Equipment is commercially available. |
| 4 | <$100M to replicate. Process is well-understood. |
| 2 | Standard manufacturing. Contract manufacturers available. |
| 0 | No manufacturing — pure services/software. |

#### 2D: Competitive Technology Position (0-10)
| Score | Definition |
|-------|-----------|
| 10 | Unchallenged technology leader. Competitors are 1-2 generations behind. Customers cannot switch without major performance degradation. |
| 8 | Clear leader but competitors 1 generation behind. Switching costs high but not prohibitive. |
| 6 | Among leaders but competitors at parity on some dimensions. |
| 4 | Middle of pack. Technology is comparable to competitors. |
| 2 | Lagging behind. Competitors have superior technology. |
| 0 | Obsolete technology being displaced. |

### 2E: Data Flywheel Moat (0-10) 🔥 NEW in v3.2

**This dimension did not exist in v3.1. It is the core contribution of the deployment flywheel thesis: the AGI era's deepest moat is not patents, manufacturing, or even current technology leadership — it's the ownership of a real-world data flywheel that compounds with every deployed unit.**

The document establishes that Tier 3 AGI emergence requires Autonomous Telemetry Critique Loops: models that curate, filter, critique, and reweight their own training data from real-world deployment. The company that owns the richest action-outcome telemetry lake wins the AGI race. This moat compounds geometrically with scale — every additional deployed unit makes the model smarter, which makes the units more capable, which drives more deployment.

| Score | Definition |
|-------|-----------|
| 10 | **Closed-loop autonomous data flywheel.** The company deploys physical AI endpoints (robots, autonomous vehicles, industrial sensors) that generate real-world action-outcome telemetry. This telemetry feeds model improvement, which improves deployment performance, which accelerates deployment. The flywheel is self-sustaining (Tier 3: models curate their own training data). Examples: Tesla FSD telemetry fleet (millions of vehicles), Amazon warehouse robot fleet, Chinese industrial robot deployments at scale. Competitors cannot replicate this without matching the physical deployment base — a 5-10 year, $100B+ barrier. |
| 8 | **Strong data flywheel with growing deployment.** Company has significant physical deployment generating telemetry, but the critique/curation loop is not yet fully autonomous (still human-in-the-loop for data engineering). Deployment base is expanding rapidly. 3-5 year lead on competitors. |
| 6 | **Emerging data flywheel.** Physical deployment is underway but at smaller scale. Telemetry is being collected but not yet driving autonomous model improvement. 1-3 year lead. |
| 4 | **Telemetry collection without closed loop.** Company has sensors/deployments generating data, but no mechanism to feed it back into model improvement. Data lake exists but is stagnant. |
| 2 | **No physical deployment.** Company sells into AI infrastructure but generates zero proprietary telemetry. Dependent on customers' data flywheels. |
| 0 | **Pure compute/software play.** Company sells tools, chips, or services into the AI ecosystem but owns no data flywheel. Value is at risk of commoditization as inference costs → zero. |

**Data Flywheel Detection Protocol (NEW):**
1. **Deployment base:** How many physical units are deployed? (Robots, vehicles, sensors, edge devices). Count matters — the flywheel compounds with nodes.
2. **Telemetry richness:** What data does each unit generate? (Video, force-torque, task outcomes, human overrides, natural language feedback). Richer telemetry = more leverage for Tier 2/3 abstraction.
3. **Closed-loop status:** Is the data flowing BACK into model improvement? Is there a Critique-Reweight-Replay (CRR) pipeline? Or is data just being stored?
4. **Compounding rate:** Is each additional deployed unit making ALL units smarter? (Network effects in the physical world — the Fleet Learning effect).
5. **Competitive gap:** How many years and billions would it take a competitor to match this deployment base?

**Total Qualitative Moat Score (v3.2): 0-50 (was 0-40 in v3.0/3.1)**

| Score | Moat Durability |
|-------|----------------|
| 38-50 | 🟢 DURABLE — 10+ year moat, physics-level barriers + data flywheel |
| 25-37 | 🟡 MODERATE — 3-7 year moat, process/scale barriers |
| 12-24 | 🟠 WEAK — 1-3 year moat, mostly capital barriers |
| <12 | 🔴 NO MOAT — Commodity business, no durable advantage |

### Qualitative Audit Output Format:
```
| Ticker | Patent | Science | Mfg | Competitive | TOTAL | Durability |
|--------|--------|---------|-----|-------------|-------|------------|
| XXXX | 9/10 | 8/10 | 9/10 | 9/10 | 35/40 | 🟢 DURABLE |
| YYYY | 4/10 | 3/10 | 6/10 | 5/10 | 18/40 | 🟠 WEAK |
```

---

## Step 3: Valuation Context (NEW in v3.0, v3.2 research-heavy)

**v3.2: Valuation context must be verified against MULTIPLE sources, not just yfinance P/E.**

**🔥 RESEARCH-HEAVY VALUATION VERIFICATION:**

1. **P/E verification (3 sources):**
   - yfinance: `info.get("trailingPE")` + `info.get("forwardPE")`
   - Browser → Yahoo Finance → ticker → Statistics → trailing + forward P/E
   - Browser → MarketWatch → ticker → valuation section
   - Cross-check: all 3 must agree within 5%. If not, flag.

2. **5-year historical P/E range (2 sources):**
   - yfinance: pull 5-year historical P/E data → compute median, range
   - Brave Search: `"[TICKER] 5 year average PE ratio"` + `"[TICKER] historical valuation multiple"`
   - Is current P/E above or below 5-year median? Above = caution, below = potential opportunity.

3. **Sector comparison (3 sources):**
   - yfinance: pull P/E, EV/EBITDA, P/B for sector median
   - Browser → Finviz → ticker → compare to sector averages
   - Brave Search: `"[SECTOR] average PE ratio 2026"` + `"[TICKER] valuation vs peers"`

4. **Dip/crash verification (4 sources — see Category 8 detection):**
   - Identify crash date from 1Y chart
   - Read earnings transcript from crash quarter
   - Search for crash cause: temporary or structural?
   - Check insider activity during the dip

**v3.0 adds explicit valuation context to avoid buying overhyped stocks at peak multiples.**

### Valuation Checks:

| Metric | Green (GOOD) | Yellow (CAUTION) | Red (DANGER) |
|--------|-------------|------------------|-------------|
| Trailing P/E vs 5-year median | Below median | At median | >2x median |
| Trailing P/E vs sector | Below sector | At sector | >2x sector |
| Forward P/E vs trailing P/E | FPE < TPE (expanding) | FPE ≈ TPE | FPE > TPE (contracting) |
| PEG ratio | <1.0 | 1.0-2.0 | >2.0 |
| EV/EBITDA vs sector | Below sector | At sector | >2x sector |
| Price vs 52-week high | >15% below | Within 10% | At ATH |
| Price vs analyst consensus | Below consensus | At consensus | Above all targets |

**Scoring (adds to/reduces quantitative score):**
- 3+ green: +5 bonus points
- 3+ red: -5 penalty points
- Mostly green with some yellow: ideal

### Dip/Crash Detection:

| Signal | Action |
|--------|--------|
| >25% below 52w high + fundamentals improving | 🟢 STRONG DIP BUY — +5 bonus |
| >25% below 52w high + insider buying | 🟢 DIP WITH INSIDER CONFIRMATION — +7 bonus |
| >15% below 52w high + P/E below 5yr avg | 🟢 VALUE DIP — +3 bonus |
| At ATH + P/E >2x sector | 🔴 OVERBOUGHT — -5 penalty |
| At ATH + stock above all analyst PTs | 🔴 PRICED FOR PERFECTION — -8 penalty |

---

## Step 4: Supply Chain & Macro Resilience (v3.1 — Revenue Chain Integrity Added)

**v3.1 UPDATE:** Step 4 now includes the critical **4D: Revenue Chain Integrity** check — bullwhip/bubble detection that traces demand through the entire value chain from end-user to supplier. This was identified as a deadly blind spot in v3.0 after the surge-analyst recommended MU based on "sold out through year-end" HBM demand without verifying whether the hyperscaler end-user demand justified $600B+ in AI capex.

### 4A: Manufacturing / Foundry Dependency

Map the physical supply chain. Identify:
- **Where is the core product made?** (country, specific facility)
- **Single point of failure?** (one factory, one supplier, one region)
- **Lead time to build alternative capacity?** (years, cost)

| Risk Level | Definition |
|-----------|------------|
| 🔴 HIGH | Single facility, single country, no backup |
| 🟡 MODERATE | Multiple facilities but concentrated region |
| 🟢 LOW | Globally distributed manufacturing |

### 4B: Geopolitical & Export Risk
- **Tariffs:** Is the product caught in US-China/EU trade disputes?
- **Export controls:** Can the government ban sales to key markets?
- **Sanctions risk:** Is the company exposed to sanctioned countries?
- **Conflict risk:** Are facilities near active or potential conflict zones?

### 4C: Customer Concentration
- Any single customer >20% of revenue? → +1 risk level
- Government/defense as primary customer? → political cycle risk
- Commodity price exposure? → cycle risk

### 4D: Revenue Chain Integrity — Bullwhip / Supply Chain Bubble Detection (NEW in v3.1 — MANDATORY)

**⚠️ CRITICAL GAP FIX (v3.1): The v3.0 methodology treated "revenue growth" and "sold out through year-end" as pure positive signals without EVER asking whether the demand is real end-user demand or supply chain double/triple ordering (bullwhip effect). This is a DEADLY omission — especially in AI infrastructure where every tier of the supply chain is over-ordering to "secure supply."**

#### The Bullwhip Effect in AI Infrastructure:

```
End Users (consumers/enterprises)
    │  AI chatbot subscriptions, API usage, enterprise AI adoption
    │  ACTUAL demand: uncertain, early, potentially far below expectations
    ▼
Hyperscalers (MSFT, GOOG, META, AMZN)
    │  Project AI demand → order GPUs $600B+/year
    │  Do they have the end-user revenue to justify this? ← THE KEY QUESTION
    ▼
GPU Makers (NVDA, AMD)
    │  Receive hyperscaler orders → order HBM, substrates, packaging
    │  Over-order to secure supply → bullwhip amplification
    ▼
Memory Makers (MU, Samsung, SK Hynix)
    │  Receive GPU maker orders → "SOLD OUT through year-end"
    │  Bullwhip at maximum amplitude — every tier inflated orders
    ▼
Equipment Makers (ASML, AMAT, LRCX)
       Receive memory maker orders → building capacity for capacity's sake
```

**The fatal assumption in v3.0:** "Revenue growth 345% with P/E 22x = amazing opportunity." What if that 345% growth is 50% real demand + 50% supply chain over-ordering? When the music stops, that 50% vanishes overnight — and with it, the "cheap" P/E.

#### Revenue Chain Integrity Checklist (MANDATORY for any stock where revenue growth >50% YoY OR AI/data center is the dominant growth driver):

| Tier | Question | Detection Method | Red Flag Threshold |
|------|----------|-----------------|--------------------|
| **Tier 1: Direct Customers** | Who are the top 3-5 customers? What % of revenue? | 10-K filing → "Customer Concentration" section; segment reporting | Any single customer >30% of revenue |
| **Tier 2: Customers' Customers** | Who do YOUR customers sell to? Are THEY seeing real end demand? | Analyst reports, industry publications, customer earnings calls | Customer's end-market revenue growing slower than their orders from you |
| **Tier 3: End Users** | What is the ACTUAL end-user revenue from the product/service this supply chain enables? | Hyperscaler AI revenue disclosures, enterprise AI adoption surveys, subscription metrics | End-user revenue < 50% of cumulative supply chain capex |
| **Inventory Check** | Are inventories building at any tier? | Balance sheet → inventory/sales ratio trending up; channel checks | Inventory/sales ratio up >20% YoY |
| **Double-Ordering Check** | Are lead times extending AND order books filling simultaneously? (Classic bullwhip signal) | Industry trade journals, competitor commentary, supply chain news | Lead times >2x normal AND backlog growing >50% YoY |
| **Capacity Expansion Check** | Is the INDUSTRY (not just the company) adding capacity faster than end-demand can absorb? | Sum all announced capacity expansions in the sector vs. projected demand growth | Industry capacity additions >2x projected demand growth |

#### Bullwhip Risk Score (0 to -20 — DEDUCTED from quantitative score):

| Signal | Penalty | How to Detect |
|--------|---------|---------------|
| Supply chain trace incomplete — can't identify Tier 2 or Tier 3 customers | **-10 pts** | Research effort exhausted, gap remains |
| Tier 2 customer (e.g., NVIDIA) revenue growth > Tier 3 customer (e.g., hyperscaler) AI revenue growth | **-5 pts** | Compare growth rates — bullwhip amplification suspected |
| Hyperscaler AI revenue < 30% of their AI capex (suggesting ROI gap) | **-8 pts** | Microsoft Copilot revenue, Google Cloud AI revenue, etc. vs. their capex |
| Lead times extending + backlog growing simultaneously (classic bullwhip) | **-5 pts** | Industry trade journals, company commentary |
| Inventory building at multiple tiers simultaneously | **-3 pts** | Balance sheet analysis across supply chain |
| Industry-wide capacity additions >3x projected end-demand growth | **-5 pts** | Sum competitor capex plans vs. demand forecasts |
| ANY tier shows order cancellations or push-outs | **-15 pts** | Earnings call transcripts, industry news — this is the canary |
| **MAX BULLWHIP PENALTY: -20 pts** (can't exceed even if all signals triggered) | | |

#### Bullwhip Resilience Score (0 to +10 — ADDED to quantitative score):

| Signal | Bonus | How to Detect |
|--------|-------|---------------|
| Revenue chain fully traced through all 3 tiers with VERIFIED end-user demand | **+5 pts** | Complete trace with hard data at each tier |
| End-user AI revenue growing FASTER than supply chain orders (sustainable demand) | **+5 pts** | Hyperscaler AI revenue growth > GPU order growth |
| Company's customers have diversified end-markets (not just AI) | **+3 pts** | Segment reporting — <40% of customer revenue from AI |
| Long-term take-or-pay contracts at Tier 1 (not just "backlog" or "orders") | **+3 pts** | 10-K → contractual obligations section |

#### v3.1 Rule: Supply Chain Trace is MANDATORY
- **For ANY stock where revenue growth >50% YoY:** The full 3-tier trace is MANDATORY. No trace = automatic -10 penalty.
- **For ANY stock where AI/data center is >40% of revenue:** The full 3-tier trace is MANDATORY. No trace = automatic -10 penalty.
- **For stocks where the surge-analyst cannot complete the trace:** The bullwhip risk score defaults to -10 (worst-case assumption). The thesis is capped at "HALF" position size maximum.
- **If order cancellations are detected at ANY tier:** The position is automatically KILLED — no exceptions. This is the supply chain equivalent of insider selling clusters.

#### Bullwhip Risk Levels:

| Bullwhip Score | Risk Level | Position Cap |
|----------------|------------|-------------|
| +5 to +10 | 🟢 LOW — Verified end demand supports supply chain orders | Full position eligible |
| -5 to +4 | 🟡 MODERATE — Some uncertainty, but no clear red flags | Standard position |
| -10 to -6 | 🟠 HIGH — Bullwhip signals detected, trace incomplete | Half position max |
| -20 to -11 | 🔴 CRITICAL — Multiple bullwhip signals, potential bubble | **KILL the thesis** |

### Output Format (Step 4):
```
| Ticker | Mfg Risk | Geo Risk | Customer Risk | Bullwhip Risk | Key Vulnerabilities |
|--------|----------|----------|---------------|---------------|---------------------|
| XXXX | 🟡 MOD | 🔴 HIGH | 🟢 LOW | 🟠 HIGH (-8) | Taiwan Strait + supply chain over-ordering suspected |
```

---

## Final Report Integration

After completing all steps, the quantitative screen (Step 1, 0-40) and the qualitative moat audit (Step 2, 0-50) MUST BE RECONCILED before any BUY recommendation:

### Reconciliation Table (v3.2 — with Assumption Flags):
```
| Ticker | Quant (0-40) | Qual (0-50) | Agreement | Assumption Flags | Recommendation |
|--------|-------------|-------------|-----------|------------------|----------------|
| XXXX | 34 (V) | 45 (V) | ✅ STRONG | 0 CRITICAL, 1 HIGH | BUY — Both confirm + data flywheel |
| YYYY | 28 (I) | 15 (E) | ❌ DIVERGE | 2 CRITICAL, 3 HIGH | CAUTION — Quant INFERRED, qual ESTIMATED |
| ZZZZ | 18 (V) | 42 (E) | ❌ DIVERGE | 1 CRITICAL | INVESTIGATE — Great moat ESTIMATED, weak verified numbers |
```

**Confidence codes: (V)ERIFIED = 3+ sources, (I)NFERRED = single source or pattern, (E)STIMATED = extrapolated, (A)SSUMED = no direct data**

**v3.2 RECONCILIATION RULE:** If any score in the reconciliation pair is ESTIMATED or ASSUMED, the recommendation is capped at HALF position regardless of score level. VERIFIED pairs can go FULL. INFERRED is acceptable for STANDARD positions.

### Reconciliation Rules (v3.2 — Qual thresholds adjusted for 0-50):
| Quant | Qual | Result |
|-------|------|--------|
| >25 | >30 | ✅ STRONG BUY — Full position eligible (unless Bullwhip Risk is HIGH/CRITICAL) |
| >25 | 18-29 | 🟡 CAUTIOUS — Half position max |
| >25 | <18 | ⚠️ SKIP — Good numbers, fragile business |
| 15-24 | >30 | 🟡 OPPORTUNITY — Great moat + flywheel, needs catalyst. Size moderately. |
| 15-24 | 18-29 | 🟠 WEAK — Tracker only |
| <15 | Any | 🔴 PASS |
| >25 | 18-29 | 🟡 CAUTIOUS — Half position max |
| >25 | <18 | ⚠️ SKIP — Good numbers, fragile business. No data flywheel = commoditization risk. |
| 15-24 | >30 | 🟡 OPPORTUNITY — Great moat + flywheel, needs catalyst. Size moderately. |
| 15-24 | 18-29 | 🟠 WEAK — Tracker only |
| <15 | Any | 🔴 PASS |

**v3.1 Bullwhip Override (NEW):** If Bullwhip Risk from Step 4D is HIGH (-10 to -6) or CRITICAL (-20 to -11), the position is capped at HALF or KILLED regardless of Quant+Qual agreement. Bullwhip risk is an existential supply chain integrity issue that no amount of moat depth or quantitative cheapness can overcome.

---

## Key Principles (v3.0)

1. **Quantitative finds, qualitative validates.** Numbers alone can be misleading. Patents, papers, and physics tell you whether the numbers will persist.
2. **NO HARDCODED TICKERS.** Discover dynamically from live market data every time.
3. **NO AUTO-KILL.** Every stock gets scored. Quality score determines position size, not inclusion/exclusion.
4. **PREFER DIPS.** Companies >10% below 52-week highs with improving fundamentals have asymmetric upside. Companies at ATH with stretched P/Es have asymmetric downside.
5. **DEEP RESEARCH IS MANDATORY.** Google Patents, arXiv, IEEE Spectrum — not Yahoo Finance headlines.
6. **RECONCILE QUANT + QUAL.** If they disagree, investigate deeper or kill the thesis. Never override data with gut feeling.
7. **FCF trajectory > FCF yield.** A company with 0.8% FCF yield growing 50% CAGR is better than one with 2.5% flat. Context matters.
8. **Sector limits.** Max 40% per sector. Min 3 sectors in a 5+ position portfolio.
9. **Red flags are enforced.** Insider selling, P/E extremes, revenue deceleration — penalties are applied, not noted.
10. **The backtest doesn't lie, but it's N=1.** v1.0 killed semiconductors. v2.0 overcorrected. v3.0 requires both numbers AND research to agree. When the methodology produces bad results, change the methodology — but give it enough time to prove itself first.
11. **Revenue growth is a LIABILITY until verified.** (v3.1) High revenue growth in a supply chain with multiple tiers between the company and the end user is a bullwhip risk, not just an opportunity. Trace the full revenue chain through all 3 tiers before trusting the growth number. "Sold out through year-end" means nothing if the end user isn't generating real revenue.
12. **Data flywheels beat compute moats.** (v3.2) In the AGI deployment era, a company that owns a physical data flywheel (robots, autonomous vehicles, industrial sensors feeding telemetry into model improvement) has a compounding moat that deepens with every deployed unit. A company that merely sells compute into the AI ecosystem has a moat that SHRINKS as inference costs race toward zero. Always assess: is this company BUILDING a data flywheel or just SELLING picks to the flywheel builders?

---

## Sector-Specific Normal Ranges (for context, not hard gates):

| Sector | Normal FCF Yield | Normal P/E | Normal EV/EBITDA | Why |
|--------|-----------------|-----------|------------------|-----|
| Semiconductors (growth) | 0.3% – 2.0% | 15-30x | 10-20x | Heavy reinvestment |
| Semiconductors (mature) | 2.0% – 6.0% | 12-20x | 8-15x | Capex lightens |
| Energy (oil & gas) | 3.0% – 10.0% | 8-15x | 4-8x | Capital returns prioritized |
| Industrial / Electrical | 1.5% – 4.0% | 15-25x | 10-18x | Moderate capex |
| Aerospace / Defense | 1.5% – 5.0% | 15-25x | 10-20x | Long-cycle production |
| Mining / Commodities | 2.0% – 8.0% | 8-20x | 4-12x | Cyclical |
| Data Center REITs | 2.0% – 6.0% | 15-25x | 15-25x | REIT structure |
| Telecom / Tower | 4.0% – 10.0% | 10-20x | 10-20x | Mature infrastructure |
