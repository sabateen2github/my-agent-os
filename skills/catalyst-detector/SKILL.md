---
name: catalyst-detector
description: PRIMARY screening methodology for identifying stocks poised to surge in 3-6-12 months. v3.0: Adds Deep Domain Knowledge category (10th), quantitative scoring triggers, dip/crash preference scoring, and forced quant+qual reconciliation. 10 categories, 140 points max. Runs AFTER quantitative screen and deep-moat-audit.
license: MIT
compatibility: opencode
metadata:
  version: "3.0"
  last_updated: "2026-07-03"
  categories: 10
  max_score: 140
---

# Catalyst Detector — Surge Prediction Methodology v3.0

## Philosophy (v3.0 — Quant+Qual Reconciliation)

**v1.0**: Quality-first. Killed the winners. (-7.4% alpha)
**v2.0**: Catalyst-first. Fixed the kill problem but created a narrative problem — catalyst scores were subjective, red flags were acknowledged but ignored, and qualitative research was headline-deep.
**v3.0**: Quant+Qual Reconciliation. The quantitative screen finds candidates. The qualitative deep-moat-audit validates the moat. The catalyst scoring bridges them. A recommendation requires ALL THREE to agree.

**Core principles:**
1. Quantitative signals set the baseline (Phase 1 — Python/yfinance)
2. Deep qualitative research validates the moat (Phase 2 — deep-moat-auditor)
3. Catalyst scoring grades the surge potential (Phase 3 — 10 categories)
4. Reconciliation forces agreement (Phase 4 — converge or kill)

**What actually drives surges (expanded v3.0):**
1. **Quantitative acceleration** (revenue/FCF growth inflecting upward — measurable, not subjective)
2. **Qualitative moat depth** (patents, scientific papers, physics constraints — researched, not assumed)
3. **Catalyst density** (multiple events forcing repricing within 3-12 months)
4. **Contrarian timing** (buying dips/crashes, not ATHs — asymmetric upside)
5. **Secular trend alignment** (the tide lifting all boats)

## The 10 Catalyst Categories (v3.0 — expanded from 9)

### 0. 🌊 MACRO THEME ALIGNMENT (15 points)

Secular mega-trends create a rising tide. Stocks aligned with dominant macro themes get multiple expansion, analyst upgrades, and institutional flows simply from sector exposure.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Physical AI / Robotics Deployment** 🔥 (v3.2 NEW — TIER 1) | Company deploys physical AI endpoints: robots, autonomous vehicles, industrial sensors. Generates real-world action-outcome telemetry. Deployment base growing >50% YoY. | **HIGHEST** — This is THE dominant theme of the AGI era per the deployment flywheel thesis. |
| **Data Flywheel Ownership** 🔥 (v3.2 NEW — TIED TO PHYSICAL AI) | Company owns a closed-loop telemetry flywheel: deployed units → data → model improvement → better units → more deployment. Has Critique-Reweight-Replay pipeline or equivalent. | **HIGHEST** — Data flywheels compound geometrically. This is the deepest moat in the AGI era. |
| **AI Infrastructure Beneficiary** | Company sells into data center, networking, or AI silicon supply chains. Revenue from AI/DC growing >30% YoY. | VERY HIGH — BUT: v3.2 context changes. Pure compute sellers face commoditization risk as inference costs → zero. Preference for edge compute + inference at scale. |
| **⚠️ AI Infrastructure — SUPPLY CHAIN INTEGRITY CHECK (v3.1)** | **CRITICAL: AI infra scoring is capped at 10/15 UNLESS the full 3-tier supply chain trace is completed and verified. "Sold out through year-end" from a Tier-3 supplier means nothing if Tier-1 end-user revenue doesn't justify the capex. See Supply Chain Bubble Modifier below.** | MANDATORY VERIFICATION |
| **Edge Compute & Inference Commoditization** (v3.2 NEW) | Company designs or deploys edge inference hardware. On-device ML, low-power accelerators, inference-at-scale platforms. Revenue tied to inference endpoints, not training clusters. | HIGH — The inference-to-zero race creates Jevons paradox: cheaper inference → more inference. Winners are those deploying the most endpoints. |
| **US-China AI Decoupling** (v3.2 NEW) | Company operates in one of two emerging AI ecosystems. Has clear supply chain independence from the other side (Taiwan, rare earths, manufacturing capacity). Or bridges both. | HIGH — Geopolitical decoupling creates separate winners and losers. Companies dependent on cross-ecosystem supply chains face binary risk. |
| **Electrification / Grid Buildout** | Electrical equipment, transformers, switchgear. Backlog growing >20% YoY. | HIGH |
| **Defense / Rearmament** | NATO spending at Cold War levels. Defense contractors with multi-year backlogs. AI-driven autonomous weapons = new arms race. | HIGH |
| **Energy Security** | LNG, pipelines, gas processing. European energy decoupling is structural. Power for physical AI deployment. | MEDIUM |
| **Reshoring / Industrial Renaissance** | US manufacturing, construction, automation. Benefiting from CHIPS Act, IRA. Manufacturing capacity for physical AI deployment. | HIGH |
| **Nuclear Renaissance** | SMR deployment, uranium, nuclear services. AI data centers + physical deployment driving baseload demand. | HIGH |
| **Contrarian: Sector Out of Favor** | Sector trading at 10-year low P/E but fundamentals improving. Rotation candidate. | HIGH |

