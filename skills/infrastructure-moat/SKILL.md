---
name: infrastructure-moat
description: Rigorous 3-stage SOP for analyzing physical infrastructure moat stocks. Use when screening stocks for FCF yield, ROIC, EBITDA margins, competitive moats (patents, chokepoints), and supply chain resilience. CRITICAL v2.0 UPDATE: Backtest (Jul 2025-2026) proved strict FCF filters kill the best surge candidates. NOW USES: Secular Growth Override, FCF Trajectory scoring, sector-specific thresholds, and Cyclical Rebound Override. Designed for concentrated high-conviction portfolios (4-6 positions).
license: MIT
compatibility: opencode
metadata:
  sop_version: "2.0"
  last_updated: "2026-07-03"
  backtest_results:
    v1_3of3_pass_avg_return: "+14.9%"
    v1_0to1_fail_avg_return: "+116.6%"
    spy_return: "+22.3%"
    v1_alpha_vs_spy: "-7.4%"
    root_cause: "FCF yield >1.5% filter eliminated semiconductor sector during AI supercycle"
  criteria:
    fcf_yield_base: 1.5
    fcf_yield_growth_override: 0.5
    fcf_yield_cyclical_override: 0.0
    roic_min: 15
    ebitda_margin_base: 15
    ebitda_margin_growth_override: 10
    revenue_growth_qoq_min: 5
    market_cap_min_b: 150
---

# Infrastructure Moat Analyzer — 4-Stage SOP v2.0

## Overview

This methodology has been **backtest-validated and overhauled**. The v1.0 approach (strict FCF yield filter, kill-early philosophy) produced a **14.9% average return vs 22.3% for the S&P 500** over the Jul 2025-2026 period — an embarrassing -7.4% alpha. Meanwhile, the stocks it rejected averaged **+116.6%**.

**Root cause:** The FCF yield > 1.5% filter systematically eliminated every semiconductor stock riding the AI infrastructure supercycle. The methodology rewarded slow-growth dividend payers and punished companies reinvesting for hypergrowth.

**v2.0 Philosophy:** Catalysts and growth trajectory come FIRST. Quality metrics are a SAFETY NET, not a gate. The methodology now has two screening paths:
- **Path A (Growth/Surge):** For companies in secular mega-trends — relaxed thresholds, emphasis on FCF trajectory and revenue acceleration
- **Path B (Value/Quality):** For mature infrastructure plays — traditional thresholds still apply

The methodology is designed for concentrated portfolios (4-6 positions, 40K+ JOD / ~$56K USD).

## The Universe

Pull all publicly traded companies with **market cap > $150 billion USD**. Filter to sectors relevant to physical infrastructure:

| INCLUDE (infrastructure sectors) | EXCLUDE (consumer / financial / media) |
|----------------------------------|----------------------------------------|
| Semiconductors & Equipment | Consumer brands / luxury |
| Data Center & Networking | Pure financials (banks, insurance) |
| Energy Infrastructure (oil, gas, LNG, pipelines, nuclear) | Media / advertising / streaming |
| Mining & Commodities | Insurance conglomerates |
| Industrial Automation & Electrical | Social media |
| Railways & Transportation | Pure software / SaaS (no physical assets) |
| Defense & Aerospace | Retail / consumer goods |
| Telecom & Tower Infrastructure | Healthcare / pharma |
| Battery & EV Supply Chain | Gaming |
| Industrial Gases & Chemicals | Food & beverage |
| Water & Environmental Infrastructure | — |

## SOP Step 0: Secular Trend Identification (NEW — v2.0)

**CRITICAL: This step runs BEFORE any quantitative filters. It determines which screening path to use.**

### Active Secular Mega-Trends (as of 2026):

