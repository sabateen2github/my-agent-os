---
name: catalyst-detector
description: PRIMARY screening methodology for identifying stocks poised to surge in 3-6-12 months. v2.0 BACKTEST-VALIDATED: Now runs FIRST (before infrastructure-moat), adds Macro Theme Alignment and Contrarian Timing categories. Covers catalyst types (earnings surprises, technical breakouts, regulatory events, M&A, short squeezes, insider buying, institutional flows, product launches, spin-offs, sector rotation, secular trends, contrarian setups), signal weighting, time-horizon mapping, and red flags.
license: MIT
compatibility: opencode
metadata:
  version: "2.0"
  last_updated: "2026-07-03"
  backtest_results:
    v1_pass_avg: "+14.9%"
    v1_fail_avg: "+116.6%"
    spy: "+22.3%"
    root_fix: "Catalyst scoring now runs FIRST and is the primary screen. Infrastructure moat is the quality check, not the gate."
  categories: 9
  max_score: 125
---

# Catalyst Detector — Surge Prediction Methodology v2.0

## Philosophy (v2.0 — Backtest-Hardened)

**The v1.0 approach was backwards.** We ran infrastructure-moat screening FIRST (value metrics: FCF yield, ROIC, EBITDA margins), then layered catalyst detection on top. The backtest proved this is exactly wrong: the value screen filtered out the best performers.

**v2.0 Philosophy:** Catalysts are the ENGINE of stock surges. Quality metrics are the AIRBAG — they protect you from blowups but don't predict acceleration. The surge hunter must identify WHERE the energy is building BEFORE it releases, not after.

**Core insight from backtest:** The biggest surge candidates (semiconductors in the AI supercycle) had LOW FCF yield because they were REINVESTING for hypergrowth. The market rewarded growth trajectory, not current cash generation. A stock with 0.8% FCF yield growing 50% YoY is a BETTER surge candidate than a stock with 2.5% FCF yield growing 3%.

