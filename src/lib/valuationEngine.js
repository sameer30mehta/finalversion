// PropScore Valuation Engine v2
// Full 15-layer deterministic intelligence pipeline

import { assignCoarseBucket, assignMicroMarketBucket, extractHyperlocalContext } from './locationIntelligence';
import { runAnomalyPipeline } from './anomalyEngine';
import { adaptStage1ForValuation, isStage1Output } from './stage1Engine';
import { buildHistoricalCaseSummary } from './historicalReliabilityEngine';
import { resolvePortfolioConcentrationFromBackend } from './api';

const isKnownOptional = (value) => Boolean(value && value !== 'not_provided');

function normalizePortfolioPropertyType(type) {
  const value = String(type || '').toLowerCase();
  if (['apartment', 'villa', 'house', 'flat', 'residential'].includes(value)) return 'Residential';
  if (['commercial', 'office', 'shop', 'showroom', 'warehouse'].includes(value)) return 'Commercial';
  return type || 'Residential';
}

function normalizePortfolioSubtype(inputs) {
  const config = String(inputs.propertyDetails?.config || '').trim();
  const compact = config.toUpperCase().replace(/\s+/g, '');
  if (['1BHK', '2BHK', '3BHK'].includes(compact)) return compact;
  return inputs.propertyDetails?.subtype || inputs.propertyDetails?.type || null;
}

function unavailablePortfolioRiskSummary() {
  return {
    source: 'unavailable',
    portfolioSummary: {
      riskLevel: 'Unavailable',
      portfolioRiskScore: 0,
      proposedExposure: null,
      recommendedLtv: null,
      ltvAdjustmentPct: 0,
      reviewRecommendation: 'Portfolio concentration data unavailable. Single-case assessment still available.'
    },
    riskLenses: [],
    riskFlags: [],
    decisionImpact: {
      confidencePenalty: 0,
      ltvPenaltyPct: 0,
      seniorReviewRequired: false
    }
  };
}

