// Anomaly Detection & Verification Decision Engine
// Items 9–14: Local norms, context mismatch, cross-signal scoring, decision engine, flag aggregation, data sufficiency

// ─── Item 9: Local Norm Comparison ───
export function compareLocalNorms(property, microMarketNorms) {
  const flags = [];
  const { area, config, type, age } = property;
  const norms = microMarketNorms.norms;

  // Size outlier detection
  if (area < norms.sizeP5) {
    flags.push({
      id: 'SIZE_BELOW_P5',
      title: 'Unusually Small for Locality',
      explanation: `Declared area (${area} sqft) is below the 5th percentile (${norms.sizeP5} sqft) for this micro-market.`,
      severity: 'high',
      source: 'norm_comparison',
      evidence: `P5=${norms.sizeP5}, P50=${norms.sizeP50}, P95=${norms.sizeP95} sqft`,
      anomalyScore: 25
    });
  } else if (area > norms.sizeP95) {
    flags.push({
      id: 'SIZE_ABOVE_P95',
      title: 'Unusually Large for Locality',
      explanation: `Declared area (${area} sqft) exceeds the 95th percentile (${norms.sizeP95} sqft) for this micro-market.`,
      severity: 'medium',
      source: 'norm_comparison',
      evidence: `P5=${norms.sizeP5}, P50=${norms.sizeP50}, P95=${norms.sizeP95} sqft`,
      anomalyScore: 15
    });
  }

  // Subtype prevalence — rare subtype penalty
  if (config !== norms.dominantSubtype) {
    const commonConfigs = ['1 BHK', '2 BHK', '3 BHK'];
    if (!commonConfigs.includes(config)) {
      flags.push({
        id: 'RARE_SUBTYPE',
        title: 'Non-Standard Configuration',
        explanation: `${config} is uncommon in this micro-market where ${norms.dominantSubtype} dominates.`,
        severity: 'low',
        source: 'norm_comparison',
        evidence: `Dominant: ${norms.dominantSubtype}, Declared: ${config}`,
        anomalyScore: 8
      });
    }
  }

  // Age outlier — property significantly older than local norm
  const numAge = parseInt(age) || 0;
  if (numAge > norms.avgAge * 2) {
    flags.push({
      id: 'AGE_OUTLIER',
      title: 'Significantly Older Than Local Average',
      explanation: `Property age (${numAge} yrs) is more than double the local average (${norms.avgAge} yrs).`,
      severity: 'medium',
      source: 'norm_comparison',
      evidence: `Local avg age: ${norms.avgAge} yrs, Declared: ${numAge} yrs`,
      anomalyScore: 12
    });
  }

  return flags;
}

// ─── Item 10: Context Mismatch Detection ───
export function detectContextMismatch(property, coarseBucket, hyperlocalContext, microMarketNorms) {
  const flags = [];

  // Zoning mismatch: commercial property in residential zone
  if (property.type === 'Commercial' && coarseBucket.landUseType === 'residential') {
    flags.push({
      id: 'ZONING_MISMATCH',
      title: 'Zoning Mismatch Detected',
      explanation: `Commercial property declared in a ${coarseBucket.landUseType} zone (${coarseBucket.zoneId}).`,
      severity: 'high',
      source: 'context_mismatch',
      evidence: `Zone: ${coarseBucket.zoneId}, Land use: ${coarseBucket.landUseType}`,
      anomalyScore: 30
    });
  }

  // Premium claim vs weak access
  const infra = hyperlocalContext.summary;
  if (infra.metroDistance > 3000 && infra.commercialDistance > 3000) {
    if (property.area > 1200) { // Large property claiming premium in weak-access area
      flags.push({
        id: 'PREMIUM_WEAK_ACCESS',
        title: 'Premium Asset in Low-Access Area',
        explanation: `Large property (${property.area} sqft) in area with no transit (<3km) or commercial hubs.`,
        severity: 'medium',
        source: 'context_mismatch',
        evidence: `Metro: ${infra.metroDistance}m, Commercial: ${infra.commercialDistance}m`,
        anomalyScore: 18
      });
    }
  }

  // Value vs liquidity mismatch
  const demand = microMarketNorms.demand;
  if (demand === 'low' && property.type !== 'Plot') {
    flags.push({
      id: 'LOW_DEMAND_MARKET',
      title: 'Low Demand Micro-Market',
      explanation: `Property is in a micro-market with low transaction velocity, increasing liquidation risk.`,
      severity: 'medium',
      source: 'context_mismatch',
      evidence: `Demand level: ${demand}, Comparables: ${microMarketNorms.comparableCount}`,
      anomalyScore: 15
    });
  }

  // Industrial zone residential
  if ((property.type === 'Apartment' || property.type === 'Villa') && coarseBucket.landUseType === 'industrial') {
    flags.push({
      id: 'RESIDENTIAL_IN_INDUSTRIAL',
      title: 'Residential in Industrial Zone',
      explanation: 'Residential property declared in an industrial land-use zone. Verify zoning compliance.',
      severity: 'critical',
      source: 'context_mismatch',
      evidence: `Zone: ${coarseBucket.zoneId}, Land use: ${coarseBucket.landUseType}`,
      anomalyScore: 35
    });
  }

  return flags;
}

