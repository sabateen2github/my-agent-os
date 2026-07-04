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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE SEARCH PROTOCOL:**

**Minimum sources before scoring Macro Theme: 8+ distinct sources across all themes.**

1. **Sector performance (3 sources):**
   - Browser → Yahoo Finance sector performance page → screenshot → @vision extract rankings
   - yfinance: pull 1-year returns for XLK, XLE, XLI, XLB, XLF, XLP, XLU, XLV, XLY sectors
   - Brave Search: `"best performing sectors 2026 Q3"` + `"sector rotation trend 2026"`
   - Cross-check: do all 3 sources agree on which sectors lead/lag?

2. **Hyperscaler capex verification (3 sources):**
   - Brave Search: `"hyperscaler CapEx 2026"` + `"Microsoft Meta Google Amazon AI capex Q3 2026"`
   - Browser → each hyperscaler's latest earnings transcript → extract capex guidance
   - Independent analyst: `"hyperscaler capex forecast 2026 2027 analyst"`
   - Cross-check: do capex numbers converge? If estimates diverge >20%, flag as uncertain.

3. **Physical AI deployment data (4 sources — NEW v3.2):**
   - Brave Search: `"humanoid robot deployments 2026 count"` + `"industrial robot installed base 2026"`
   - Trade journals: Robotics Business Review, IEEE Spectrum → `"[company] robot fleet size"`
   - Government data: International Federation of Robotics (IFR) annual report → deployment stats
   - Company disclosures: 10-K segment data, investor presentations → deployment unit counts
   - Cross-check: verify deployment counts against 2+ independent sources.

4. **US-China decoupling evidence (3 sources):**
   - Brave Search: `"US China AI chip export controls 2026"` + `"China semiconductor self-sufficiency progress"`
   - Government sources: BIS export control announcements, China's 14th Five-Year Plan tech targets
   - Industry analysis: `"China AI supply chain independence 2026"` + `"Taiwan semiconductor risk assessment"`

5. **Theme alignment verification (per stock):**
   - Read the company's LATEST 10-K (not a summary — the actual filing) → Business Description section
   - Extract segment revenue breakdowns → calculate % revenue from each theme
   - Read latest earnings call transcript → management commentary on theme exposure
   - Cross-reference against 1 independent analyst report on the company's theme exposure
   - **NEVER** assume theme alignment from company name or sector label alone.

6. **Energy/defense/grid data (3+ sources each):**
   - Brave Search: `"NATO defense spending 2026 budget"` + `"global grid investment 2026 forecast"` + `"LNG demand forecast 2026 2030"`
   - Government: DoD budget documents, IEA World Energy Outlook, EIA Annual Energy Outlook
   - Industry: EEI (Edison Electric Institute), API (American Petroleum Institute) reports
   - Cross-check: government vs industry forecasts — if they diverge, use the more conservative number.

**Output:** A matrix of themes × stocks with verified % revenue exposure, ranked by conviction. If theme alignment cannot be verified to at least 2 sources, score it as "unverified" (max 5/15 for that theme).

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE FINANCIAL VERIFICATION:**

**Minimum sources: 5+ distinct data points. Never trust a single yfinance call.**

1. **Quantitative data pull (Python — primary):**
   - Pull last 6 quarters via `stock.quarterly_financials` — not just 4
   - Compute QoQ growth rates for ALL 6 quarters — plot the trend line
   - Pull annual data for 5 years via `stock.financials` — compute 5-year CAGR
   - Compare quarterly revenue to analyst estimates (Yahoo Finance → Earnings History) for last 8 quarters

2. **Cross-verify against company filings (2 sources):**
   - Browser → SEC EDGAR → latest 10-K → Income Statement → cross-check revenue against yfinance
   - Browser → SEC EDGAR → latest 10-Q → cross-check quarterly data
   - If yfinance and SEC data differ >3%, flag as data quality issue. Use SEC data (more authoritative).

3. **Earnings quality check (3 sources):**
   - Read the FULL latest earnings call transcript (not a summary) → extract guidance, one-time items, segment commentary
   - Brave Search: `"[TICKER] earnings quality analysis"` + `"[TICKER] non-GAAP vs GAAP reconciliation"`
   - Check for: one-time gains/losses, changes in accounting methods, revenue recognition changes
   - Cross-check: `"[TICKER] earnings surprise history last 8 quarters"` → Yahoo Finance Earnings tab