| Trend | Sectors Affected | Why It Overrides Value Filters |
|--------|-----------------|-------------------------------|
| **AI Infrastructure Buildout** | Semiconductors, data center, networking, power/electrical | Hyperscalers spending $300B+/yr on AI infra. Every semi company reinvesting FCF for capacity. Low FCF yield is NORMAL — it means they're building capacity for demand they can't yet meet. |
| **Electrification / Grid Modernization** | Electrical equipment, transformers, switchgear, cables | Global grid investment doubling by 2030. Backlogs at all-time highs. Low FCF yield = capacity expansion for decade-long demand wave. |
| **Reshoring / Industrial Renaissance** | US manufacturing, construction equipment, automation | CHIPS Act, IRA, defense spending driving multi-decade capex cycle |
| **Defense / Geopolitical Rearmament** | Aerospace, defense contractors, shipbuilding | NATO spending at Cold War levels. Multi-year production ramps. |
| **Energy Security / LNG Infrastructure** | LNG, pipelines, gas processing | European decoupling from Russian gas is structural, not cyclical |

### How to Use This Step:

1. For each stock, ask: **"Is this company a direct beneficiary of a verified secular mega-trend?"**
2. If YES → **Route to Path A (Growth/Surge)** with relaxed thresholds
3. If NO → **Route to Path B (Value/Quality)** with traditional thresholds
4. You MUST cite specific evidence: capital spending trends, industry backlog data, government policy, hyperscaler CapEx guidance

### Path Selection Decision Tree:
```
Is the company in a verified secular mega-trend?
├── YES → Has revenue growth >10% YoY?
│   ├── YES → PATH A: Growth/Surge (relaxed thresholds)
│   └── NO  → PATH B: Value/Quality (traditional thresholds — check if at cyclical trough)
└── NO  → PATH B: Value/Quality (traditional thresholds)
```

---

## SOP Step 1: The Quantitative Filter — Dual-Path v2.0

**This is NOT a kill gate anymore. It's a scoring system. No stock is auto-killed — every stock gets a quantified score with overrides applied.**

### Path A: Growth/Surge Thresholds (for secular trend beneficiaries)

| Metric | Threshold | Why Relaxed |
|--------|-----------|-------------|
| **FCF Yield** | **> 0.5%** (or positive FCF trajectory) | Companies in secular booms SHOULD reinvest cash. FCF yield is temporarily suppressed by capacity buildout. The trajectory matters more than the absolute yield. |
| **Revenue Growth (YoY)** | **> 10%** | Growth is the primary signal. If revenue is growing fast in a secular trend, the company is capturing demand. |
| **FCF Trajectory** | **Improving QoQ OR positive YoY** | Even if absolute FCF yield is low, is it getting better? Inflection point > current level. |
| **ROIC** | **> 12%** | Slightly relaxed — growth companies may have temporarily depressed ROIC during capex cycles |
| **EBITDA Margin** | **> 10%** | Slightly relaxed — capacity buildout depresses margins temporarily |

### Path B: Value/Quality Thresholds (for mature infrastructure)

| Metric | Threshold | Why |
|--------|-----------|-----|
| **FCF Yield** | **> 1.5%** | Mature companies with no secular growth tailwind must return cash to shareholders NOW. |
| **ROIC** | **> 15%** | Standard quality threshold — capital efficiency matters when growth is slow |
| **EBITDA Margin** | **> 15%** | Standard profitability threshold |

### Override Mechanisms (apply to BOTH paths):

#### 1. FCF Trajectory Override
If FCF yield is below threshold BUT:
- FCF has been growing > 20% QoQ for 2+ quarters → **override to PASS on FCF**
- Company is transitioning from FCF-negative to FCF-positive this quarter → **override to PASS**
- FCF is temporarily depressed by a one-time acquisition/integration cost → **flag and manually assess**

#### 2. Cyclical Rebound Override
If the company is at a **verified cyclical trough** (semiconductor downcycle, energy capex trough, industrial recession) with a **known catalyst for recovery** (capacity absorption, new product cycle, policy tailwind):
- FCF yield threshold → **WAIVED entirely**
- ROIC threshold → reduced to **> 8%**
- Must cite: specific evidence of cycle bottom + recovery catalyst + timeline
- Flag as: "CYCLICAL REBOUND — higher risk, higher reward"