**What actually drives surges:**
1. **Secular trend alignment** (the tide lifting all boats — #1 missing piece in v1.0)
2. **Fundamental acceleration** (revenue/FCF growth inflecting upward)
3. **Catalyst density** (multiple events forcing repricing within 3-12 months)
4. **Contrarian timing** (buying when hated, selling when loved)

**Value investing tells you WHAT to buy. Catalyst detection tells you WHEN. v2.0 runs catalyst detection FIRST.**

## The 9 Catalyst Categories (v2.0 — expanded from 7)

### 0. 🌊 MACRO THEME ALIGNMENT (3-12 month horizon) — NEW in v2.0

**This is the #1 missing piece from v1.0.** Secular mega-trends create a rising tide that lifts even mediocre boats. Stocks aligned with dominant macro themes get multiple expansion, analyst upgrades, and institutional flows simply from sector exposure.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **AI Infrastructure Beneficiary** | Company sells into data center, networking, or AI silicon supply chains. Revenue from AI/DC growing >30% YoY. | VERY HIGH |
| **Electrification / Grid Buildout** | Electrical equipment, transformers, switchgear. Backlog growing >20% YoY. | HIGH |
| **Reshoring / Industrial Renaissance** | US manufacturing, construction, automation. Benefiting from CHIPS Act, IRA, defense spending. | HIGH |
| **Defense Supercycle** | NATO spending at Cold War levels. Defense contractors with multi-year backlogs. | HIGH |
| **Energy Security** | LNG, pipelines, gas processing. European energy decoupling is structural. | MEDIUM |
| **Contrarian: Sector Out of Favor** | Sector trading at 10-year low P/E but fundamentals improving. Rotation candidate. | HIGH |

**Detection method:**
- **CRITICAL: Identify dominant macro themes BEFORE screening individual stocks.**
- Browser: Yahoo Finance → Sector performance → which sectors are leading/rebounding?
- Search: `"hyperscaler CapEx 2026"` → how much are MSFT/GOOG/AMZN/META spending on AI infra?
- Search: `"grid investment 2026 forecast"` → what's the TAM for electrical infrastructure?
- Search: `"[SECTOR] sector rotation 2026"` → which sectors are analysts rotating into?
- Use yfinance to check sector ETF performance (XLK, XLE, XLI, XLB, etc.)

**Scoring:** 0-15 points
- 15: Core beneficiary of the dominant macro theme with >30% revenue exposure
- 10: Secondary beneficiary, indirect exposure
- 5: Weak thematic alignment
- 0: No macro theme — stock must win on idiosyncratic catalysts alone

---

### 1. 🧮 FUNDAMENTAL SURPRISE CATALYSTS (3-6 month horizon)

These are the most reliable — the market consistently underestimates earnings power. **v2.0 adds growth trajectory metrics.**

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Revenue acceleration** | Revenue growth rate INCREASING QoQ for 2+ quarters (the derivative matters more than the level) | VERY HIGH |
| **FCF trajectory inflection** | FCF transitioning from negative to positive, OR FCF growth accelerating >20% QoQ | VERY HIGH |
| **Earnings acceleration** | EPS growth rate increasing QoQ for 2+ quarters | HIGH |
| **Margin expansion surprise** | Operating/EBITDA margins expanding faster than consensus expects | HIGH |
| **Guidance raise pattern** | Company raised guidance 2+ quarters in a row — analysts lagging | HIGH |
| **Return of capital surprise** | Initiated/increased buyback or dividend unexpectedly | MEDIUM |

**Detection method:**
- Pull last 4-6 quarters of revenue, EBITDA, FCF via yfinance
- Compare QoQ growth rates — **inflection points are the signal, not absolute levels**
- A company growing revenue at 5% QoQ but ACCELERATING from 2% last quarter is MORE interesting than one growing at 10% but decelerating from 15%
- Check analyst estimates (Yahoo Finance → Analysis tab) vs actuals — gap = opportunity
- Search: `"[TICKER] earnings surprise 2026"` for recent beat/miss pattern
- **FCF inflection check:** Is FCF negative now but tracking to positive within 2 quarters? If yes → VERY HIGH signal

### 2. 📈 TECHNICAL / CHART CATALYSTS (1-6 month horizon)

Chart patterns that historically precede breakouts.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Golden cross** | 50-day MA crossing above 200-day MA | HIGH |
| **Volume surge on breakout** | Price breaking resistance with 2x+ normal volume | HIGH |
| **Cup & handle formation** | U-shaped recovery + consolidation on weekly chart | MEDIUM |
| **RSI oversold reversal** | RSI < 30, then bouncing with volume | MEDIUM |
| **Short interest > 20% float** + price stabilizing | Squeeze setup | VERY HIGH |
| **Institutional accumulation** | Rising price on above-average volume for 4+ weeks | HIGH |

**Detection method:**
- **CRITICAL: Use @vision subagent for ALL chart analysis.** You cannot see images.
- Navigate browser to Yahoo Finance → ticker → Full Screen Chart → 1Y view
- Screenshot → `@vision Analyze this chart. Identify: trend direction, support/resistance levels, volume patterns, moving average crossovers, RSI/MACD signals. Is there a breakout setup?`
- Also check: Finviz, TradingView, StockCharts via browser for multi-timeframe analysis
- For short squeeze candidates: check `info.get("shortPercentOfFloat")` via yfinance

### 3. 🏛️ REGULATORY / POLICY CATALYSTS (3-12 month horizon)

Government action can reprice entire sectors overnight.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **FDA approval / Phase 3 results** | PDUFA dates, clinical trial readout calendars | VERY HIGH |
| **Export control changes** | BIS rule changes, CHIPS Act funding announcements | HIGH |
| **Antitrust resolution** | DOJ/FTC case resolution, merger clearance | HIGH |
| **Tax policy shifts** | Corporate tax rate changes, investment tax credits | MEDIUM |
| **Defense contract awards** | DoD announcements, NATO procurement | HIGH |
| **Energy policy / permitting reform** | Pipeline approvals, drilling permits, LNG export licenses | HIGH |

**Detection method:**
- Search: `"[TICKER] FDA approval date 2026"` or `"[TICKER] regulatory catalyst 2026"`
- Search: `"[TICKER] CHIPS Act grant award"` for semiconductor companies
- Search: `"[TICKER] defense contract award 2026"`
- For energy: monitor DOE export license approvals, FERC permits
- Check company investor presentations for regulatory timelines

### 4. 🤝 M&A / CORPORATE ACTION CATALYSTS (3-12 month horizon)

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Spin-off announcement** | Company splitting into 2+ entities | VERY HIGH |
| **Activist investor involvement** | 13D filing, activist letter to management | HIGH |
| **Strategic review announced** | Company exploring "strategic alternatives" | HIGH |
| **M&A target speculation** | Industry consolidation wave, peer acquisitions | MEDIUM |
| **ADR → ordinary share conversion** | Moving primary listing to US (TotalEnergies pattern) | MEDIUM |

**Detection method:**
- Search: `"[TICKER] activist investor 2026"` or `"[TICKER] spin-off 2026"`
- Search: `"[TICKER] strategic alternatives"` or `"[TICKER] merger talks"`
- Check WhaleWisdom / Dataroma for hedge fund 13F filings
- Monitor: Wall Street Journal, Bloomberg, Reuters deal reporters

### 5. 💰 INSIDER / SMART MONEY FLOW (1-6 month horizon)

Follow the people who know the business best.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **CEO/CFO buying cluster** | 3+ insiders buying within 30 days | VERY HIGH |
| **Institutional accumulation** | 13F filings showing new/increased positions | HIGH |
| **Share buyback acceleration** | Company repurchasing shares at elevated pace | MEDIUM |
| **Insider selling absence** | Zero insider sales during stock weakness | MEDIUM |

**Detection method:**
- Search: `"[TICKER] insider buying 2026"` 
- OpenInsider.com via browser — check recent cluster buys
- Search: `"[TICKER] share buyback program 2026"`
- For institutional: WhaleWisdom, Dataroma, or search `"[TICKER] hedge fund position 2026"`

### 6. 📡 SENTIMENT / NARRATIVE CATALYSTS (1-3 month horizon)

When the story changes, the multiple changes.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Analyst upgrade cluster** | 3+ analyst upgrades in 2 weeks | HIGH |
| **Short report debunked** | Short thesis proven wrong by earnings/data | HIGH |
| **Index inclusion** | Added to S&P 500, NASDAQ-100, or major ETF | HIGH |
| **Media narrative shift** | Positive coverage replacing negative coverage | MEDIUM |
| **Conference presentation catalyst** | Major product reveal at industry conference | MEDIUM |
| **Short interest decline** | Shorts covering without price rising much — coiled spring | HIGH |

**Detection method:**
- Browser: Yahoo Finance → ticker → Analysis tab → analyst ratings trend
- Search: `"[TICKER] analyst upgrade 2026"`
- Search: `"[TICKER] short report"` or `"[TICKER] short interest"`
- Check short interest trend: yfinance `info.get("shortPercentOfFloat")` and `info.get("shortRatio")`
- Reddit: `"[TICKER] reddit wallstreetbets"` for retail sentiment spike

### 7. 📅 CALENDAR CATALYSTS (Known Dates That Move Stocks)

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Earnings date** | Quarterly earnings announcement | VERY HIGH |
| **Investor day / Analyst day** | Company hosting multi-hour strategy presentation | HIGH |
| **Product launch event** | Apple keynote, Tesla AI Day, NVIDIA GTC equivalent | HIGH |
| **Options expiration** | Monthly/quarterly OPEX — gamma/short-delta effects | LOW |
| **Index rebalancing** | S&P/NASDAQ quarterly rebalance | MEDIUM |
| **Tax-loss harvesting reversal** | January effect for beaten-down stocks | LOW |

**Detection method:**
- Yahoo Finance → ticker → earnings tab → next earnings date
- Company IR website → events calendar
- Search: `"[TICKER] investor day 2026"` or `"[TICKER] product launch 2026"`

### 8. 🎯 CONTRARIAN TIMING / DEEP VALUE SETUP (3-12 month horizon) — NEW in v2.0

The biggest surges often come from stocks the market has given up on — but where fundamentals are quietly improving. This category captures mean-reversion and "hated stock, improving business" setups.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Sector out of favor + fundamentals improving** | Stock in worst-performing sector (bottom 3 of 11) BUT revenue/earnings growth accelerating | VERY HIGH |
| **Post-earnings pullback on non-structural news** | Stock drops >20% on earnings but the miss was one-time (derivative timing, FX, weather) | VERY HIGH |
| **52-week low + insider buying** | Stock near 52-week low AND 3+ insiders buying within 30 days | VERY HIGH |
| **Analyst capitulation** | >50% of analysts downgraded in past 3 months, but company just beat estimates | HIGH |
| **Short interest spike + price stabilizing** | Short interest increased >50% but price stopped falling — shorts trapped | HIGH |
| **Valuation anomaly** | Stock trading at 5-year low P/E, P/B, or EV/EBITDA despite stable/improving business | MEDIUM |
| **Neglected mega-cap** | $150B+ company with <15 analyst coverage (underfollowed = mispricing opportunity) | MEDIUM |

**Detection method:**
- Browser: Yahoo Finance → ticker → Statistics tab → 52-week range
- Search: `"[TICKER] 52-week low"` or `"[TICKER] analyst downgrade 2026"`
- Check short interest: `info.get("shortPercentOfFloat")` and `info.get("shortRatio")` via yfinance
- Browser: Finviz screener → "52-week low" filter + "insider buying"
- Search: `"[TICKER] worst performing sector 2026"`
- Check if the bad news is STRUCTURAL (business model broken) or TEMPORARY (one-time charges, cycle timing, acquisition noise)

**CRITICAL DISTINCTION — Contrarian vs. Value Trap:**
- ✅ **Contrarian:** Temporary headwinds, fixing itself in 3-12 months. Business IS improving but the market doesn't see it yet.
- ❌ **Value Trap:** Structural decline, management in denial. Stock is cheap for a reason that won't change.

If you can't articulate the SPECIFIC catalyst that will change the narrative within 12 months → it's a value trap, not a contrarian play. Kill it.

| # | Category | Max Points | Score | Rationale |
|---|----------|-----------|-------|-----------|
| 0 | **Macro Theme Alignment** | 15 | ? | [Secular trend + revenue exposure evidence] |
| 1 | **Fundamental Surprise** | 20 | ? | [Revenue/FCF acceleration, margin expansion, guidance pattern] |
| 2 | **Technical Breakout** | 15 | ? | [Chart pattern + @vision confirmation] |
| 3 | **Regulatory/Policy** | 15 | ? | [Specific event + date] |
| 4 | **M&A/Corporate Action** | 15 | ? | [Spin-off, activist, or merger signal] |
| 5 | **Insider/Smart Money** | 10 | ? | [Recent buying patterns] |
| 6 | **Sentiment/Narrative** | 15 | ? | [Analyst upgrades, media shift] |
| 7 | **Calendar Event** | 10 | ? | [Known dates that force repricing] |
| 8 | **Contrarian Timing** | 10 | ? | [Hated stock, improving fundamentals, temporary vs structural] |
| | **TOTAL** | **125** | **?** | |

### Conviction Thresholds (v2.0 — adjusted for 9 categories / 125 max):
- **100+ points:** 🟢 HIGH CONVICTION — Multiple strong catalysts across categories, dominant macro theme, clear timeline
- **80-99 points:** 🟡 MEDIUM CONVICTION — Good catalysts but some uncertainty on timing or magnitude
- **60-79 points:** 🟠 LOW CONVICTION — Interesting but insufficient catalyst density; size position smaller
- **<60 points:** 🔴 NO SURGE THESIS — Avoid unless dividend/income play

### v2.0 Weighting Note:
The new categories (0: Macro Theme, 8: Contrarian Timing) redistribute weight. A stock that scores 0 on Category 0 (no macro theme) needs 80+ from the remaining 8 categories to hit medium conviction — it can still qualify, but must work harder. This correctly biases the system toward secular trend beneficiaries while allowing idiosyncratic winners through.

## Time Horizon Mapping (v2.0)

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
| Contrarian mean reversion | 3-12 months (requires catalyst to trigger)

## Red Flags — Kill the Surge Thesis (v2.0)

Even if catalysts look strong, kill the surge prediction if:

| Red Flag | Why It Kills the Surge |
|----------|----------------------|
| **Insider selling cluster** | The people who know best are getting out |
| **Short interest <2% with price declining** | Not a squeeze candidate; genuine selling pressure |
| **Revenue deceleration (3+ quarters)** | Growth story broken; value trap forming — **this is the #1 killer for Path A stocks** |
| **SEC investigation / accounting concerns** | Existential risk trumps any catalyst |
| **CEO/CFO departure (unplanned)** | Leadership vacuum — catalysts don't materialize without execution |
| **Debt covenant breach risk** | Bankruptcy risk overrides all catalysts |
| **Major customer loss** | >20% revenue concentration with client loss = thesis broken |
| **Technological obsolescence** | Core product being replaced |
| **VALUE TRAP ALERT** (new v2.0) | Stock is cheap but for STRUCTURAL reasons — no catalyst to change the narrative within 12 months |

### v2.0 Red Flag Nuance:
A company CAN have low FCF yield and still be a great surge candidate — IF it's in a secular trend with revenue growing >10% and FCF trajectory improving. The red flag is NOT "low FCF yield" — it's "low FCF yield with NO growth and NO catalyst." That's a value trap. The backtest proved this distinction is everything.

## Verification Protocol

**Never rely on a single source for catalyst detection.** For each catalyst identified:

1. **Primary source:** Company filings, official announcements, government databases
2. **Secondary source:** Financial media (Reuters, Bloomberg, WSJ)
3. **Tertiary:** Analyst reports, expert commentary, industry publications
4. **Contrarian check:** Search for bear case — `"[TICKER] bear thesis"` or `"[TICKER] short case"`
5. **Timeline verification:** Exact date if calendar catalyst; date range if event-driven

## Integration with Infrastructure Moat SOP (v2.0 — ORDER FLIPPED)

**The v1.0 sequence was WRONG** (backtest-proven). The v2.0 sequence:

```
catalyst-detector FIRST     →  "Will this stock SURGE in 3/6/12 months and WHY?"
         ↓
   Filter: Only stocks with 60+ catalyst score advance
         ↓
infrastructure-moat SECOND  →  "Is this a GOOD BUSINESS or a risky trade?"
         ↓
   Quality score determines POSITION SIZE, not inclusion
         =
   HIGH-CONVICTION SURGE PREDICTION with quality-calibrated sizing
```

### Position Sizing Rules (v2.0):

| Catalyst Score | Quality Score | Action | Max Position Size |
|---------------|---------------|--------|-------------------|
| 100+ | 3/3+ (Path A or B) | 🟢 **FULL SIZE** — Holy grail. Surge + quality. | 25% of portfolio |
| 100+ | 1-2/3 | 🟡 **SIZE 75%** — Great catalyst, weaker business. Trade, not investment. | 18% |
| 80-99 | 3/3+ | 🟡 **SIZE 75%** — Good catalyst, great business. | 18% |
| 80-99 | 1-2/3 | 🟠 **HALF SIZE** — Good catalyst, risky business. | 12% |
| 60-79 | 3/3+ | 🟠 **HALF SIZE** — Weak catalyst, great business. Income play. | 12% |
| 60-79 | 1-2/3 | 🔴 **TRACKER ONLY** — Not enough catalyst OR quality. Watch, don't buy. | 0% |
| <60 | Any | 🔴 **PASS** — No surge thesis. | 0% |

### Key v2.0 Insight:
A company with 100+ catalyst score and 1/3 quality (e.g., MU at 0.69% FCF yield but in AI supercycle with FCF inflecting positive) is a **BETTER surge candidate** than a company with 70 catalyst score and 3/3 quality (e.g., a slow-growth utility with a buyback). The backtest proved this by 101.7 percentage points.

**The quality score is a RISK CALIBRATOR, not a GATE.** It tells you how much pain you'll endure if the catalyst takes longer than expected. High quality = you can wait. Low quality = if the catalyst doesn't fire on schedule, you get hurt.
