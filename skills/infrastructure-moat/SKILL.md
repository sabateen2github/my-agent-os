---
name: infrastructure-moat
description: Rigorous 3-stage SOP for analyzing physical infrastructure moat stocks. Use when screening stocks for FCF yield, ROIC, EBITDA margins, competitive moats (patents, chokepoints), and supply chain resilience. Automatically kills analysis at Step 1 if quantitative filters fail. Designed for concentrated high-conviction portfolios (4-6 positions).
license: MIT
compatibility: opencode
metadata:
  sop_version: "1.0"
  last_updated: "2026-07-03"
  criteria:
    fcf_yield_min: 1.5
    roic_min: 15
    ebitda_margin_min: 15
    market_cap_min_b: 150
---

# Infrastructure Moat Analyzer — 3-Stage SOP

## Overview

This is a **strict funnel methodology** for evaluating stocks as physical infrastructure moat plays. It abandons "pros and cons" analysis in favor of hard pass/fail gates. If a company fails Step 1, analysis stops immediately — no sunk cost on speculative narratives.

The methodology is designed for concentrated portfolios (4-6 positions, 40K+ JOD / ~$56K USD) where every position must earn its slot through materialized cash generation AND physical infrastructure moat durability.

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

## SOP Step 1: The Quantitative Filter (Materialized Cash)

### Criteria (all must pass for a CLEAN pass):

| Metric | Threshold | Why |
|--------|-----------|-----|
| **FCF Yield** (Free Cash Flow / Market Cap) | **> 1.5%** | Is the company returning cash to shareholders at this valuation? Below 1.5% = overvalued for an infrastructure play. |
| **ROIC** (Net Income / (Equity + Debt - Cash)) | **> 15%** | Are they deploying capital efficiently? Below 15% = destroying value. |
| **EBITDA Margin** | **> 15%** | Are they fundamentally profitable? Below 15% = commodity or competitive pressure. |

### Scoring:
- **3/3 = ✅ PASS** → advance to Step 2
- **2/3 = ⚠️ PASS** → advance with caveat noted
- **1/3 or 0/3 = ❌ FAIL** → KILL analysis. Do not proceed.

### Exception: Monopoly Override
If a company has a **genuine single-vendor monopoly** with zero competitors for 5+ years (e.g., ASML EUV lithography), the FCF yield threshold can be waived down to 1.0%. This must be explicitly justified in the report.

### Data Source
Use `yfinance` Python library for TTM financial data:

```python
import yfinance as yf
stock = yf.Ticker("TICKER")
info = stock.info

market_cap = info.get("marketCap")
revenue_ttm = info.get("totalRevenue")
ebitda_ttm = info.get("ebitda")
fcf = info.get("freeCashflow")
net_income = info.get("netIncomeToCommon")
total_debt = info.get("totalDebt") or 0
total_cash = info.get("totalCash") or 0
total_equity = info.get("stockholdersEquity") or info.get("bookValue") or 0

fcf_yield = (fcf / market_cap * 100) if fcf and market_cap else None
ebitda_margin = (ebitda_ttm / revenue_ttm * 100) if ebitda_ttm and revenue_ttm else None

if net_income and total_equity:
    invested_capital = total_equity + total_debt - total_cash
    roic = (net_income / invested_capital * 100) if invested_capital > 0 else None
else:
    roic = None
```

### Output Format (Step 1):

```
| Ticker | Name | FCF Yield% | ROIC% | EBITDA% | Score | Verdict |
|--------|------|-----------|-------|---------|-------|---------|
| XXXX   | ...  | 2.50      | 22.0  | 35.0    | 3/3   | ✅ PASS |
| YYYY   | ...  | 0.85      | 18.0  | 25.0    | 2/3   | ⚠️ PASS (FCF yield below 1.5%) |
| ZZZZ   | ...  | -1.20     | -5.0  | 12.0    | 0/3   | ❌ FAIL — KILL |
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

## Python Analysis Template

Use this template to pull and process data for the full universe:

```python
import yfinance as yf
import json

TICKERS = ["list", "of", "tickers"]  # Populate from universe scan
results = []

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
        pe = info.get("trailingPE")
        fpe = info.get("forwardPE")
        
        fy = round(fcf / mc * 100, 2) if (fcf and mc) else None
        ebitda_m = round(ebitda / rev * 100, 1) if (ebitda and rev) else None
        
        if ni and equity:
            ic = equity + debt - cash
            roic = round(ni / ic * 100, 1) if ic > 0 else None
        else:
            roic = None
        
        # Score
        score = 0
        if fy and fy > 1.5: score += 1
        if roic and roic > 15: score += 1
        if ebitda_m and ebitda_m > 15: score += 1
        
        results.append({
            "ticker": t,
            "name": info.get("shortName", t),
            "mcap_B": round(mc/1e9, 1) if mc else None,
            "fcf_yield": fy,
            "roic": roic,
            "ebitda_margin": ebitda_m,
            "pe": round(pe, 1) if pe else None,
            "fpe": round(fpe, 1) if fpe else None,
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "score": score,
            "verdict": "PASS" if score >= 3 else ("MARGINAL" if score >= 2 else "FAIL")
        })
    except Exception as e:
        results.append({"ticker": t, "error": str(e)})

# Sort by FCF yield descending
results.sort(key=lambda x: x.get("fcf_yield") or 0, reverse=True)

# Print pass/fail table
for r in results:
    if "error" in r:
        print(f"{r['ticker']:<8} ERROR: {r['error']}")
    else:
        print(f"{r['ticker']:<8} {r['name']:<30} FY={r['fcf_yield']}% ROIC={r['roic']}% EB={r['ebitda_margin']}% Score={r['score']}/3 {r['verdict']}")
```

## Key Principles

1. **Kill early, kill often.** Most stocks fail Step 1. That's the point — the methodology is a funnel, not a ranking system.
2. **Narrative is noise.** A company with world-class technology but negative FCF is a PASS. Wait for it to generate cash, then re-evaluate.
3. **Physical moats > brand moats.** A patent on chip lithography is worth more than a brand name. Infrastructure is about physics, not marketing.
4. **Concentration is a feature.** The methodology produces 4-6 names. If you have 15, you're doing it wrong.
5. **Geopolitical risk is real.** A Taiwan Strait conflict makes 40% of semiconductor stocks untouchable. Flag it, don't ignore it.
6. **Re-evaluate quarterly.** Moats erode, cash flows change, geopolitics shift. Run the SOP fresh every quarter.
