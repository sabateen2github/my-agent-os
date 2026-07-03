---
name: catalyst-detector
description: Methodology for identifying stocks poised to surge in 3-6-12 months. Covers catalyst types (earnings surprises, technical breakouts, regulatory events, M&A, short squeezes, insider buying, institutional flows, product launches, spin-offs, sector rotation), signal weighting, time-horizon mapping, and red flags. Use when predicting stock price movements, hunting for asymmetric opportunities, or layering timing on top of fundamental analysis.
license: MIT
compatibility: opencode
metadata:
  version: "1.0"
  last_updated: "2026-07-03"
---

# Catalyst Detector — Surge Prediction Methodology

## Philosophy

Value investing tells you WHAT to buy. Catalyst detection tells you WHEN. A stock can be undervalued for years without moving. The catalyst is the spark that forces the market to reprice it. This methodology layers timing prediction on top of fundamental quality screening (from the `infrastructure-moat` SOP).

## The 7 Catalyst Categories

### 1. 🧮 FUNDAMENTAL SURPRISE CATALYSTS (3-6 month horizon)

These are the most reliable — the market consistently underestimates earnings power.

| Signal | How to Detect | Weight |
|--------|--------------|--------|
| **Earnings acceleration** | Revenue growth rate increasing QoQ for 2+ quarters | HIGH |
| **Margin expansion surprise** | Operating/EBITDA margins expanding faster than consensus expects | HIGH |
| **Guidance raise pattern** | Company raised guidance 2+ quarters in a row — analysts lagging | HIGH |
| **FCF inflection** | Company transitioning from FCF-negative to FCF-positive | VERY HIGH |
| **Return of capital surprise** | Initiated/increased buyback or dividend unexpectedly | MEDIUM |

**Detection method:**
- Pull last 4 quarters of revenue, EBITDA, FCF via yfinance
- Compare QoQ growth rates — inflection points are the signal
- Check analyst estimates (Yahoo Finance → Analysis tab) vs actuals — gap = opportunity
- Search: `"[TICKER] earnings surprise 2026"` for recent beat/miss pattern

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

## Catalyst Scoring Framework

For each candidate, score catalysts across the 7 categories:

| Category | Max Points | Score | Rationale |
|----------|-----------|-------|-----------|
| Fundamental Surprise | 20 | ? | [Specific catalyst + evidence] |
| Technical Breakout | 15 | ? | [Chart pattern + @vision confirmation] |
| Regulatory/Policy | 15 | ? | [Specific event + date] |
| M&A/Corporate Action | 15 | ? | [Spin-off, activist, or merger signal] |
| Insider/Smart Money | 10 | ? | [Recent buying patterns] |
| Sentiment/Narrative | 15 | ? | [Analyst upgrades, media shift] |
| Calendar Event | 10 | ? | [Known dates that force repricing] |
| **TOTAL** | **100** | **?** | |

### Conviction Thresholds:
- **85+ points:** 🟢 HIGH CONVICTION — Multiple strong catalysts across categories, clear timeline
- **70-84 points:** 🟡 MEDIUM CONVICTION — Good catalysts but some uncertainty on timing or magnitude
- **55-69 points:** 🟠 LOW CONVICTION — Interesting but insufficient catalyst density
- **<55 points:** 🔴 NO SURGE THESIS — Good company, no catalyst. Buy for dividend, not surge.

## Time Horizon Mapping

| Catalyst Type | Typical Time to Price Impact |
|--------------|------------------------------|
| Earnings surprise | 1 day to 3 months (gap + drift) |
| Technical breakout | 1 week to 3 months |
| FDA/Regulatory decision | Day of announcement |
| M&A announcement | Immediate (premium) |
| Spin-off completion | 3-12 months (unlock value) |
| Insider buying cluster | 1-6 months |
| Analyst upgrade wave | 1-4 weeks |
| Index inclusion | Announcement to effective date (2-4 weeks) |
| Short squeeze | Days to weeks (violent) |
| Activist campaign | 3-12 months |

## Red Flags — Kill the Surge Thesis

Even if fundamentals (infrastructure-moat SOP) look good, kill the surge prediction if:

| Red Flag | Why It Kills the Surge |
|----------|----------------------|
| **Insider selling cluster** | The people who know best are getting out |
| **Short interest <2% with price declining** | Not a squeeze candidate; genuine selling pressure |
| **Revenue deceleration (3+ quarters)** | Growth story broken; value trap forming |
| **SEC investigation / accounting concerns** | Existential risk trumps any catalyst |
| **CEO/CFO departure (unplanned)** | Leadership vacuum — catalysts don't materialize without execution |
| **Debt covenant breach risk** | Bankruptcy risk overrides all catalysts |
| **Major customer loss** | >20% revenue concentration with client loss = thesis broken |
| **Technological obsolescence** | Core product being replaced (e.g., ICE parts during EV transition) |

## Verification Protocol

**Never rely on a single source for catalyst detection.** For each catalyst identified:

1. **Primary source:** Company filings, official announcements, government databases
2. **Secondary source:** Financial media (Reuters, Bloomberg, WSJ)
3. **Tertiary:** Analyst reports, expert commentary, industry publications
4. **Contrarian check:** Search for bear case — `"[TICKER] bear thesis"` or `"[TICKER] short case"`
5. **Timeline verification:** Exact date if calendar catalyst; date range if event-driven

## Integration with Infrastructure Moat SOP

The two methodologies work together in sequence:

```
infrastructure-moat SOP      →  "Is this a GOOD BUSINESS with a durable moat?"
         +
catalyst-detector methodology →  "Will the stock SURGE in 3/6/12 months and WHY?"
         =
      HIGH-CONVICTION SURGE PREDICTION
```

A company with 3/3 PASS on infrastructure moat AND 80+ catalyst score is the holy grail. A company with strong catalysts but 1/3 fundamentals is a trade, not an investment — flag it as such.