4. **FCF trajectory deep dive (2 sources):**
   - Pull 8 quarters of FCF from `stock.quarterly_cashflow` → compute 2-quarter rolling averages
   - Check CAPEX trend vs. revenue trend — is FCF improving because revenue is growing or because capex is being cut?
   - Browser → SEC EDGAR → Cash Flow Statement → verify FCF calculation (operating CF - capex)

5. **Segment revenue deep dive (mandatory for diversified companies):**
   - 10-K → Segment Reporting note → extract revenue by segment for last 3 years
   - Identify which segments are growing/declining → is total revenue growth hiding segment decline?
   - Brave Search: `"[TICKER] [segment] revenue growth driver 2026"`

6. **Competitor comparison (2 sources):**
   - Pull same metrics for top 2-3 competitors → is this company outperforming or just riding industry tailwinds?
   - Brave Search: `"[TICKER] vs [COMPETITOR] revenue growth margins comparison 2026"`

**Critical rule:** If you cannot verify revenue growth against the SEC filing, do NOT score Category 1. Default to 0. A yfinance API call alone is insufficient.

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — MULTI-TIMEFRAME CHART + MULTI-SOURCE SHORT DATA:**

1. **Multi-timeframe chart analysis (3 timeframes → 3 @vision calls):**
   - Browser → Yahoo Finance → ticker → Full Screen Chart → **6-month view** → screenshot → @vision: "Analyze. Identify near-term trend, support/resistance, volume. Score 0-8."
   - Change to **1-year view** → screenshot → @vision: "Analyze. Identify medium-term trend, MA crossovers, RSI/MACD divergence. Score 0-8."
   - Change to **5-year view** → screenshot → @vision: "Analyze. Identify long-term trend, major support/resistance zones, secular pattern. Score 0-8."
   - **Final chart score = weighted average:** 6M × 0.25 + 1Y × 0.50 + 5Y × 0.25

2. **Short interest verification (3 sources — NEVER trust yfinance alone):**
   - yfinance: `info.get("shortPercentOfFloat")` + `info.get("shortRatio")` (days to cover)
   - Browser → MarketWatch → `https://www.marketwatch.com/investing/stock/[ticker]` → short interest data
   - Browser → Yahoo Finance → ticker → Statistics tab → short % of float, short ratio
   - Cross-check: if the 3 sources differ >10%, flag as data quality issue
   - Brave Search: `"[TICKER] short interest trend last 6 months"` + `"[TICKER] short squeeze candidate 2026"`

3. **Volume and institutional flow analysis (2 sources):**
   - @vision on chart → "Identify volume spikes. Are they on up days or down days? Accumulation or distribution?"
   - Brave Search: `"[TICKER] institutional ownership change Q3 2026"` + `"[TICKER] 13F filing recent"`
   - Browser → WhaleWisdom or Dataroma → institutional holdings trend

4. **Options market check (1 source — optional but high-signal):**
   - Brave Search: `"[TICKER] unusual options activity 2026"` + `"[TICKER] options flow put call ratio"`

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE REGULATORY SEARCH:**

**Minimum 5 distinct queries. Cross-check government + company + media sources.**

1. **Regulatory event search (all of these, not just one):**
   - Brave Search: `"[TICKER] FDA approval PDUFA date 2026"` + `"[TICKER] FDA advisory committee outcome"`
   - Brave Search: `"[TICKER] CHIPS Act grant award announcement"` + `"[TICKER] IRA tax credit 2026"`
   - Brave Search: `"[TICKER] defense contract award DoD 2026"` + `"[TICKER] Pentagon contract announcement"`
   - Brave Search: `"[TICKER] DOE loan guarantee"` + `"[TICKER] FERC permit approval"`
   - Brave Search: `"[TICKER] export license granted BIS 2026"` + `"[TICKER] CFIUS review outcome"`

2. **Government source verification (2+ sources):**
   - Browser → SAM.gov → search for company name → active contracts
   - Browser → SEC EDGAR → 10-K → Risk Factors section → regulatory exposure
   - Browser → FDA.gov → drug approvals database → search company
   - Browser → DoD.mil → contract announcements → search company