**Scoring:** 0-15 points
- 15: Core beneficiary with >30% revenue exposure, VERIFIED by segment reporting. OR: Owns a verified closed-loop physical data flywheel (Tier 3 Autonomous Telemetry Critique Loop — deployment generates telemetry that autonomously improves models).
- 12: Strong data flywheel with growing deployment. OR: Core AI infrastructure beneficiary with verified revenue.
- 10: Secondary AI infrastructure beneficiary, indirect but confirmed exposure. OR: Emerging data flywheel at smaller deployment scale.
- 5: Weak or unverified thematic alignment. OR: Pure compute/software seller into AI with no proprietary telemetry (Flywheel Supplier at risk of commoditization).
- 0: No macro theme — must win on idiosyncratic catalysts alone.

**Detection method:**
- Identify dominant macro themes BEFORE screening stocks (Phase 1, Step 0)
- Browser: Yahoo Finance → Sector performance → which sectors are leading/rebounding?
- Brave Search: "hyperscaler CapEx 2026", "grid investment 2026 forecast", "NATO defense spending 2026"
- Use yfinance to check sector ETF performance (XLK, XLE, XLI, XLB, etc.)
- Verify theme alignment through company segment reporting, NOT assumptions

---

### 1. 🧮 FUNDAMENTAL SURPRISE CATALYSTS (20 points)

**v3.0: QUANTITATIVE TRIGGERS.** No more subjective "revenue is growing nicely" → give it 15 points. Specific thresholds auto-score:

| Signal | Auto-Score | How to Verify |
|--------|-----------|---------------|
| Revenue growth >50% YoY | 10 pts | `info.get("revenueGrowth")` > 0.50 |
| Revenue growth >30% YoY | 8 pts | `info.get("revenueGrowth")` > 0.30 |
| Revenue growth >15% YoY | 5 pts | `info.get("revenueGrowth")` > 0.15 |
| Revenue growth >5% YoY | 3 pts | `info.get("revenueGrowth")` > 0.05 |
| Revenue ACCELERATING QoQ (growth rate increasing) | +3 pts | Compare quarterly revenue: (Q1-Q2)/Q2 > (Q3-Q4)/Q4 |
| Earnings growth > Revenue growth (operating leverage) | +3 pts | `earningsGrowth` > `revenueGrowth` |
| 3+ consecutive quarters beating estimates | +2 pts | Yahoo Finance → Earnings History → beat pattern |
| FCF trajectory inflecting positive | +2 pts | FCF was negative 2Q ago, now positive |
| Revenue DECELERATING 3+ quarters | -5 pts | Growth rate declining QoQ for 3+ quarters — growth story broken |
| **MAX: 20 pts** (can't exceed even if all triggers hit) | | |

**v3.0 distinction:** "Revenue growing at 50% but decelerating from 80% last quarter" scores lower than "Revenue growing at 20% but accelerating from 10%." Acceleration > absolute level.

**Detection method:**
- Pull last 4-6 quarters via `stock.quarterly_financials`
- Compute QoQ growth rates — the derivative matters more than the level
- Check analyst estimates (Yahoo Finance → Analysis tab) vs actuals
- Brave Search: `"[TICKER] earnings surprise 2026"` for beat/miss pattern
- **FCF inflection check:** Is FCF negative now but tracking to positive within 2 quarters? → +2 pts

---

### 2. 📈 TECHNICAL / CHART CATALYSTS (15 points)

**MUST use @vision for ALL chart analysis.** You cannot see images.

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| @vision chart score (0-8) | 0-8 pts | Screenshot Yahoo Finance 1Y chart → @vision: "Analyze this chart. Trend, support/resistance, volume, MA crossovers, RSI/MACD. Score the bullish setup 0-8." |
| Short float >30% of float | +7 pts | `info.get("shortPercentOfFloat")` > 0.30 |
| Short float >20% of float | +5 pts | `info.get("shortPercentOfFloat")` > 0.20 |
| Short float >10% of float | +2 pts | `info.get("shortPercentOfFloat")` > 0.10 |
| **MAX: 15 pts** | | |

**Detection:**
- Navigate browser to Yahoo Finance → ticker → Full Screen Chart → 1Y view
- Screenshot → `@vision Analyze this chart. Identify: trend direction, support/resistance levels, volume patterns, moving average crossovers, RSI/MACD signals. Is there a breakout setup? Score 0-8.`
- For short squeeze candidates: yfinance `info.get("shortPercentOfFloat")` and `info.get("shortRatio")`

---

### 3. 🏛️ REGULATORY / POLICY CATALYSTS (15 points)

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| FDA approval / Phase 3 results with CONFIRMED PDUFA date | 10 pts | FDA calendar, company guidance |
| Export control / CHIPS Act / IRA award with CONFIRMED ANNOUNCEMENT | 10 pts | Government press releases |
| Defense contract award >$1B | 10 pts | DoD announcements |
| Energy permit / license approval | 8 pts | DOE, FERC announcements |
| Regulatory event EXPECTED but no confirmed date | 5 pts | Analyst reports, company guidance |
| Export control or tariff RISK exposure | -3 pts | Geographic revenue breakdown, supply chain analysis |
| **MAX: 15 pts** | | |

**Detection method:**
- Brave Search: `"[TICKER] FDA approval date 2026"`, `"[TICKER] CHIPS Act grant award"`, `"[TICKER] defense contract 2026"`
- Browser: SEC EDGAR → risk factors section for regulatory exposure
- Company IR page → investor presentation → regulatory timeline slides

---

### 4. 🤝 M&A / CORPORATE ACTION CATALYSTS (15 points)

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| Spin-off announcement (confirmed by company) | 15 pts | Company press release, 8-K filing |
| Activist investor with 13D filing | 12 pts | SEC EDGAR 13D filing |
| Strategic review announced by company | 10 pts | Company press release |
| M&A target speculation (analyst chatter, media reports) | 5 pts | Financial media |
| No M&A catalyst | 0 pts | |
| **MAX: 15 pts** | | |

**Detection method:**
- Brave Search: `"[TICKER] activist investor 2026"`, `"[TICKER] spin-off announcement"`
- Brave Search: `"[TICKER] strategic alternatives"`, `"[TICKER] merger talks"`
- Browser: SEC EDGAR → 13D, 13F filings
- Browser: Dataroma / WhaleWisdom for hedge fund 13F filings

---

### 5. 💰 INSIDER / SMART MONEY FLOW (10 points — v3.0 STRICTER)

**v3.0: Insider selling is PENALIZED, not noted. Red flags are enforced.**

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| 3+ insiders BUYING within 30 days | 10 pts | OpenInsider.com → cluster buys |
| 1-2 insiders buying within 30 days | 6 pts | OpenInsider.com |
| No buying, no selling | 4 pts (neutral) | OpenInsider.com |
| ANY insider selling (even 10b5-1 plan) | 0 pts | OpenInsider.com |
| Cluster selling >$5M in 90 days | -5 pts PENALTY | OpenInsider.com → significant sales |
| Sell/buy ratio >10:1 | -3 pts PENALTY | Count transactions |
| CEO/CFO selling | additional -2 pts | Check role of sellers |
| **MAX: 10 pts, MIN: -10 pts** | | |

**v3.0 rule:** Insider selling is NOT a "yellow flag to note and ignore." It DEDUCTS from the total catalyst score. If AVGO insiders sold $30M, that's -5 points from whatever else AVGO scores. This prevents v2.0's "great catalysts but insiders are fleeing" paradox.

**Detection method:**
- Browser: OpenInsider.com → search ticker → screenshot cluster buys/sells
- Browser: SEC EDGAR → Form 4 filings (insider transactions)
- Brave Search: `"[TICKER] insider buying 2026"`, `"[TICKER] insider selling cluster"`

---

### 6. 📡 SENTIMENT / NARRATIVE CATALYSTS (15 points)

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| 3+ analyst upgrades in 2 weeks | 10 pts | Yahoo Finance → Analysis → Ratings trend |
| 1-2 analyst upgrades in 2 weeks | 5 pts | Yahoo Finance |
| Short interest declining >20% while price is flat (shorts trapped) | 8 pts | yfinance short float trend + price chart |
| Consensus PT >20% above current price | +3 pts | `info.get("targetMeanPrice")` / `currentPrice` > 1.20 |
| Stock ABOVE consensus analyst price target | -5 pts | `currentPrice` > `targetMeanPrice` |
| **MAX: 15 pts, MIN: -5 pts** | | |

**Detection method:**
- Browser: Yahoo Finance → ticker → Analysis tab → analyst ratings trend
- Brave Search: `"[TICKER] analyst upgrade 2026"`, `"[TICKER] price target raised"`
- yfinance: `info.get("targetMeanPrice")`, `info.get("targetHighPrice")`, `info.get("targetLowPrice")`
- Brave Search: `"[TICKER] short interest trend"`

---

### 7. 📅 CALENDAR CATALYSTS (10 points)

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| Earnings within 30 days | 10 pts | Yahoo Finance → Earnings tab |
| Earnings within 60 days | 7 pts | Yahoo Finance |
| Investor day / Analyst day confirmed | 8 pts | Company IR website → Events |
| Product launch event confirmed | 8 pts | Company press releases |
| Index rebalancing (S&P/NASDAQ) | 5 pts | Index provider announcements |
| No calendar event within 90 days | 0 pts | |
| **MAX: 10 pts** | | |

**Detection method:**
- Yahoo Finance → ticker → earnings tab → next earnings date
- Company IR website → events calendar
- Brave Search: `"[TICKER] investor day 2026"`, `"[TICKER] product launch date 2026"`

---

### 8. 🎯 CONTRARIAN / DIP SETUP (10 points — v3.0 ENHANCED)

**v3.0: This category now explicitly prefers dip/crash candidates over ATH flyers.**

| Signal | Auto-Score | How to Detect |
|--------|-----------|---------------|
| Stock >25% below 52-week high AND revenue growth >5% AND FCF improving | 10 pts | Compare current price to `fiftyTwoWeekHigh`; verify rev growth and FCF trajectory |
| Stock >25% below 52-week high AND insider buying detected | 10 pts | Same + OpenInsider check |
| Stock >15% below 52-week high AND fundamentals improving | 8 pts | Price vs 52w high + growth check |
| Sector in bottom 3 of 11 by YTD performance, company beat last 2 quarters | 8 pts | Sector ETF ranking + earnings history |
| Stock at 52-week low + 3+ insiders buying | 10 pts | 52w low check + OpenInsider |
| Post-earnings crash >15% on NON-STRUCTURAL issue | 8 pts | Check earnings date vs price drop; verify if issue is one-time |
| Stock at ATH with P/E >2x industry average | -5 pts PENALTY | `trailingPE` vs sector median PE |
| Stock up >100% in 12 months with NO earnings growth | -10 pts PENALTY | Price return vs earnings growth |
| **MAX: 10 pts, MIN: -10 pts** | | |

**CRITICAL DISTINCTION — Contrarian vs. Value Trap:**
- ✅ **Contrarian:** Temporary headwinds, fixing itself in 3-12 months. Business IS improving but the market doesn't see it yet. VERIFY with quantitative data.
- ❌ **Value Trap:** Structural decline, management in denial. Stock is cheap for a reason that won't change. If you can't articulate the SPECIFIC catalyst → kill it.

**Detection method:**
- yfinance: `info.get("fiftyTwoWeekHigh")`, `info.get("fiftyTwoWeekLow")`, current price comparison
- Browser: Finviz screener → "52-week low" filter + "insider buying"
- Brave Search: `"[TICKER] worst performing sector YTD 2026"`
- Check if the bad news is STRUCTURAL (business model broken) or TEMPORARY (one-time charges, cycle timing)

---

### 9. 🔬 DEEP DOMAIN KNOWLEDGE (15 points — NEW in v3.0)

**This category did not exist in v2.0.** It is scored ENTIRELY from the @deep-moat-auditor's research report. The qualitative deep-dive on patents, scientific papers, physics, and manufacturing processes feeds directly into this category.

| Signal | Auto-Score | Source |
|--------|-----------|--------|
| Deep-moat-auditor score 30-40/40 | 15 pts | deep-moat-auditor report: "10+ year durable moat with physics-level barriers" |
| Deep-moat-auditor score 20-29/40 | 10 pts | deep-moat-auditor report: "Moderate 3-7 year moat, mostly process/scale" |
| Deep-moat-auditor score 10-19/40 | 5 pts | deep-moat-auditor report: "Weak moat, short duration, limited IP" |
| Deep-moat-auditor score <10/40 | 0 pts | deep-moat-auditor report: "No durable moat — commodity business" |
| NO deep-moat-audit performed | 0 pts | Must do the research to score this category |
| **MAX: 15 pts** | | |

**The deep-moat-auditor researches:**
1. **Patent Landscape:** Core patents, expiration dates, citation networks, competitive circumvention
2. **Scientific Foundation:** Seminal papers, physics soundness, physical limits, disruption risk from new research
3. **Manufacturing Moat:** Process complexity, equipment dependencies, replication cost, raw material control
4. **Competitive Position:** Technology leadership vs peers, startup threats, customer lock-in depth

A full deep-moat-audit is MANDATORY for any stock receiving a BUY recommendation. Without it, the qualitative half of the quant+qual reconciliation is missing.

---

## Complete Scoring Table (v3.0)

| # | Category | Max Points | Scoring Method |
|---|----------|-----------|----------------|
| 0 | Macro Theme Alignment | 15 | Qualitative + verified segment revenue |
| 1 | Fundamental Surprise | 20 | **QUANTITATIVE TRIGGERS** (see table above) |
| 2 | Technical / Chart | 15 | @vision (0-8) + short float bonus (0-7) |
| 3 | Regulatory / Policy | 15 | Event + date verification |
| 4 | M&A / Corporate Action | 15 | Filing-verified signals |
| 5 | Insider / Smart Money | 10 | **STRICT: Selling = 0 or negative** |
| 6 | Sentiment / Narrative | 15 | Analyst upgrades + short interest + target price |
| 7 | Calendar Event | 10 | Date proximity |
| 8 | Contrarian / Dip Setup | 10 | **PENALTY for ATH/P/E extremes** |
| 9 | Deep Domain Knowledge 🔬 | 15 | deep-moat-auditor score (patents, papers, physics) |
| | **TOTAL** | **140** | |

## 🔗 Supply Chain Bubble Cross-Category Modifier (v3.1 — NEW)

**⚠️ This modifier did not exist in v3.0 — it was the deadly gap.** Revenue growth and "sold out" narratives are treated as pure positives unless the full revenue chain is traced from end-user through every intermediate tier to the company being analyzed.

### When This Modifier Applies:
- **Revenue growth >50% YoY** → MANDATORY supply chain trace required
- **AI/Data Center >40% of revenue** → MANDATORY supply chain trace required
- **Product is an intermediate good** (components, not end-user products) → MANDATORY supply chain trace required

### How the Modifier Works:

The modifier ADJUSTS scores in Categories 0 and 1 based on supply chain integrity:

#### Category 0 (Macro Theme Alignment) Adjustment:
| Supply Chain Finding | Adjustment | Why |
|---------------------|------------|-----|
| Full 3-tier trace complete, end-user demand VERIFIED growing faster than orders | No adjustment (score stands) | Demand is real |
| Full trace complete, end-user demand growing but slower than orders | **-5 pts** from Category 0 | Bullwhip amplification suspected |
| Trace incomplete — Tier 3 end-user data unavailable | **Capped at 10/15** (max 10 regardless of other signals) | Cannot verify demand integrity |
| Trace attempted but Tier 2 customer growth > Tier 3 customer growth | **-8 pts** from Category 0 | Clear bullwhip signal — demand is being amplified at each tier |
| Order cancellations detected at ANY tier | **Category 0 = 0/15** | Supply chain bubble is bursting — no macro theme justifies it |

#### Category 1 (Fundamental Surprise) Adjustment:
| Supply Chain Finding | Adjustment | Why |
|---------------------|------------|-----|
| Revenue growth is from diversified end-markets (not just AI) | No adjustment | Diversification reduces bullwhip risk |
| Revenue growth is AI-concentrated but trace shows end-demand justifies it | **-3 pts** from Category 1 | Concentration risk, even if demand is real |
| Revenue growth >100% YoY with no end-user verification | **-8 pts** from Category 1 | Extremely high growth in intermediate goods is the #1 bullwhip indicator |
| Backlog growing >50% AND lead times extending | **-5 pts** from Category 1 | Classic double-ordering signal |

#### Combined Effect Example (Micron, July 2026):
```
v3.0 Score (WITHOUT modifier):
  Category 0: 15/15 ("AI HBM is the bottleneck")
  Category 1: 15/20 ("Revenue +345%, sold out")
  Total: 30/35 from these two categories

v3.1 Score (WITH modifier applied after supply chain trace):
  Category 0: 15 → capped at 10 (trace incomplete — hyperscaler AI revenue vs capex ratio not verified)
  Category 1: 15 → reduced to 7 (revenue +345% is AI-concentrated with no end-user verification → -8)
  Total: 17/35 from these two categories

  Difference: -13 points — enough to move MU from 80/140 (MEDIUM) to 67/140 (LOW)
```

### Verification Protocol for Supply Chain Trace:
1. **Tier 1:** 10-K filing → Customer concentration → identify top customers and revenue %
2. **Tier 2:** Customer's 10-K/earnings → who do THEY sell to? What's THEIR revenue growth?
3. **Tier 3:** End-user data → hyperscaler AI revenue disclosures, enterprise AI surveys, subscription KPIs
4. **Cross-check:** Is Tier 3 end-user revenue growing at least as fast as Tier 2 orders? If not → bullwhip.
5. **Inventory check:** Are inventories building at any tier? Check inventory/sales ratios across the chain.
6. **Capacity check:** Is the industry adding capacity faster than end-demand projections?

**v3.1 MANDATE: The supply chain modifier is NOT optional.** Any stock that triggers the "when this modifier applies" conditions MUST have the full trace completed. If the trace cannot be completed, the most conservative adjustment applies (cap at 10 for Category 0, -8 for Category 1). This is the methodology's protection against the #1 cause of false positives in AI infrastructure investing. |

## v3.0 Conviction Thresholds

| Score | Conviction | Action |
|-------|-----------|--------|
| **120-140** | 🟢 VERY HIGH | Quant + Qual + Catalysts all aligned. Maximum conviction. |
| **100-119** | 🟢 HIGH | Strong across multiple categories. Confident. |
| **80-99** | 🟡 MEDIUM | Good but some uncertainty. Size moderately. |
| **60-79** | 🟠 LOW | Interesting but insufficient evidence. Half size or tracker. |
| **<60** | 🔴 NO SURGE THESIS | Skip entirely. Don't fabricate weak theses. |
| **<0** | 🔴 RED FLAG OVERLOAD | Insider selling + overbought + deceleration = actively avoid |

## Red Flags — WITH ENFORCED PENALTIES (v3.0)

v2.0 listed red flags but didn't enforce them. v3.0 embeds penalties directly in the scoring:

| Red Flag | Penalty | Category Affected | Why |
|----------|---------|-------------------|-----|
| Insider selling cluster (>$5M in 90 days) | -5 pts | Category 5 | The people who know best are getting out |
| Stock at ATH with P/E >2x industry | -5 pts | Category 8 | Priced for perfection — asymmetric downside |
| Stock up >100% in 12 months, no earnings growth | -10 pts | Category 8 | Pure momentum, no fundamentals |
| Revenue deceleration 3+ quarters | -5 pts | Category 1 | Growth story broken — value trap forming |
| Stock ABOVE all analyst PTs | -5 pts | Category 6 | No Street support — limited upside |
| Sell/buy ratio >10:1 | -3 pts | Category 5 | Insiders systematically exiting |
| CEO/CFO selling | -2 pts | Category 5 | Leadership reducing exposure |
| Export control / tariff risk | -3 pts | Category 3 | Regulatory binary risk |
| Supply chain trace incomplete for AI/infra stock with rev growth >50% (v3.1) | **-10 pts** | Categories 0+1 | Cannot verify demand is real vs. bullwhip phantom |
| Supply chain: Tier 2 customer growth > Tier 3 end-user growth (v3.1) | **-5 pts** | Category 0 | Bullwhip amplification detected |
| Supply chain: order cancellations at any tier (v3.1) | **AUTOMATIC KILL** | — | The supply chain bubble is popping — thesis is dead |
| Major customer loss (>20% revenue) | -10 pts | Automatic KILL | Thesis broken |
| SEC investigation / accounting concerns | -15 pts | Automatic KILL | Existential risk |

**v3.0 enforcement rule:** If a stock triggers 3+ red flags, automatically remove from consideration regardless of other scores. Don't try to rationalize a "good company with some concerns" — 3+ red flags = something is wrong.

## Integration with Infrastructure Moat SOP (v3.1)

The v3.1 sequence:
```
1. DYNAMIC DISCOVERY → Live market data (browser, NOT hardcoded)
         ↓
2. QUANTITATIVE SCREEN → Python/yfinance → score 0-40 → top 20-30 advance
         ↓
2.5. SUPPLY CHAIN TRACE (v3.1 — NEW) → For any stock with rev growth >50% or AI >40% of revenue,
     trace the full 3-tier revenue chain. Apply bullwhip modifier to Categories 0 and 1.
         ↓
3. DEEP MOAT AUDIT → @deep-moat-auditor for top 10-15 → moat score 0-40
         ↓
4. CATALYST DETECTION → 10 categories, 140 pts → quant triggers + qual research
     + supply chain bubble modifier applied
         ↓
5. QUANT+QUAL RECONCILIATION → Both must agree → kill divergents
     + bullwhip risk override: HIGH/CRITICAL bullwhip = cap or kill
         ↓
6. PORTFOLIO CONSTRUCTION → Position sizing, sector limits, dip preference, price verification
```

## Position Sizing Rules (v3.0):

| Quant Score | Qual Score | Catalyst Score | Max Position | Label |
|-------------|------------|----------------|-------------|-------|
| >30/40 | >30/40 | 120+ | 22% | FULL |
| >30/40 | >25/40 | 100-119 | 18% | FULL |
| >25/40 | >25/40 | 80-99 | 15% | STANDARD |
| >25/40 | >20/40 | 80-99 | 12% | MODERATE |
| >20/40 | >15/40 | 60-79 | 8% | HALF |
| <20/40 | Any | <60 | 0% | PASS |

**Sector Limits:** Max 40% per sector. Min 3 sectors in 5+ position portfolio.
**Dip Preference:** At least 40% of positions must be in dip/crash candidates (>10% below 52w high).

## Time Horizon Mapping

| Catalyst Type | Typical Time to Price Impact |
|--------------|------------------------------|
| Macro theme alignment | 3-12 months (sector rotation, multiple expansion) |
| Earnings surprise | 1 day to 3 months (gap + drift) |
| FCF trajectory inflection | 1-6 months (as quarterly data confirms) |
| Technical breakout | 1 week to 3 months |
| FDA/Regulatory decision | Day of announcement |
| M&A announcement | Immediate (premium) |
| Spin-off completion | 3-12 months (unlock value) |
| Insider buying cluster | 1-6 months |
| Analyst upgrade wave | 1-4 weeks |
| Index inclusion | Announcement to effective date (2-4 weeks) |
| Short squeeze | Days to weeks (violent) |
| Activist campaign | 3-12 months |
| Contrarian mean reversion | 3-12 months (requires catalyst) |
| Deep domain knowledge moat | 6-24 months (IP/patent durability timeline) |

## Verification Protocol

**⚠️ Search Resilience (v3.1):** All detection methods below reference "Browser → [site]" or "Brave Search → [query]". If Google captcha-locks the browser, immediately switch to Bing (`https://www.bing.com/search?q=[query]`) or DuckDuckGo (`https://duckduckgo.com/?q=[query]`). If Brave MCP fails, use browser `https://search.brave.com/search?q=[query]`. Direct URLs (Yahoo Finance, OpenInsider, SEC EDGAR) rarely block headless browsers and should be tried before any fallback to `webfetch`. Never waste more than 2 recovery attempts fighting Google's captcha.

1. **Primary source:** Company filings (10-K, 10-Q, 8-K, 13D), government databases
2. **Secondary source:** Financial media (Reuters, Bloomberg, WSJ)
3. **Tertiary:** Analyst reports, industry publications
4. **Deep source (v3.0):** arXiv papers, Google Patents, IEEE Spectrum, SemiEngineering
5. **Contrarian check:** Brave Search: `"[TICKER] bear thesis"` or `"[TICKER] short case"`
6. **Timeline verification:** Exact date if calendar catalyst; date range if event-driven
7. **Price verification:** Browser → Yahoo Finance → live price confirmation before final recommendation