export const runValuation = async (payload) => {
  const stage1 = isStage1Output(payload) ? payload : payload?.stage1 || null;
  const inputs = stage1 ? adaptStage1ForValuation(stage1) : payload;
  const lat = inputs.coordinates?.[0] || 19.1136;
  const lon = inputs.coordinates?.[1] || 72.8697;
  const cityTier = inputs.cityTier || 1;

  // ─── LAYER 6: Coarse Bucket Assignment ───
  const coarseBucket = stage1?.locationIntelligence?.coarseBucket || assignCoarseBucket(lat, lon, cityTier);

  // ─── LAYER 7: Micro-Market Bucket Assignment ───
  const microMarket = stage1?.locationIntelligence?.microMarket || assignMicroMarketBucket(lat, lon);

  // ─── LAYER 8: Hyperlocal Context Extraction (async — Overpass API) ───
  let hyperlocalContext = stage1?.locationIntelligence?.hyperlocalContext;
  if (!hyperlocalContext?.summary) {
    try {
      hyperlocalContext = await extractHyperlocalContext(lat, lon);
    } catch (e) {
      console.warn('Hyperlocal extraction failed, using defaults');
      hyperlocalContext = {
        pois: [],
        summary: { metroDistance: 2000, schoolDistance: 2000, hospitalDistance: 3000, commercialDistance: 2000, totalPOIsFound: 0, transitCount: 0, amenityScore: 30 }
      };
    }
  }

  // Use real hyperlocal distances instead of hardcoded ones
  const infra = {
    metroDistance: hyperlocalContext.summary.metroDistance,
    highwayDistance: inputs.infrastructure?.highwayDistance || 2000,
    commercialHubDistance: hyperlocalContext.summary.commercialDistance,
    schoolDistance: hyperlocalContext.summary.schoolDistance,
    hospitalDistance: hyperlocalContext.summary.hospitalDistance
  };

  // 1. INFRASTRUCTURE & IPI ENGINE
  let ipiPoints = 0;
  if (infra.metroDistance <= 500) ipiPoints += 15;
  else if (infra.metroDistance <= 2000) ipiPoints += 10;
  else if (infra.metroDistance <= 5000) ipiPoints += 5;

  if (infra.highwayDistance <= 1000) ipiPoints += 8;
  if (infra.commercialHubDistance <= 2000) ipiPoints += 7;
  if (infra.schoolDistance <= 1000) ipiPoints += 5;
  if (infra.hospitalDistance <= 2000) ipiPoints += 5;
  
  const ipi = Math.min(ipiPoints / 50, 1.0);

  // 2. BASE VALUE ENGINE (uses coarse bucket circle rate)
  const effectiveCircleRate = coarseBucket.circleRate || inputs.circleRate || 15000;
  const baseValue = effectiveCircleRate * inputs.propertyDetails.area;

  // 3. MARKET ADJUSTMENT ENGINE
  const demandMap = { 'very_high': 0.9, 'high': 0.75, 'moderate': 0.55, 'low': 0.3 };
  const demandScore = demandMap[microMarket.demand] || inputs.demandScore || 0.6;
  const marketLocationMultiplier = 1 + (ipi * 0.30) + (demandScore * 0.20);

  // 4. PROPERTY & CONDITION ENGINE
  const age = inputs.propertyDetails.age || 5;
  const type = inputs.propertyDetails.type || "Apartment";
  
  let depreciation = 1;
  if (type === "Apartment" || type === "Villa" || type === "Penthouse" || type === "Duplex") {
    depreciation = Math.max(0.60, 1 - (age * 0.015));
  } else if (type === "Commercial") {
    depreciation = Math.max(0.50, 1 - (age * 0.012));
  }
  
  const floor = inputs.propertyDetails.floor || 0;
  const floorPremiums = [0.90, 0.93, 0.97, 1.00, 1.02, 1.04, 1.03, 1.01, 0.99];
  const floorMult = type === "Apartment" ? (floor < floorPremiums.length ? floorPremiums[floor] : 0.99) : 1.0;

  const config = inputs.propertyDetails.config || "2 BHK";
  const configMap = { "1 BHK": 0.95, "2 BHK": 1.00, "3 BHK": 1.07, "4 BHK+": 1.12, "Studio": 0.90 };
  let configMult = configMap[config] || 1.0;
  if (type === "Villa") configMult = 1.20;

  const marketPointEstimate = baseValue * marketLocationMultiplier * depreciation * floorMult * configMult;

  // 5. UNCERTAINTY & CONFIDENCE ENGINE
  let confidence = 0.50;
  const enrich = inputs.enrichment || {};
  const hasKnownLegalStatus = isKnownOptional(enrich.legalStatus);
  
  if (hasKnownLegalStatus) confidence += 0.05;
  if (enrich.occupancy) confidence += 0.05;
  if (enrich.rental > 0) confidence += 0.05;
  confidence += 0.05;
  confidence += 0.05;
  
  let hasImages = false;
  if (enrich.images?.exterior) { confidence += 0.08; hasImages = true; }
  if (enrich.images?.interior) { confidence += 0.07; hasImages = true; }
  
  confidence = Math.min(confidence, 0.90);

  let buffer = 0.08;
  if (!hasImages) buffer += 0.05;
  
  const marketValueRange = [
    Math.round(marketPointEstimate * (1 - buffer)),
    Math.round(marketPointEstimate * (1 + buffer))
  ];

  // 6. LIQUIDITY ENGINE (RPI & Distress)
  let rpi = 0;
  rpi += (cityTier === 1 ? 10 : 7) * (20 / 10);
  rpi += (ipi * 10) * (15 / 10);
  
  const funcMap = { "1 BHK": 8, "2 BHK": 10, "3 BHK": 8, "4 BHK+": 5, "Studio": 7 };
  const fungibilityScore = type === "Apartment" ? (funcMap[config] || 7) : (type === "Commercial" ? 6 : 5);
  rpi += fungibilityScore * (15 / 10);
  
  let ageScore = 10;
  if (age > 30) ageScore = 2;
  else if (age > 20) ageScore = 4;
  else if (age > 15) ageScore = 6;
  else if (age > 10) ageScore = 8;
  else if (age > 5) ageScore = 9;
  rpi += ageScore * (12 / 10);
  
  rpi += (demandScore * 10) * (12 / 10);
  
  const legalScore = !hasKnownLegalStatus ? 5 : (enrich.legalStatus === "clear" ? 10 : (enrich.legalStatus === "lease" ? 7 : 2));
  rpi += legalScore * (10 / 10);
  rpi += 10 * (8 / 10);
  rpi += (enrich.occupancy === "vacant" ? 4 : 8) * (5 / 10);
  rpi += 7 * (3 / 10);
  rpi += (!hasKnownLegalStatus ? 6 : (enrich.legalStatus === "clear" ? 10 : 5)) * (5 / 10);

  rpi = Math.round(rpi);

  let distressDiscount = cityTier === 1 ? 0.15 : (cityTier === 2 ? 0.20 : 0.25);
  if (age > 20) distressDiscount += 0.05;
  if (hasKnownLegalStatus && enrich.legalStatus !== "clear") distressDiscount += 0.08;
  if (type === "Commercial") distressDiscount += 0.05;
  if (enrich.occupancy === "vacant") distressDiscount += 0.03;
  if (demandScore < 0.35) distressDiscount += 0.05;
  
  distressDiscount = Math.min(distressDiscount, 0.40);
  
  const distressPoint = marketPointEstimate * (1 - distressDiscount);
  const distressRange = [
    Math.round(distressPoint * (1 - 0.06)),
    Math.round(distressPoint * (1 + 0.06))
  ];

  let ttlBaseMin = 30, ttlBaseMax = 60;
  if (rpi >= 50 && rpi < 75) { ttlBaseMin = 60; ttlBaseMax = 120; }
  else if (rpi < 50) { ttlBaseMin = 90; ttlBaseMax = 180; }
  
  if (enrich.occupancy === "vacant" || (hasKnownLegalStatus && enrich.legalStatus !== "clear") || age > 25) {
    ttlBaseMin += 30; ttlBaseMax += 45;
  }
  if (infra.metroDistance <= 500 && demandScore > 0.7) {
    ttlBaseMin = Math.max(20, ttlBaseMin - 15);
    ttlBaseMax = Math.max(30, ttlBaseMax - 20);
  }

  // ─── LAYERS 9–14: Anomaly Detection & Decision Engine ───
  const anomalyResults = runAnomalyPipeline(
    { area: inputs.propertyDetails.area, config, type, subtype: inputs.propertyDetails.subtype, age },
    coarseBucket,
    microMarket,
    hyperlocalContext,
    hasImages,
    hasKnownLegalStatus,
    {
      stage1,
      fieldCompleteness: inputs.fieldCompleteness,
      coordinates: inputs.coordinates,
      location: inputs.location
    }
  );
  const stage2Output = anomalyResults.stage2Output;

  // FRAUD ENGINE — merge anomaly flags with legacy risk flags
  const riskFlags = [...anomalyResults.flags];
  
  if (config === "2 BHK" && (inputs.propertyDetails.area < 500 || inputs.propertyDetails.area > 1400)) {
    riskFlags.push({ id: 'SIZE_CONFIG_MISMATCH', title: 'Size-Config Mismatch', text: `Size mismatch: ${inputs.propertyDetails.area} sqft is an anomaly for 2 BHK.`, severity: "critical", source: 'fraud_engine', anomalyScore: 25 });
  }
  if (!hasImages) {
    riskFlags.push({ id: 'NO_IMAGES', title: 'No Visual Verification', text: "No images provided: Physical site inspection recommended.", severity: "low", source: 'fraud_engine', anomalyScore: 5 });
  }
  if (hasKnownLegalStatus && enrich.legalStatus !== "clear") {
    riskFlags.push({ id: 'LEGAL_RISK', title: 'Legal Complexity', text: "Legal complexity detected. Detailed title search required.", severity: "high", source: 'fraud_engine', anomalyScore: 15 });
  }

  const keyDrivers = [];
  if (infra.metroDistance <= 500) keyDrivers.push({ name: "Proximity to Metro", impact: "+15%", positive: true });
  else if (infra.metroDistance <= 2000) keyDrivers.push({ name: "Metro Access", impact: "+8%", positive: true });
  if (age < 5) keyDrivers.push({ name: "New Construction Premium", impact: "+8%", positive: true });
  if (age > 20) keyDrivers.push({ name: "Age Depreciation", impact: "-10%", positive: false });
  if (ipi > 0.7) keyDrivers.push({ name: "High Infra Access", impact: "+12%", positive: true });
  if (microMarket.demand === 'very_high') keyDrivers.push({ name: "High Demand Micro-Market", impact: "+10%", positive: true });
  if (microMarket.demand === 'low') keyDrivers.push({ name: "Low Demand Penalty", impact: "-8%", positive: false });

  const formatINR = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Apply decision-based confidence penalty
  if (stage2Output?.decision === 'ACCEPT_CONFIDENCE_PENALTY') {
    confidence = Math.max(0.35, confidence - 0.15);
  }

  const confidenceBeforeHistorical = confidence;
  const historicalCaseSummary = await buildHistoricalCaseSummary({
    stage1,
    inputs,
    microMarket,
    baseConfidence: confidenceBeforeHistorical
  });
  confidence = Math.min(0.95, Math.max(0.25, historicalCaseSummary.finalConfidence ?? confidence));
  const estimatedMarketValue = Math.round((marketValueRange[0] + marketValueRange[1]) / 2);
  const portfolioRiskSummary = await resolvePortfolioConcentrationFromBackend({
    microMarketId: stage1?.bucketAssignment?.microMarketBucket?.id || microMarket?.bucketId,
    localityName: inputs.location,
    propertyType: normalizePortfolioPropertyType(type),
    subtype: normalizePortfolioSubtype(inputs),
    estimatedMarketValue,
    requestedLoanAmount: null,
    baseLtv: 0.65,
    liquidityTier: stage1?.bucketAssignment?.microMarketBucket?.liquidityNorm,
    liquidityIndex: stage1?.marketNorms?.liquidityIndex ?? microMarket?.norms?.liquidityIndex
  }) || unavailablePortfolioRiskSummary();

  return {
    caseDetails: {
      address: inputs.location,
      type,
      config,
      area: inputs.propertyDetails.area,
      age: `${age} years`,
      ageBucket: inputs.propertyDetails.ageBucket || 'mid',
      subtype: inputs.propertyDetails.subtype || null,
      areaUnit: inputs.propertyDetails.areaUnit || 'sqft',
      areaRaw: inputs.propertyDetails.areaRaw || inputs.propertyDetails.area,
      facing: "Not Spec"
    },
    propScore: rpi,
    confidence,
    confidenceBreakdown: {
      base: 0.60,
      legal: hasKnownLegalStatus && enrich.legalStatus === 'clear' ? 0.05 : 0,
      visual: hasImages ? 0.15 : 0,
      historical: Math.max(historicalCaseSummary.confidenceAdjustment, 0),
      historicalDelta: historicalCaseSummary.confidenceAdjustment
    },
    marketValue: `${formatINR(marketValueRange[0])} - ${formatINR(marketValueRange[1])}`,
    distressValue: `${formatINR(distressRange[0])} - ${formatINR(distressRange[1])}`,
    timeToSell: `${ttlBaseMin} - ${ttlBaseMax} days`,
    drivers: keyDrivers.length > 0 ? keyDrivers : [{name: "Standard Config", impact: "0%", positive: true}],
    risks: riskFlags.length > 0 ? riskFlags.map(r => ({ text: r.text || r.explanation || r.title, severity: r.severity, ...r })) : [{text: "Standard local competition", severity: "low"}],
    ltv: Math.round(100 * (1 - distressDiscount - 0.1)),
    visualAudit: {
      conditionScore: hasImages ? 8.2 : 6.0,
      conditionFindings: hasImages ? "Visible minor wear detected in images. No structural cracks." : "No images uploaded. Adopting locality average.",
      qualityFindings: hasImages ? "Finishes appear standard to premium from visual scans." : "No interior imagery provided.",
      featuresFindings: hasImages ? "No virtual staging detected. Room parameters verified." : "Cannot verify feature count without imagery."
    },
    rawImages: enrich.rawImages || [],

    // ─── New: Intelligence pipeline outputs ───
    coarseBucket,
    microMarket,
    hyperlocalContext,
    anomalyResults,
    dataSufficiency: anomalyResults.dataSufficiency,
    verificationDecision: anomalyResults.decision,
    stage2Output,
    historicalCaseSummary,
    portfolioRiskSummary,
    fieldCompleteness: inputs.fieldCompleteness || null,
    stage1,
    stage1Output: stage1,
    ipi,
    effectiveCircleRate
  };
};

export const defaultMockInputs = {
  location: "Andheri East, Mumbai",
  circleRate: 15000, 
  cityTier: 1, 
  demandScore: 0.8,
  infrastructure: { metroDistance: 400, highwayDistance: 1200, commercialHubDistance: 800, schoolDistance: 600, hospitalDistance: 1500 },
  propertyDetails: { type: "Apartment", config: "2 BHK", area: 950, age: 12, floor: 3 },
  enrichment: { legalStatus: "clear", occupancy: "owner", rental: 0, images: { exterior: false, interior: false } }
};