3. **Company guidance cross-check (2 sources):**
   - Company IR page → investor presentation → regulatory timeline slide
   - Latest earnings call transcript → management regulatory commentary
   - Brave Search: `"[TICKER] regulatory catalyst timeline 2026 2027"`

4. **Export control / tariff risk assessment (3 sources):**
   - 10-K → Geographic Revenue breakdown → % revenue from China, Taiwan, etc.
   - Brave Search: `"[TICKER] China exposure risk"` + `"[TICKER] tariff impact analysis"`
   - Industry analysis: `"semiconductor export controls impact 2026"` (or sector-specific)

**Critical:** If a regulatory event is scored, you MUST have the EXACT DATE from an official source. "Expected in Q3 2026" ≠ confirmed. Score accordingly (5 pts max vs 10 for confirmed date).

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE M&A SEARCH:**

1. **Activist / 13D filing search (2 sources):**
   - Browser → SEC EDGAR → search for company name + "SC 13D" (not 13G, which is passive)
   - Browser → SEC EDGAR → search for "SC 13D/A" (amendments — shows position changes)
   - Brave Search: `"[TICKER] activist investor 13D filing 2026"` + `"[TICKER] Elliott Starboard Third Point 2026"`

2. **Spin-off / strategic review search (3 sources):**
   - Brave Search: `"[TICKER] spin-off announcement"` + `"[TICKER] strategic alternatives"` + `"[TICKER] business separation"`
   - Company press releases page → filter by "corporate" → last 12 months
   - Browser → SEC EDGAR → 8-K filings → Items 2.01, 2.05, 2.06 (restructuring events)

3. **M&A speculation research (3 sources):**
   - Brave Search: `"[TICKER] merger talks"` + `"[TICKER] acquisition target"` + `"[TICKER] takeover rumors"`
   - Financial media: Reuters, Bloomberg, WSJ → `"[TICKER] deal talks"`
   - Industry consolidation analysis: `"[SECTOR] consolidation 2026 M&A activity"`

4. **Hedge fund 13F analysis (3 sources):**
   - Browser → Dataroma.com → search ticker → which funds own it? Changes since last filing?
   - Browser → WhaleWisdom → 13F filings → institutional ownership trend
   - Brave Search: `"[TICKER] new hedge fund position 13F Q2 2026"`

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE INSIDER VERIFICATION:**

**Minimum 3 sources. OpenInsider.com is primary but must be cross-checked.**

1. **Insider transaction search (3 sources — triangulate):**
   - Browser → OpenInsider.com → search ticker → last 90 days → screenshot cluster buys AND cluster sells
   - Browser → SEC EDGAR → search company name + "Form 4" → last 90 days → count buys vs sells
   - Browser → SEC EDGAR → search "Form 144" (planned sales) → upcoming selling pressure
   - Cross-check: do SEC EDGAR Form 4 counts match OpenInsider? If not, use SEC EDGAR (more authoritative).

2. **Insider cluster analysis (mandatory):**
   - Count: total insider buys vs sells in last 90 days → compute buy/sell ratio
   - Check: are multiple insiders buying simultaneously? (Cluster buy = high signal)
   - Check: are CEO/CFO buying or selling? (C-suite transactions = highest signal)
   - Check: are transactions 10b5-1 planned or discretionary? (10b5-1 = lower signal)
   - Brave Search: `"[TICKER] insider buying cluster 2026"` + `"[TICKER] CEO [NAME] stock purchase"`
   - Brave Search: `"[TICKER] insider selling investigation"` (flag for legal issues)

3. **Institutional / smart money flow (2 additional sources):**
   - Browser → WhaleWisdom → 13F filings → institutional % ownership trend (last 4 quarters)
   - Brave Search: `"[TICKER] largest shareholders buying selling 2026"` + `"[TICKER] institutional flow"`

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE SENTIMENT RESEARCH:**

1. **Analyst coverage deep dive (3 sources):**
   - Browser → Yahoo Finance → ticker → Analysis tab → Ratings trend (last 3 months) → screenshot
   - Browser → MarketWatch → ticker → Analyst Ratings → count upgrades/downgrades in last 90 days
   - Brave Search: `"[TICKER] analyst upgrade downgrade 2026 Q3"` + `"[TICKER] price target change summary"`
   - Cross-check: do all 3 sources agree on the upgrade/downgrade count?