#### 3. Monopoly / Chokepoint Override
If the company has a **genuine single-vendor monopoly** with zero competitors for 5+ years:
- FCF yield → waived down to 0.5%
- ROIC → waived down to 10%
- Must explicitly justify with evidence of moat durability

### Scoring (Path-Aware):
- **Path A — 4/5 or 5/5 = ✅ STRONG PASS** → advance to Step 2
- **Path A — 3/5 = ⚠️ CONDITIONAL** → advance with caveat (identify what needs to improve)
- **Path A — 1-2/5 = 🟠 WEAK** → high risk, but still advance if catalyst score > 70
- **Path B — 3/3 = ✅ PASS** → advance to Step 2
- **Path B — 2/3 = ⚠️ PASS** → advance with caveat noted
- **Path B — 0-1/3 = 🟠 WEAK** → advance ONLY if catalyst score > 80

**CRITICAL v2.0 RULE: NO STOCK IS AUTO-KILLED AT STEP 1.** Even a 0/3 Path B stock with a monster catalyst (spin-off, FDA approval, short squeeze) gets analyzed. The quality score determines PORTFOLIO WEIGHT, not inclusion/exclusion.

### Sector-Specific Normal FCF Yield Ranges (for context):

| Sector | Normal FCF Yield Range | Why |
|--------|----------------------|-----|
| Semiconductors (growth phase) | 0.3% – 2.0% | Heavy reinvestment for capacity |
| Semiconductors (mature) | 2.0% – 6.0% | Capex lightens after capacity built |
| Energy (oil & gas) | 3.0% – 10.0% | Capital returns prioritized |
| Industrial / Electrical | 1.5% – 4.0% | Moderate capex requirements |
| Aerospace / Defense | 1.5% – 5.0% | Long-cycle production |
| Mining / Commodities | 2.0% – 8.0% | Cyclical — high at peak, low at trough |
| Data Center REITs | 2.0% – 6.0% | REIT structure, high payout ratios |
| Telecom / Tower | 4.0% – 10.0% | Mature infrastructure, high payout |

### Data Source
Use `yfinance` Python library for TTM financial data. **v2.0 adds quarterly data for trajectory analysis:**

```python
import yfinance as yf
stock = yf.Ticker("TICKER")
info = stock.info

# TTM metrics
market_cap = info.get("marketCap")
revenue_ttm = info.get("totalRevenue")
ebitda_ttm = info.get("ebitda")
fcf = info.get("freeCashflow")
net_income = info.get("netIncomeToCommon")
total_debt = info.get("totalDebt") or 0
total_cash = info.get("totalCash") or 0
total_equity = info.get("stockholdersEquity") or info.get("bookValue") or 0

# v2.0: Growth metrics
revenue_growth_yoy = info.get("revenueGrowth")  # YoY %
earnings_growth_yoy = info.get("earningsGrowth")  # YoY %
quarterly_revenue_growth = info.get("quarterlyRevenueGrowth")  # QoQ %

# Quarterly data for FCF trajectory (last 4 quarters)
qf = stock.quarterly_financials
qcf = stock.quarterly_cashflow

# Extract last 4 quarters of FCF
fcf_quarters = []
for i in range(min(4, len(qcf.columns))):
    col = qcf.columns[i]
    ocf = qcf.loc["Total Cash From Operating Activities", col] if "Total Cash From Operating Activities" in qcf.index else 0
    capex = qcf.loc["Capital Expenditures", col] if "Capital Expenditures" in qcf.index else 0
    fcf_quarters.append(ocf + capex)  # capex is negative

# FCF trajectory: is FCF accelerating?
if len(fcf_quarters) >= 4:
    fcf_qoq_growth = [(fcf_quarters[i] - fcf_quarters[i+1]) / abs(fcf_quarters[i+1]) * 100 
                      for i in range(len(fcf_quarters)-1) if fcf_quarters[i+1] != 0]
    fcf_accelerating = all(g > 0 for g in fcf_qoq_growth) if fcf_qoq_growth else False
    fcf_inflecting = (fcf_quarters[0] > 0 and fcf_quarters[-1] < 0)  # turned positive

# Core metrics
fcf_yield = (fcf / market_cap * 100) if fcf and market_cap else None
ebitda_margin = (ebitda_ttm / revenue_ttm * 100) if ebitda_ttm and revenue_ttm else None

if net_income and total_equity:
    invested_capital = total_equity + total_debt - total_cash
    roic = (net_income / invested_capital * 100) if invested_capital > 0 else None
else:
    roic = None

# Determine path
in_secular_trend = False  # Set based on Step 0 analysis
if in_secular_trend and revenue_growth_yoy and revenue_growth_yoy > 0.10:
    path = "PATH_A"  # Growth/Surge
else:
    path = "PATH_B"  # Value/Quality
```