// ─── Item 11: Cross-Signal Inconsistency Scoring ───
export function calculateSuspicionScore(allFlags) {
  if (allFlags.length === 0) return { score: 0, crossSignalFlags: [] };

  // Weighted sum of anomaly scores
  let rawScore = allFlags.reduce((sum, f) => sum + (f.anomalyScore || 0), 0);

  // Cross-signal multiplier: multiple moderate+ flags from different sources compound
  const sources = new Set(allFlags.map(f => f.source));
  const severeCount = allFlags.filter(f => f.severity === 'critical' || f.severity === 'high').length;

  const crossSignalFlags = [];

  if (sources.size >= 3 && severeCount >= 1) {
    rawScore *= 1.3;
    crossSignalFlags.push({
      id: 'MULTI_SOURCE_ANOMALY',
      title: 'Multi-Source Anomaly Cluster',
      explanation: `Anomalies detected across ${sources.size} independent signal sources with ${severeCount} severe flags.`,
      severity: 'high',
      source: 'cross_signal',
      evidence: `Sources: ${[...sources].join(', ')}`,
      anomalyScore: 0
    });
  }

  if (allFlags.length >= 4) {
    rawScore *= 1.2;
    crossSignalFlags.push({
      id: 'FLAG_ACCUMULATION',
      title: 'Excessive Flag Accumulation',
      explanation: `${allFlags.length} independent flags detected — sparse data combined with multiple moderate anomalies.`,
      severity: 'medium',
      source: 'cross_signal',
      evidence: `Total flags: ${allFlags.length}`,
      anomalyScore: 0
    });
  }

  return {
    score: Math.min(Math.round(rawScore), 100),
    crossSignalFlags
  };
}

// ─── Item 12: Verification Decision Engine ───
export function makeVerificationDecision(suspicionScore, hasBlockingFlags, dataSufficiencyScore) {
  // Decision matrix
  if (hasBlockingFlags) {
    return {
      decision: 'REJECT_BLOCK',
      label: 'Rejected — Blocking Issue',
      color: 'red',
      explanation: 'Critical blocking flag detected. Asset cannot proceed without resolution.'
    };
  }

  if (suspicionScore > 70) {
    return {
      decision: 'MANUAL_REVIEW',
      label: 'Manual Review Required',
      color: 'amber',
      explanation: `High suspicion score (${suspicionScore}/100). Multiple anomalies require human verification.`
    };
  }

  if (suspicionScore > 40) {
    return {
      decision: 'ACCEPT_CONFIDENCE_PENALTY',
      label: 'Accepted — Confidence Penalty',
      color: 'yellow',
      explanation: `Moderate suspicion (${suspicionScore}/100). Valuation accepted with widened uncertainty bounds.`
    };
  }

  if (suspicionScore > 20) {
    return {
      decision: 'ACCEPT_WARNING',
      label: 'Accepted — With Warnings',
      color: 'blue',
      explanation: `Minor anomalies detected (${suspicionScore}/100). Review flagged items for completeness.`
    };
  }

  return {
    decision: 'ACCEPT_CLEAN',
    label: 'Accepted — Clean',
    color: 'green',
    explanation: `No significant anomalies detected (${suspicionScore}/100). High confidence in data integrity.`
  };
}

// ─── Item 13: Flag Aggregation ───
export function aggregateFlags(normFlags, contextFlags, crossSignalFlags) {
  const allFlags = [...normFlags, ...contextFlags, ...crossSignalFlags];

  // Sort by severity: critical > high > medium > low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allFlags.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

  return allFlags;
}

// ─── Item 14: Data Sufficiency Score ───
export function calculateDataSufficiency(microMarket, coarseBucket, hasImages, hasLegal) {
  let score = 0;

  // Comparable count (0-0.3)
  if (microMarket.comparableCount >= 50) score += 0.30;
  else if (microMarket.comparableCount >= 20) score += 0.20;
  else if (microMarket.comparableCount >= 5) score += 0.10;

  // Data freshness (0-0.2)
  if (microMarket.dataFreshnessDays <= 7) score += 0.20;
  else if (microMarket.dataFreshnessDays <= 14) score += 0.15;
  else if (microMarket.dataFreshnessDays <= 30) score += 0.08;

  // Official vs estimated circle rate (0-0.2)
  if (coarseBucket.source === 'official_registry') score += 0.20;
  else score += 0.10;

  // Images provided (0-0.15)
  if (hasImages) score += 0.15;

  // Legal data provided (0-0.15)
  if (hasLegal) score += 0.15;

  return Math.min(parseFloat(score.toFixed(2)), 1.0);
}

// ─── Master Pipeline Runner ───
export function runAnomalyPipeline(property, coarseBucket, microMarket, hyperlocalContext, hasImages, hasLegal) {
  // Step 1: Local norm comparison
  const normFlags = compareLocalNorms(property, microMarket);

  // Step 2: Context mismatch
  const contextFlags = detectContextMismatch(property, coarseBucket, hyperlocalContext, microMarket);

  // Step 3: Cross-signal scoring
  const allBaseFlags = [...normFlags, ...contextFlags];
  const { score: suspicionScore, crossSignalFlags } = calculateSuspicionScore(allBaseFlags);

  // Step 4: Flag aggregation
  const aggregatedFlags = aggregateFlags(normFlags, contextFlags, crossSignalFlags);

  // Step 5: Data sufficiency
  const dataSufficiency = calculateDataSufficiency(microMarket, coarseBucket, hasImages, hasLegal);

  // Step 6: Blocking check
  const hasBlockingFlags = aggregatedFlags.some(f => f.severity === 'critical');

  // Step 7: Decision
  const decision = makeVerificationDecision(suspicionScore, hasBlockingFlags, dataSufficiency);

  return {
    suspicionScore,
    dataSufficiency,
    decision,
    flags: aggregatedFlags,
    flagCount: aggregatedFlags.length,
    normFlags,
    contextFlags,
    crossSignalFlags
  };
}