2. **Analyst target analysis (3 data points):**
   - yfinance: `info.get("targetMeanPrice")`, `info.get("targetHighPrice")`, `info.get("targetLowPrice")`, `info.get("numberOfAnalystOpinions")`
   - Compute: upside to mean target = (targetMean - currentPrice) / currentPrice × 100
   - Check: % of analysts rating BUY vs HOLD vs SELL
   - Brave Search: `"[TICKER] most recent analyst report 2026"` → read at least 1 full analyst note (not just headline)

3. **Short interest trend analysis (2 sources):**
   - yfinance: pull short % of float for last 6 months (if available via history)
   - Brave Search: `"[TICKER] short interest trend declining increasing 2026"` + `"[TICKER] days to cover"`
   - Browser → MarketWatch → short interest historical data

4. **Social sentiment / narrative check (3 sources — optional but informative):**
   - Brave Search: `"[TICKER] reddit wallstreetbets discussion 2026"` + `"[TICKER] stocktwits sentiment"`
   - Brave Search: `"[TICKER] investor presentation narrative shift"` + `"[TICKER] CEO interview transcript 2026"`
   - Brave Search: `"[TICKER] bear case article 2026"` (read the bear thesis — always understand the counter-narrative)

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE CALENDAR VERIFICATION:**

**Confirm EVERY event date from 3+ sources. Never trust a single website.**

1. **Earnings date verification (3 sources):**
   - Yahoo Finance → ticker → Earnings tab → next earnings date
   - Browser → company IR website → Events calendar → confirmed earnings date
   - Brave Search: `"[TICKER] earnings date Q3 2026 confirmed"` + `"[TICKER] earnings announcement schedule"`
   - Cross-check: all 3 sources must agree on the date. If any source says "estimated," flag it.

2. **Investor day / product launch search (3 sources):**
   - Company IR page → Events → upcoming presentations
   - Brave Search: `"[TICKER] investor day 2026 date"` + `"[TICKER] analyst day announcement"`
   - Brave Search: `"[TICKER] product launch event 2026 confirmed"` + `"[TICKER] keynote announcement date"`

3. **Index rebalancing events (2 sources):**
   - Brave Search: `"S&P 500 rebalancing date 2026"` + `"NASDAQ-100 reconstitution schedule"`
   - Brave Search: `"[TICKER] S&P 500 addition candidate"` + `"[TICKER] index inclusion speculation"`

4. **Conference / roadshow appearances (2 sources):**
   - Company IR page → Presentations → conference schedule
   - Brave Search: `"[TICKER] conference presentation 2026"` + `"[TICKER] fireside chat transcript"`

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

**🔥 v3.2 RESEARCH-HEAVY DETECTION — EXHAUSTIVE DIP/CRASH VERIFICATION:**

**You MUST verify that the dip is TEMPORARY (not structural) using 5+ distinct sources.**

1. **Price context (3 sources):**
   - yfinance: `info.get("fiftyTwoWeekHigh")`, `info.get("fiftyTwoWeekLow")`, compute % below high
   - Browser → Yahoo Finance → ticker → 1Y chart → identify the crash point → what caused it?
   - Browser → Yahoo Finance → ticker → 5Y chart → is this a normal cycle dip or a structural breakdown?

2. **Crash cause investigation (3 sources — THE MOST IMPORTANT):**
   - Brave Search: `"[TICKER] stock drop reason [DATE OF CRASH]"` → identify the catalyst
   - Read the earnings call transcript FROM THE QUARTER OF THE CRASH → what did management say?
   - Brave Search: `"[TICKER] [CRASH REASON] temporary or structural analyst assessment"`
   - **CRITICAL CLASSIFICATION:**
     - ✅ **Temporary:** one-time charge, supply chain disruption, macro fear (not company-specific), sector rotation, post-earnings overreaction to minor miss
     - ❌ **Structural:** business model obsolescence, secular demand decline, competitive displacement, accounting fraud, debt default risk, management credibility destroyed

3. **Fundamentals during the dip (3 sources):**
   - Check: is revenue STILL growing? (If revenue is declining, it might be structural)
   - Check: is FCF STILL positive and improving? (If FCF is cratering, it might be structural)
   - Check: insiders — are they BUYING the dip? (Most important confirmation signal)
   - Brave Search: `"[TICKER] fundamentals after crash analysis"` + `"[TICKER] earnings trajectory post-selloff"`