### Output Format (Step 1 v2.0):

```
| Ticker | Trend? | Path | FCF Y% | FCF Traj | RevG% | ROIC% | EBITDA% | Score | Verdict |
|--------|--------|------|--------|----------|-------|-------|---------|-------|---------|
| AVGO   | AI ✅  | A    | 0.85   | ACCEL ↑  | +84%  | 64.7  | 55.8    | 4/5   | ✅ STRONG (Growth) |
| CVX    | N      | B    | 3.49   | stable    | N/A   | 27.5  | 20.4    | 3/3   | ✅ PASS (Value) |
| NVDA   | AI ✅  | A    | 0.98   | ACCEL ↑  | +112% | N/A   | 65.3    | 4/5   | ✅ STRONG (Growth — WAS KILLED in v1!) |
| MU     | AI ✅  | A    | 0.69   | INFLECT ↑ | +55%  | N/A   | 75.6    | 3/5   | ⚠️ COND (FCF inflecting positive) |
```

## SOP Step 2: Technology Reality Check (Domain Expertise)

For companies that pass Step 1, evaluate three dimensions:

### 2A: Technology Readiness Level (TRL) — Scale of 1-9

| TRL | Definition | Signal |
|-----|-----------|--------|
| 1-3 | Basic research / lab prototype | ❌ FAIL — speculative |
| 4-6 | Pilot / demonstration | ⚠️ Risky — not yet revenue-generating at scale |
| 7-8 | Production ramp / early deployment | ⚠️ Acceptable if growing fast |
| 9 | High-volume production, deployed at scale | ✅ The only acceptable TRL for an infrastructure play |

**Action:** If core revenue-driving products are below TRL 8, flag as "R&D-dependent" and downgrade conviction.

### 2B: IP Architecture — Scale of 1-5

| Score | Definition | Example |
|-------|-----------|---------|
| 5 | Single-vendor monopoly — patents + trade secrets, 10+ year barrier | ASML EUV |
| 4 | Duopoly/oligopoly with proprietary technology, 5-10 year barrier | GE/RTX aircraft engines |
| 3 | Process engineering + scale moat, 3-5 year barrier | Linde industrial gases |
| 2 | Commodity with some differentiation, 1-3 year barrier | Amphenol connectors |
| 1 | Commodity — no durable IP | Pure oil producers |

### 2C: Infrastructure Chokepoint — Scale of 1-5

| Score | Definition | Example |
|-------|-----------|---------|
| 5 | The broader tech ecosystem literally cannot function without this | ASML (no chips without EUV), TSMC (no advanced fab) |
| 4 | Critical but alternatives exist at much higher cost/time | Broadcom networking silicon |
| 3 | Important but substitutable over time | Industrial gases, connectors |
| 2 | Useful but easily replaced | Commodity chemicals |
| 1 | No chokepoint value | Retail, consumer goods |