4. **Sector context (2 sources):**
   - yfinance: pull sector ETF 1-year performance → is the whole sector down or just this stock?
   - Brave Search: `"[SECTOR] underperformance 2026 reasons"` + `"[SECTOR] rotation outlook"`

5. **Value trap check (3 sources — NEGATIVE CASE):**
   - Brave Search: `"[TICKER] value trap 2026"` + `"[TICKER] why stock keeps falling"` + `"[TICKER] short thesis 2026"`
   - Read at least 1 bearish analyst report in full — understand WHY the bears are right
   - If you cannot articulate the bear case in 3 sentences, you haven't researched enough

**FINAL RULE:** If after exhaustive research you cannot definitively classify the dip as TEMPORARY vs STRUCTURAL, default to STRUCTURAL (conservative assumption). Do NOT score the dip — only take confirmed contrarian setups.

---

### 9. 🔬 DEEP DOMAIN KNOWLEDGE (15 points — NEW in v3.0)

**This category did not exist in v2.0.** It is scored ENTIRELY from the @deep-moat-auditor's research report. The qualitative deep-dive on patents, scientific papers, physics, and manufacturing processes feeds directly into this category.

| Signal | Auto-Score | Source |
|--------|-----------|--------|
| Deep-moat-auditor score 38-50/50 | 15 pts | deep-moat-auditor report: "10+ year durable moat with physics-level barriers + data flywheel" |
| Deep-moat-auditor score 25-37/50 | 10 pts | deep-moat-auditor report: "Moderate 3-7 year moat, process/scale barriers, limited flywheel" |
| Deep-moat-auditor score 12-24/50 | 5 pts | deep-moat-auditor report: "Weak moat, short duration, limited IP, no flywheel" |
| Deep-moat-auditor score <12/50 | 0 pts | deep-moat-auditor report: "No durable moat — commodity business or pure Flywheel Supplier" |
| NO deep-moat-audit performed | 0 pts | Must do the research to score this category — no exceptions |
| **MAX: 15 pts** | | |
| **v3.2 Data Flywheel Bonus:** If 2E (Data Flywheel Moat) scores 8+/10 | +2 pts | Recognizes compounding nature of flywheel moats. Capped at 15 total. |

**🔥 The deep-moat-auditor MUST now research (v3.2):**
1. **Patent Landscape:** Core patents, expiration dates, citation networks, competitive circumvention (min 10 patents)
2. **Scientific Foundation:** Seminal papers, physics soundness, physical limits, disruption risk (min 5 papers)
3. **Manufacturing Moat:** Process complexity, equipment dependencies, replication cost (min 3 trade journal articles)
4. **Competitive Position:** Technology leadership vs peers, startup threats, customer lock-in (min 2 competitor 10-Ks)
5. **Data Flywheel Moat (NEW):** Physical deployment base, telemetry richness, closed-loop status, compounding rate, China comparison
6. **Supply Chain Demand Integrity:** 3-tier customer trace, end-user revenue verification, inventory health
7. **Physical Deployment & Data Flywheel:** Unit counts, telemetry architecture, CRR pipeline, fleet learning effect

**Minimum 20+ distinct sources per audit. Minimum 5 of 7 deep sources researched.**
A full deep-moat-audit is MANDATORY for any stock receiving a BUY recommendation.

---

## Complete Scoring Table (v3.2)

**🔥 ASSUMPTION FLAGGING (v3.2):** For each category score, append a confidence flag:
- `VERIFIED` = scored from 3+ independent, current sources → full score stands
- `INFERRED` = scored from pattern recognition or single source → flag in report, cap at 80% of max
- `ESTIMATED` = number is extrapolated or estimated → flag in report, cap at 60% of max
- `ASSUMED` = no direct data available, using proxy/conservative default → flag as CRITICAL

| # | Category | Max Points | Scoring Method | Confidence |
|---|----------|-----------|----------------|------------|
| 0 | Macro Theme Alignment | 15 | Qualitative + verified segment revenue | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 1 | Fundamental Surprise | 20 | **QUANTITATIVE TRIGGERS** (see table above) | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 2 | Technical / Chart | 15 | @vision (0-8) + short float bonus (0-7) | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 3 | Regulatory / Policy | 15 | Event + date verification | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 4 | M&A / Corporate Action | 15 | Filing-verified signals | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 5 | Insider / Smart Money | 10 | **STRICT: Selling = 0 or negative** | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 6 | Sentiment / Narrative | 15 | Analyst upgrades + short interest + target price | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 7 | Calendar Event | 10 | Date proximity | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 8 | Contrarian / Dip Setup | 10 | **PENALTY for ATH/P/E extremes** | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| 9 | Deep Domain Knowledge 🔬 | 15 | deep-moat-auditor score (patents, papers, physics, flywheel) | VERIFIED / INFERRED / ESTIMATED / ASSUMED |
| | **TOTAL** | **140** | | |

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

## 🔥 v3.2 VERIFICATION PROTOCOL — RESEARCH-HEAVY

**⚠️ Search Resilience:** If Google captcha-locks, switch to Bing/DuckDuckGo. Brave MCP fails → use browser `search.brave.com`. Direct URLs rarely block. No more than 2 captcha recovery attempts.

**🔥 MANDATORY: Every data point cross-checked against 3+ independent sources.**

1. **Primary (MANDATORY — read directly):** Company filings (10-K, 10-Q, 8-K, 13D, Form 4), government databases (SEC EDGAR, USPTO, FDA, DoD, DOE, BIS, SAM.gov), patent DBs (Google Patents full claims), science (arXiv full PDF, IEEE full text)

2. **Secondary (MANDATORY — 2+ per data point):** Financial media (Reuters, Bloomberg, WSJ — articles, not headlines), trade journals (IEEE Spectrum, SemiEngineering, Robotics Business Review), IR materials (earnings call TRANSCRIPTS)

3. **Tertiary (strongly recommended):** Analyst reports (1+ full note per stock), independent research (Gartner, IDC, McKinsey, IEA), competitor filings (2+ competitor 10-Ks)

4. **Deep source (MANDATORY — 5+):** arXiv papers (full PDF), Google Patents (full claims), IEEE Spectrum deep-dives, SemiEngineering process analysis, engineering blogs, citation networks

5. **Contrarian check (MANDATORY):** `"[TICKER] bear thesis"`, `"short case"`, `"why stock will drop"`, `"risks concerns"`, `"value trap"`. Read 2+ bearish articles IN FULL.

6. **Timeline:** Exact date from 3+ sources. Never score from single source.

7. **Price:** Browser → Yahoo Finance → live screenshot. Cross-check yfinance. >2% divergence = reconcile.

8. **Data quality (NEW):** Is data from filings or third party? <30 days old? Consistent across sources (>10% divergence = flag)? GAAP or non-GAAP? (Prefer GAAP.)

**🔥 MINIMUM SOURCES PER CATEGORY:**
| Category | Min | Key Sources |
|----------|-----|-------------|
| 0. Macro Theme | 8+ | Sector data (3), capex (3), deployment (4), filings per stock |
| 1. Fundamental | 5+ | yfinance, SEC filing, transcript, competitor, analyst estimates |
| 2. Technical | 5+ | @vision ×3 timeframes, short data ×3 |
| 3. Regulatory | 5+ | Government (2), company (2), export risk (3) |
| 4. M&A | 5+ | SEC EDGAR, media (3), 13F (2) |
| 5. Insider | 5+ | OpenInsider, Form 4, Form 144, WhaleWisdom, media |
| 6. Sentiment | 5+ | Analyst ratings (3), targets, short trend |
| 7. Calendar | 4+ | Earnings date (3 sources), IR page, events |
| 8. Contrarian | 7+ | Price (3), crash cause (3), fundamentals (3), sector (2), bear (3) |
| 9. Deep Domain | 20+ | See deep-moat-auditor requirements |

**Below minimum = score at 50% of max (conservative) and flag prominently.**

## Position Sizing Rules (v3.2):

| Quant Score | Qual Score (0-50) | Catalyst Score | Max Position | Label |
|-------------|-------------------|----------------|-------------|-------|
| >30/40 | >38/50 | 120+ | 25% | FULL+ — flywheel premium |
| >30/40 | >30/50 | 100-119 | 20% | FULL |
| >25/40 | >30/50 | 80-99 | 15% | STANDARD |
| >25/40 | >18/50 | 80-99 | 12% | MODERATE |
| >20/40 | >12/50 | 60-79 | 8% | HALF |
| <20/40 | Any | <60 | 0% | PASS |