**Action:** Score each dimension. Companies scoring TRL<8, IP<3, or Chokepoint<3 should be downgraded significantly.

### Output Format (Step 2):

```
| Ticker | TRL | IP Score | Chokepoint | Moats Identified | Verdict |
|--------|-----|----------|------------|------------------|---------|
| XXXX   | 9   | 5        | 5          | Patent monopoly, 50+ year installed base | ✅ STRONG |
| YYYY   | 9   | 3        | 3          | Scale + contracts, no tech IP | ⚠️ MODERATE |
```

## SOP Step 3: Macro & Supply Chain Resilience

### 3A: Manufacturing / Foundry Dependency

Map the physical supply chain. Identify:
- **Where is the core product made?** (country, specific facility)
- **Single point of failure?** (one factory, one supplier, one region)
- **Lead time to build alternative capacity?** (years, cost)

| Risk Level | Definition |
|-----------|------------|
| 🔴 HIGH | Single facility, single country, no backup (e.g., TSMC Taiwan fabs for NVIDIA) |
| 🟡 MODERATE | Multiple facilities but concentrated region |
| 🟢 LOW | Globally distributed manufacturing |

### 3B: Geopolitical & Export Risk

- **Tariffs:** Is the product caught in US-China/EU trade disputes?
- **Export controls:** Can the government ban sales to key markets?
- **Sanctions risk:** Is the company exposed to sanctioned countries?
- **Conflict risk:** Are facilities near active or potential conflict zones?

### 3C: Customer Concentration

- Any single customer > 20% of revenue? → +1 risk level
- Government/defense as primary customer? → political cycle risk
- Commodity price exposure? → cycle risk

### Output Format (Step 3):

```
| Ticker | Mfg Risk | Geo Risk | Customer Risk | Key Vulnerabilities |
|--------|----------|----------|---------------|---------------------|
| XXXX   | 🟡 MOD   | 🔴 HIGH  | 🟢 LOW        | Taiwan Strait, TSMC dependency |
| YYYY   | 🟢 LOW   | 🟢 LOW   | 🟡 MOD        | 20% customer concentration (Meta) |
```

## Final Report Format

After completing all 3 stages, produce:

### Portfolio Recommendation Table

| # | Ticker | Name | Allocation (JOD) | % | Conviction | Role |
|---|--------|------|-----------------|---|------------|------|
| 1 | XXXX | ... | X,XXX | XX% | HIGH/MED | [1-line thesis] |

### Risk Concentration Audit

| Risk Scenario | Impact | Mitigation |
|---------------|--------|------------|
| [Scenario] | [Which positions hit] | [What protects] |

### Excluded Candidates (with reasons)

List companies that were analyzed but not selected, with a 1-line reason for exclusion.

## Python Analysis Template v2.0

Use this template to pull and process data for the full universe with dual-path scoring:

```python
import yfinance as yf

TICKERS = ["list", "of", "tickers"]  # Populate from universe scan
results = []

# Define secular trend beneficiaries (from Step 0 analysis)
SECULAR_TREND_TICKERS = set()  # e.g. {"AVGO", "NVDA", "AMD", "MRVL", "ANET", "ETN", ...}

for t in TICKERS:
    try:
        stock = yf.Ticker(t)
        info = stock.info
        
        mc = info.get("marketCap")
        rev = info.get("totalRevenue")
        ebitda = info.get("ebitda")
        fcf = info.get("freeCashflow")
        ni = info.get("netIncomeToCommon")
        debt = info.get("totalDebt") or 0
        cash = info.get("totalCash") or 0
        equity = info.get("stockholdersEquity") or info.get("bookValue") or 0
        
        # Growth metrics (v2.0)
        rev_growth = info.get("revenueGrowth")
        earn_growth = info.get("earningsGrowth")
        
        fy = round(fcf / mc * 100, 2) if (fcf and mc) else None
        ebitda_m = round(ebitda / rev * 100, 1) if (ebitda and rev) else None
        
        if ni and equity:
            ic = equity + debt - cash
            roic = round(ni / ic * 100, 1) if ic > 0 else None
        else:
            roic = None
        
        # Determine path
        in_trend = t in SECULAR_TREND_TICKERS
        rev_ok = rev_growth and rev_growth > 0.10
        path = "A" if (in_trend and rev_ok) else "B"
        
        # Score based on path
        score = 0
        max_score = 5 if path == "A" else 3
        
        if path == "A":
            # Growth/Surge path: 5 metrics
            if fy and fy > 0.5: score += 1
            if rev_growth and rev_growth > 0.10: score += 1
            if roic and roic > 12: score += 1
            if ebitda_m and ebitda_m > 10: score += 1
            # FCF trajectory (check if FCF improving QoQ)
            # Simplified: if earnings_growth > 0 and rev_growth > 0: score += 1
            if earn_growth and earn_growth > 0 and rev_growth and rev_growth > 0: score += 1
        else:
            # Value/Quality path: 3 metrics
            if fy and fy > 1.5: score += 1
            if roic and roic > 15: score += 1
            if ebitda_m and ebitda_m > 15: score += 1
        
        # Verdict (v2.0: no auto-kill)
        if path == "A":
            verdict = "STRONG" if score >= 4 else ("CONDITIONAL" if score >= 3 else "WEAK")
        else:
            verdict = "PASS" if score >= 3 else ("MARGINAL" if score >= 2 else "WEAK")
        
        results.append({
            "ticker": t,
            "name": info.get("shortName", t),
            "path": path,
            "in_trend": in_trend,
            "mcap_B": round(mc/1e9, 1) if mc else None,
            "fcf_yield": fy,
            "roic": roic,
            "ebitda_margin": ebitda_m,
            "rev_growth": round(rev_growth*100,1) if rev_growth else None,
            "score": f"{score}/{max_score}",
            "verdict": verdict,
        })
    except Exception as e:
        results.append({"ticker": t, "error": str(e)})

# Print results
for r in results:
    if "error" in r:
        print(f"{r['ticker']:<8} ERROR: {r['error']}")
    else:
        print(f"{r['ticker']:<8} {r['name']:<25} Path={r['path']} Trend={'Y' if r.get('in_trend') else 'N'} FY={r['fcf_yield']}% RevG={r.get('rev_growth')}% ROIC={r['roic']}% EB={r['ebitda_margin']}% Score={r['score']} {r['verdict']}")
```

## Key Principles (v2.0)

1. **Catalysts first, cash flow second.** The biggest surges come from companies in secular trends with improving fundamentals — NOT from companies that already look perfect on TTM metrics. Quality is a safety net, not a gate.
2. **Growth trajectory > current yield.** A company with 0.8% FCF yield growing FCF at 50% CAGR is BETTER than one with 2% yield that's flat. The inflection point is where the money is made.
3. **Never auto-kill at Step 1.** Even a 0/3 stock with a monster catalyst gets analyzed. The quality score determines portfolio weight (smaller for low-quality, larger for high-quality), not inclusion/exclusion.
4. **Sector context matters.** A 0.8% FCF yield is NORMAL for a semiconductor company in a capacity buildout phase. It's terrible for a utility. Compare within sectors, not across them.
5. **Physical moats > brand moats.** A patent on chip lithography is worth more than a brand name. Infrastructure is about physics, not marketing.
6. **Concentration is a feature.** The methodology produces 4-6 names. If you have 15, you're doing it wrong.
7. **Geopolitical risk is real.** A Taiwan Strait conflict makes 40% of semiconductor stocks untouchable. Flag it, don't ignore it.
8. **Re-evaluate quarterly.** Secular trends shift, moats erode, cash flows change. Run the SOP fresh every quarter.
9. **The backtest doesn't lie.** v1.0 produced -7.4% alpha because it rewarded value and punished growth during an AI supercycle. If the methodology consistently underperforms, change the methodology — not the facts.
