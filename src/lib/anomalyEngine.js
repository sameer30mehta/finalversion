// Stage 2 Verification & Red-Flag Screening
// Trust gate between Stage 1 intake normalization and Stage 3+ valuation.

const SUPPORTED_SUBTYPES = {
  Apartment: ['Apartment', 'Penthouse', 'Duplex', 'Studio'],
  Villa: ['Villa', 'Row House', 'Bungalow', 'Independent House', 'Farmhouse'],
  Commercial: ['Office', 'Shop', 'Showroom', 'Warehouse', 'Co-working'],
  Plot: ['Residential Plot', 'Commercial Plot', 'Agricultural Land']
};

const CHECK_GROUPS = {
  completeness: 'Completeness Checks',
  format: 'Format Validity Checks',
  location: 'Location Validation',
  localNorms: 'Local Norm Checks',
  context: 'Context Mismatch Checks',
  crossSignal: 'Cross-Signal Inconsistency Checks'
};

const STATUS_WEIGHT = { pass: 0, warning: 1, penalty: 2, review: 3, block: 4 };
const LEGACY_SEVERITY = {
  warning: 'low',
  penalty: 'medium',
  review: 'high',
  block: 'critical'
};

const DECISION_META = {
  REJECT_BLOCK: { label: 'Rejected - Blocking Issue', color: 'red' },
  ACCEPT_CLEAN: { label: 'Accepted - Clean', color: 'green' },
  ACCEPT_WARNING: { label: 'Accepted - With Warnings', color: 'blue' },
  ACCEPT_CONFIDENCE_PENALTY: { label: 'Accepted - Confidence Penalty', color: 'yellow' },
  MANUAL_REVIEW: { label: 'Manual Review Required', color: 'amber' }
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatINR(value) {
  if (!Number.isFinite(value)) return 'Not resolved';
  return `INR ${Math.round(value).toLocaleString('en-IN')}/sqft`;
}

function isValidCoordinatePair(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90
    && lon >= -180 && lon <= 180;
}

function getProfile(property, context) {
  const stage1Profile = context.stage1?.normalizedPropertyProfile;

  return {
    address: stage1Profile?.address || context.location || '',
    lat: Number(stage1Profile?.lat ?? context.coordinates?.[0]),
    lon: Number(stage1Profile?.lon ?? context.coordinates?.[1]),
    propertyType: stage1Profile?.propertyType || property.type || 'Unspecified',
    propertySubtype: stage1Profile?.propertySubtype || property.subtype || 'Unspecified',
    standardizedSizeSqft: Number(stage1Profile?.standardizedSizeSqft ?? property.area),
    ageYears: Number(stage1Profile?.ageYears ?? property.age),
    completenessStatus: stage1Profile?.completenessStatus || context.fieldCompleteness || {
      mandatoryComplete: true,
      missingFields: []
    }
  };
}

function createFlag({
  id,
  title,
  severity = 'warning',
  sourceBucket = 'system',
  checkGroup,
  explanation,
  evidence,
  anomalyPoints = 0,
  suspicionPoints = 0,
  protective = false
}) {
  return {
    id,
    title,
    severity,
    sourceBucket,
    checkGroup,
    explanation,
    evidence,
    anomalyPoints,
    suspicionPoints,
    protective
  };
}

function getNormBands(norms = {}) {
  const p5 = Number(norms.sizeP5 || 0);
  const p50 = Number(norms.sizeP50 || 0);
  const p95 = Number(norms.sizeP95 || 0);
  const spread = Math.max(p95 - p50, 1);

  return {
    p5,
    p50,
    p90: Math.round(p50 + spread * 0.8),
    p95,
    p97: Math.round(p95 + spread * 0.35),
    p99: Math.round(p95 + spread * 0.6)
  };
}

function getSubtypePrevalence(property, microMarket) {
  const dominant = microMarket?.norms?.dominantSubtype || 'Not resolved';
  const declared = property.config || property.subtype || 'Not resolved';
  const commonConfigs = ['1 BHK', '2 BHK', '3 BHK'];

  if (declared === dominant) {
    return {
      level: 'High',
      label: `High - matches dominant local profile (${dominant})`,
      isRare: false,
      declared,
      dominant
    };
  }

  if (commonConfigs.includes(declared)) {
    return {
      level: 'Moderate',
      label: `Moderate - common configuration, dominant local profile is ${dominant}`,
      isRare: false,
      declared,
      dominant
    };
  }

  return {
    level: 'Low',
    label: `Low - ${declared} is uncommon against local dominant profile ${dominant}`,
    isRare: true,
    declared,
    dominant
  };
}

function isResidentialType(type) {
  return type === 'Apartment' || type === 'Villa';
}

function coarseBucketSupportsAsset(type, landUseType) {
  if (type === 'Commercial') return landUseType === 'commercial' || landUseType === 'mixed';
  if (type === 'Plot') return landUseType === 'residential' || landUseType === 'mixed' || landUseType === 'commercial';
  if (isResidentialType(type)) return landUseType === 'residential' || landUseType === 'mixed';
  return false;
}

function getAccessQuality(summary = {}) {
  if ((summary.amenityScore || 0) >= 70) return 'strong';
  if ((summary.amenityScore || 0) >= 45) return 'moderate';
  return 'weak';
}

function isPremiumProfile(profile, property, bands) {
  const subtype = profile.propertySubtype;
  const premiumSubtypes = ['Penthouse', 'Villa', 'Bungalow', 'Farmhouse', 'Showroom', 'Commercial Plot'];
  return premiumSubtypes.includes(subtype)
    || property.type === 'Villa'
    || Number(property.area) > bands.p90;
}

function buildLocalReferenceContext(property, microMarket, coarseBucket, dataSufficiencyScore) {
  const norms = microMarket?.norms || {};
  const bands = getNormBands(norms);
  const prevalence = getSubtypePrevalence(property, microMarket);
  const avgPrice = Number(norms.avgPricePerSqft);
  const priceBand = Number.isFinite(avgPrice)
    ? `${formatINR(avgPrice * 0.9)} - ${formatINR(avgPrice * 1.1)}`
    : 'Not resolved';

  return {
    sizePercentileBand: `P5 ${bands.p5} sqft | P50 ${bands.p50} sqft | P95 ${bands.p95} sqft`,
    subtypePrevalence: prevalence.label,
    localPriceBand: priceBand,
    localLiquidityIndex: `${titleCase(microMarket?.demand || 'unknown')} demand, ${microMarket?.comparableCount || 0} comparables`,
    dataSufficiencyScore,
    circleRateSource: coarseBucket?.source || 'unknown'
  };
}

function runBlockingValidityChecks(profile, property, context) {
  const flags = [];
  const missingFields = profile.completenessStatus?.missingFields || [];
  const mandatoryComplete = profile.completenessStatus?.mandatoryComplete !== false;
  const hasStage1 = Boolean(context.stage1);

  if (!mandatoryComplete) {
    flags.push(createFlag({
      id: 'MISSING_MANDATORY_FIELDS',
      title: 'Missing Mandatory Intake Fields',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'completeness',
      explanation: 'Stage 2 cannot trust the case because mandatory Stage 1 fields are incomplete.',
      evidence: `Missing: ${missingFields.join(', ') || 'mandatory field'}`
    }));
  }

  if (!isValidCoordinatePair(profile.lat, profile.lon)) {
    flags.push(createFlag({
      id: 'INVALID_COORDINATES',
      title: 'Invalid Coordinates',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'format',
      explanation: 'Latitude and longitude must be valid numeric coordinates before valuation can proceed.',
      evidence: `lat=${profile.lat}, lon=${profile.lon}`
    }));
  }

  if (!Number.isFinite(profile.standardizedSizeSqft) || profile.standardizedSizeSqft <= 0 || profile.standardizedSizeSqft > 250000) {
    flags.push(createFlag({
      id: 'IMPOSSIBLE_SIZE',
      title: 'Impossible Property Size',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'format',
      explanation: 'The standardized area is outside the acceptable prototype range.',
      evidence: `${profile.standardizedSizeSqft} sqft`
    }));
  }

  if (!Number.isFinite(profile.ageYears) || profile.ageYears < 0 || profile.ageYears > 150) {
    flags.push(createFlag({
      id: 'IMPOSSIBLE_AGE',
      title: 'Impossible Property Age',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'format',
      explanation: 'Property age must be a plausible non-negative number before valuation.',
      evidence: `${profile.ageYears} years`
    }));
  }

  if (!SUPPORTED_SUBTYPES[profile.propertyType]) {
    flags.push(createFlag({
      id: 'UNSUPPORTED_PROPERTY_TYPE',
      title: 'Unsupported Property Type',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'format',
      explanation: 'The declared broad property type is not supported by the current valuation prototype.',
      evidence: profile.propertyType
    }));
  }

  const supportedSubtypes = SUPPORTED_SUBTYPES[profile.propertyType] || [];
  if (hasStage1 && (!profile.propertySubtype || profile.propertySubtype === 'Unspecified' || !supportedSubtypes.includes(profile.propertySubtype))) {
    flags.push(createFlag({
      id: 'UNSUPPORTED_PROPERTY_SUBTYPE',
      title: 'Unsupported Property Subtype',
      severity: 'block',
      sourceBucket: 'system',
      checkGroup: 'format',
      explanation: 'The declared subtype must be explicit and supported by the selected property type.',
      evidence: `${profile.propertyType} / ${profile.propertySubtype}`
    }));
  }

  return flags;
}

function runLocationValidation(profile, coarseBucket, hyperlocalContext) {
  const flags = [];

  if (!coarseBucket?.zoneId) {
    flags.push(createFlag({
      id: 'COARSE_BUCKET_UNRESOLVED',
      title: 'Coarse Bucket Not Resolved',
      severity: 'review',
      sourceBucket: 'coarse',
      checkGroup: 'location',
      explanation: 'The asset could not be assigned to a reliable coarse regulatory bucket.',
      evidence: `lat=${profile.lat}, lon=${profile.lon}`
    }));
  }

  if (!hyperlocalContext?.summary) {
    flags.push(createFlag({
      id: 'HYPERLOCAL_CONTEXT_UNRESOLVED',
      title: 'Hyperlocal Context Not Resolved',
      severity: 'warning',
      sourceBucket: 'hyperlocal',
      checkGroup: 'location',
      explanation: 'Nearby infrastructure and access signals were not fully resolved.',
      evidence: 'Missing hyperlocal summary'
    }));
  }

  return flags;
}

export function compareLocalNorms(property, microMarket) {
  const flags = [];
  const norms = microMarket?.norms || {};
  const bands = getNormBands(norms);
  const area = Number(property.area);
  const prevalence = getSubtypePrevalence(property, microMarket);

  if (area > bands.p97) {
    flags.push(createFlag({
      id: 'SIZE_ABOVE_P97',
      title: 'Strong Size Outlier',
      severity: 'review',
      sourceBucket: 'micro-market',
      checkGroup: 'localNorms',
      explanation: 'The property is much larger than similar properties nearby.',
      evidence: `${area} sqft is far above the usual local range`,
      anomalyPoints: 32,
      suspicionPoints: 12
    }));
  } else if (area > bands.p90) {
    flags.push(createFlag({
      id: 'SIZE_ABOVE_P90',
      title: 'Mild Size Outlier',
      severity: 'warning',
      sourceBucket: 'micro-market',
      checkGroup: 'localNorms',
      explanation: 'The property is larger than most similar properties nearby.',
      evidence: `${area} sqft is above the usual local range`,
      anomalyPoints: 14,
      suspicionPoints: 4
    }));
  }

  if (bands.p5 > 0 && area < bands.p5) {
    flags.push(createFlag({
      id: 'SIZE_BELOW_P5',
      title: 'Below Local Size Floor',
      severity: 'review',
      sourceBucket: 'micro-market',
      checkGroup: 'localNorms',
      explanation: 'The property is much smaller than similar properties nearby.',
      evidence: `${area} sqft is below the usual local range`,
      anomalyPoints: 28,
      suspicionPoints: 10
    }));
  }

  if (prevalence.isRare) {
    flags.push(createFlag({
      id: 'RARE_SUBTYPE_OR_CONFIGURATION',
      title: 'Rare Local Subtype',
      severity: 'penalty',
      sourceBucket: 'micro-market',
      checkGroup: 'localNorms',
      explanation: 'The declared subtype or configuration is uncommon in this micro-market.',
      evidence: prevalence.label,
      anomalyPoints: 14,
      suspicionPoints: 6
    }));
  }

  const age = Number(property.age);
  const avgAge = Number(norms.avgAge);
  if (Number.isFinite(avgAge) && age > Math.max(avgAge * 2, avgAge + 18)) {
    flags.push(createFlag({
      id: 'AGE_OUTLIER',
      title: 'Age Outlier',
      severity: 'warning',
      sourceBucket: 'micro-market',
      checkGroup: 'localNorms',
      explanation: 'The property is materially older than the local market norm.',
      evidence: `${age} years vs local avg ${avgAge} years`,
      anomalyPoints: 10,
      suspicionPoints: 2
    }));
  }

  return flags;
}

export function detectContextMismatch(property, coarseBucket, hyperlocalContext, microMarket) {
  const flags = [];
  const summary = hyperlocalContext?.summary || {};
  const norms = microMarket?.norms || {};
  const bands = getNormBands(norms);
  const accessQuality = getAccessQuality(summary);
  const landUseType = coarseBucket?.landUseType;
  const premiumProfile = property.isPremiumProfile ?? isPremiumProfile({ propertySubtype: property.subtype }, property, bands);

  if (property.type === 'Commercial' && landUseType === 'residential') {
    flags.push(createFlag({
      id: 'COMMERCIAL_IN_RESIDENTIAL_ZONE',
      title: 'Commercial Asset in Residential Zone',
      severity: 'review',
      sourceBucket: 'coarse',
      checkGroup: 'context',
      explanation: 'The declared commercial use does not align with the broad coarse-bucket land use.',
      evidence: `${property.type} in ${landUseType} zone ${coarseBucket?.zoneId}`,
      anomalyPoints: 26,
      suspicionPoints: 14
    }));
  }

  if (isResidentialType(property.type) && landUseType === 'industrial') {
    flags.push(createFlag({
      id: 'RESIDENTIAL_IN_INDUSTRIAL_ZONE',
      title: 'Residential Asset in Industrial Zone',
      severity: 'block',
      sourceBucket: 'coarse',
      checkGroup: 'context',
      explanation: 'Residential collateral in an industrial coarse bucket is a blocking zoning contradiction.',
      evidence: `${property.type} in ${landUseType} zone ${coarseBucket?.zoneId}`
    }));
  }

  if (premiumProfile && accessQuality === 'weak') {
    flags.push(createFlag({
      id: 'PREMIUM_PROFILE_WEAK_ACCESS',
      title: 'Premium Claim With Weak Hyperlocal Access',
      severity: 'penalty',
      sourceBucket: 'hyperlocal',
      checkGroup: 'context',
      explanation: 'A premium or oversized profile is not strongly supported by nearby access and amenity signals.',
      evidence: `Amenity score ${summary.amenityScore || 0}, metro ${summary.metroDistance || 'NA'}m, commercial ${summary.commercialDistance || 'NA'}m`,
      anomalyPoints: 18,
      suspicionPoints: 10
    }));
  }

  if (premiumProfile && microMarket?.demand === 'low') {
    flags.push(createFlag({
      id: 'STRONG_PROFILE_WEAK_LIQUIDITY',
      title: 'Strong Profile in Weak Liquidity Context',
      severity: 'penalty',
      sourceBucket: 'micro-market',
      checkGroup: 'context',
      explanation: 'The asset profile looks strong, but the local liquidity norm is weak.',
      evidence: `Demand=${microMarket?.demand}, comparables=${microMarket?.comparableCount}`,
      anomalyPoints: 16,
      suspicionPoints: 8
    }));
  }

  if (!premiumProfile && accessQuality === 'weak' && microMarket?.demand !== 'low') {
    flags.push(createFlag({
      id: 'LOCAL_NORMS_OK_HYPERLOCAL_WEAK',
      title: 'Hyperlocal Support Is Weak',
      severity: 'warning',
      sourceBucket: 'hyperlocal',
      checkGroup: 'context',
      explanation: 'Local norms do not contradict the case, but nearby infrastructure support is limited.',
      evidence: `Amenity score ${summary.amenityScore || 0}`,
      anomalyPoints: 8,
      suspicionPoints: 2
    }));
  }

  return flags;
}

function runCrossSignalChecks({ baseFlags, property, profile, coarseBucket, microMarket, hyperlocalContext, dataSufficiencyScore }) {
  const flags = [];
  const flagIds = new Set(baseFlags.map((flag) => flag.id));
  const reviewOrPenaltyFlags = baseFlags.filter((flag) => flag.severity === 'review' || flag.severity === 'penalty');
  const bands = getNormBands(microMarket?.norms);
  const premiumProfile = isPremiumProfile(profile, property, bands);
  const accessQuality = getAccessQuality(hyperlocalContext?.summary);
  const coarseSupports = coarseBucketSupportsAsset(property.type, coarseBucket?.landUseType);

  if ((flagIds.has('SIZE_ABOVE_P97') || flagIds.has('SIZE_BELOW_P5')) && flagIds.has('RARE_SUBTYPE_OR_CONFIGURATION')) {
    flags.push(createFlag({
      id: 'SIZE_OUTLIER_RARE_SUBTYPE',
      title: 'Size Outlier Combined With Rare Subtype',
      severity: 'review',
      sourceBucket: 'micro-market',
      checkGroup: 'crossSignal',
      explanation: 'The size anomaly becomes more suspicious because the subtype or configuration is also uncommon locally.',
      evidence: 'Strong size anomaly + rare subtype',
      anomalyPoints: 0,
      suspicionPoints: 24
    }));
  }

  if (premiumProfile && accessQuality === 'weak' && microMarket?.demand === 'low') {
    flags.push(createFlag({
      id: 'PREMIUM_WEAK_ACCESS_LOW_LIQUIDITY',
      title: 'Premium Profile Conflicts With Access and Liquidity',
      severity: 'review',
      sourceBucket: 'hyperlocal',
      checkGroup: 'crossSignal',
      explanation: 'Premium characteristics are not supported by hyperlocal access or local liquidity.',
      evidence: `Access=${accessQuality}, demand=${microMarket?.demand}`,
      anomalyPoints: 0,
      suspicionPoints: 26
    }));
  }

  if (isValidCoordinatePair(profile.lat, profile.lon) && baseFlags.some((flag) => flag.sourceBucket === 'coarse' && flag.severity !== 'warning')) {
    flags.push(createFlag({
      id: 'VALID_GEOCODE_CONTEXT_CONTRADICTION',
      title: 'Valid Geocode With Context Contradiction',
      severity: 'penalty',
      sourceBucket: 'coarse',
      checkGroup: 'crossSignal',
      explanation: 'Coordinates are valid, but the resolved coarse context conflicts with the asset claim.',
      evidence: `${property.type} in ${coarseBucket?.landUseType} zone`,
      anomalyPoints: 0,
      suspicionPoints: 14
    }));
  }

  if (dataSufficiencyScore < 0.45 && reviewOrPenaltyFlags.length >= 2) {
    flags.push(createFlag({
      id: 'LOW_DATA_MULTIPLE_ANOMALIES',
      title: 'Sparse Data With Multiple Anomalies',
      severity: 'review',
      sourceBucket: 'system',
      checkGroup: 'crossSignal',
      explanation: 'Low local data sufficiency combined with multiple anomalies raises review likelihood.',
      evidence: `Data sufficiency ${dataSufficiencyScore.toFixed(2)}, anomalies ${reviewOrPenaltyFlags.length}`,
      anomalyPoints: 0,
      suspicionPoints: 18
    }));
  } else if (dataSufficiencyScore < 0.45 && reviewOrPenaltyFlags.length > 0) {
    flags.push(createFlag({
      id: 'LOW_DATA_SINGLE_ANOMALY',
      title: 'Sparse Data With Anomaly',
      severity: 'penalty',
      sourceBucket: 'system',
      checkGroup: 'crossSignal',
      explanation: 'Sparse local data means the anomaly should widen confidence bounds rather than be ignored.',
      evidence: `Data sufficiency ${dataSufficiencyScore.toFixed(2)}`,
      anomalyPoints: 0,
      suspicionPoints: 9
    }));
  }

  if (flagIds.has('RARE_SUBTYPE_OR_CONFIGURATION') && coarseSupports) {
    flags.push(createFlag({
      id: 'COARSE_SUPPORTS_RARE_PROFILE',
      title: 'Coarse Bucket Support Applied',
      severity: 'warning',
      sourceBucket: 'coarse',
      checkGroup: 'crossSignal',
      explanation: 'The micro-market profile is unusual, but broad zoning supports the declared asset type, reducing suspicion.',
      evidence: `${property.type} supported by ${coarseBucket?.landUseType} land use`,
      anomalyPoints: 0,
      suspicionPoints: -10,
      protective: true
    }));
  }

  return flags;
}

export function calculateDataSufficiency(microMarket, coarseBucket, hasImages, hasLegal) {
  let score = 0;

  if (microMarket?.comparableCount >= 50) score += 0.30;
  else if (microMarket?.comparableCount >= 20) score += 0.20;
  else if (microMarket?.comparableCount >= 5) score += 0.10;

  if (microMarket?.dataFreshnessDays <= 7) score += 0.20;
  else if (microMarket?.dataFreshnessDays <= 14) score += 0.15;
  else if (microMarket?.dataFreshnessDays <= 30) score += 0.08;

  score += coarseBucket?.source === 'official_registry' ? 0.20 : 0.10;
  if (hasImages) score += 0.15;
  if (hasLegal) score += 0.15;

  return Math.min(Number(score.toFixed(2)), 1.0);
}

function scoreFlags(flags, dataSufficiencyScore) {
  const positiveFlags = flags.filter((flag) => !flag.protective);
  const anomalyScore = clamp(Math.round(positiveFlags.reduce((sum, flag) => sum + (flag.anomalyPoints || 0), 0)));
  const explicitSuspicion = flags.reduce((sum, flag) => sum + (flag.suspicionPoints || 0), 0);
  const severeFlagBonus = positiveFlags.filter((flag) => flag.severity === 'review').length * 4;
  const sparseDataPenalty = dataSufficiencyScore < 0.45 ? 12 : dataSufficiencyScore < 0.60 ? 5 : 0;
  const suspicionScore = clamp(Math.round((anomalyScore * 0.45) + explicitSuspicion + severeFlagBonus + sparseDataPenalty));

  return {
    dataSufficiencyScore,
    anomalyScore,
    suspicionScore
  };
}

function getWorstStatus(flags) {
  if (flags.length === 0) return 'pass';
  return flags.reduce((worst, flag) => (
    STATUS_WEIGHT[flag.severity] > STATUS_WEIGHT[worst] ? flag.severity : worst
  ), 'warning');
}

function buildChecksRun(flags, localReferenceContext) {
  const byGroup = Object.keys(CHECK_GROUPS).reduce((acc, key) => {
    acc[key] = flags.filter((flag) => flag.checkGroup === key);
    return acc;
  }, {});

  return [
    {
      id: 'completeness',
      label: CHECK_GROUPS.completeness,
      status: getWorstStatus(byGroup.completeness),
      explanation: byGroup.completeness.length
        ? byGroup.completeness.map((flag) => flag.evidence).join('; ')
        : 'All mandatory Stage 1 fields are present.'
    },
    {
      id: 'format_validity',
      label: CHECK_GROUPS.format,
      status: getWorstStatus(byGroup.format),
      explanation: byGroup.format.length
        ? byGroup.format.map((flag) => flag.evidence).join('; ')
        : 'Coordinates, size, age, type, and subtype formats are valid.'
    },
    {
      id: 'location_validation',
      label: CHECK_GROUPS.location,
      status: getWorstStatus(byGroup.location),
      explanation: byGroup.location.length
        ? byGroup.location.map((flag) => flag.explanation).join(' ')
        : 'Coarse bucket and hyperlocal context are resolved.'
    },
    {
      id: 'local_norms',
      label: CHECK_GROUPS.localNorms,
      status: getWorstStatus(byGroup.localNorms),
      explanation: byGroup.localNorms.length
        ? byGroup.localNorms.map((flag) => flag.explanation).join(' ')
        : `Property fits local reference band: ${localReferenceContext.sizePercentileBand}.`
    },
    {
      id: 'context_mismatch',
      label: CHECK_GROUPS.context,
      status: getWorstStatus(byGroup.context),
      explanation: byGroup.context.length
        ? byGroup.context.map((flag) => flag.explanation).join(' ')
        : 'Coarse land use, micro-market liquidity, and hyperlocal access are mutually consistent.'
    },
    {
      id: 'cross_signal',
      label: CHECK_GROUPS.crossSignal,
      status: getWorstStatus(byGroup.crossSignal),
      explanation: byGroup.crossSignal.length
        ? byGroup.crossSignal.map((flag) => flag.explanation).join(' ')
        : 'No compounding cross-signal contradictions were detected.'
    }
  ];
}

function resultForFlags(flags, fallback = 'pass') {
  if (!flags.length) return fallback;
  return flags.reduce((worst, flag) => (
    STATUS_WEIGHT[flag.severity] > STATUS_WEIGHT[worst] ? flag.severity : worst
  ), fallback);
}

function buildEvaluationRows({
  checksRun,
  flags,
  profile,
  property,
  microMarket,
  coarseBucket,
  hyperlocalContext,
  localReferenceContext,
  scores
}) {
  const norms = microMarket?.norms || {};
  const bands = getNormBands(norms);
  const summary = hyperlocalContext?.summary || {};
  const prevalence = getSubtypePrevalence(property, microMarket);
  const byGroup = (group) => flags.filter((flag) => flag.checkGroup === group && !flag.protective);
  const firstFlag = (ids) => flags.find((flag) => ids.includes(flag.id) && !flag.protective);
  const checkStatus = (id) => checksRun.find((check) => check.id === id)?.status || 'pass';

  const sizeFlag = firstFlag(['SIZE_ABOVE_P97', 'SIZE_ABOVE_P90', 'SIZE_BELOW_P5']);
  const subtypeFlag = firstFlag(['RARE_SUBTYPE_OR_CONFIGURATION']);
  const contextFlags = byGroup('context');
  const crossSignalFlags = byGroup('crossSignal');
  const locationFlags = byGroup('location');

  const sizeReference = sizeFlag?.id === 'SIZE_BELOW_P5'
    ? 'Much smaller than similar homes here'
    : sizeFlag?.id === 'SIZE_ABOVE_P97'
      ? 'Much larger than similar homes here'
      : sizeFlag?.id === 'SIZE_ABOVE_P90'
        ? 'Larger than most similar homes here'
        : 'Similar size to nearby properties';

  const accessQuality = getAccessQuality(summary);
  const contextStatus = resultForFlags(contextFlags, 'pass');
  const crossSignalStatus = resultForFlags(crossSignalFlags, 'pass');

  const usualSizeText = bands.p5 > 0
    ? `similar properties here are usually around ${bands.p5} to ${bands.p95} sqft`
    : 'nearby size norms are limited';
  const sourceBucketText = (value) => `Source: ${value}`;
  return [
    {
      id: 'completeness',
      check: 'Completeness',
      observedValue: profile.completenessStatus?.mandatoryComplete === false ? 'Mandatory fields missing' : 'Mandatory fields present',
      reference: 'All required details should be present',
      sourceBucket: 'System',
      result: checkStatus('completeness'),
      detail: profile.completenessStatus?.missingFields?.length
        ? `Some required details are missing: ${profile.completenessStatus.missingFields.join(', ')}. The system needs these before it can trust the case.`
        : 'Your property has the required location, property type, subtype, size, and age details. That gives the system enough basic information to continue.'
    },
    {
      id: 'format_validity',
      check: 'Basic details',
      observedValue: `Coordinates, age ${profile.ageYears} years, size ${profile.standardizedSizeSqft} sqft`,
      reference: 'The details look usable',
      sourceBucket: 'System',
      result: checkStatus('format_validity'),
      detail: `The location, age, size, and property category are in a usable format. This matters because valuation should not run on impossible or unsupported inputs.`
    },
    {
      id: 'location_validation',
      check: 'Location validation',
      observedValue: locationFlags.length ? 'Resolution issue detected' : 'Resolved successfully',
      reference: 'The location can be placed on the map',
      sourceBucket: 'Coarse + Hyperlocal',
      result: checkStatus('location_validation'),
      detail: `The property was matched to a broad zone and nearby context. The system found zone ${coarseBucket?.zoneId || 'not resolved'} and ${summary.totalPOIsFound ?? 0} nearby context signals, which helps compare it with the right area.`
    },
    {
      id: 'size_plausibility',
      check: 'Size plausibility',
      observedValue: `${property.area} sqft`,
      reference: sizeReference,
      sourceBucket: 'Micro-market',
      result: sizeFlag?.severity || 'pass',
      detail: `Your property is ${property.area} sqft. In this area, ${usualSizeText}. This matters because a much smaller or larger property may need extra review before valuation.`
    },
    {
      id: 'subtype_prevalence',
      check: 'Property type fit',
      observedValue: `${property.subtype || profile.propertySubtype} / ${property.config || 'No config'}`,
      reference: subtypeFlag ? 'This type is uncommon here' : 'This property type is common here',
      sourceBucket: 'Micro-market',
      result: subtypeFlag?.severity || 'pass',
      detail: `Your property is listed as ${prevalence.declared}. Nearby, the most common profile is ${prevalence.dominant}. ${subtypeFlag ? 'Because this is less common here, the system treats it with extra caution.' : 'That is a familiar type in this area, so this check does not raise concern.'}`
    },
    {
      id: 'context_fit',
      check: 'Area fit',
      observedValue: `${titleCase(accessQuality)} access, ${titleCase(microMarket?.demand || 'unknown')} liquidity`,
      reference: contextFlags.length ? 'The surrounding area partly supports this claim' : 'The surrounding area supports this claim',
      sourceBucket: 'Coarse + Micro-market + Hyperlocal',
      result: contextStatus,
      detail: `This is a ${coarseBucket?.landUseType || 'known'} area with ${titleCase(microMarket?.demand || 'unknown')} demand and ${summary.amenityScore ?? 'some'} access support. Some signals may support the claim more strongly than others, so this check looks for mismatch between the property and its surroundings.`
    },
    {
      id: 'data_sufficiency',
      check: 'Nearby data support',
      observedValue: scores.dataSufficiencyScore.toFixed(2),
      reference: scores.dataSufficiencyScore < 0.45 ? 'Nearby data is limited' : scores.dataSufficiencyScore < 0.6 ? 'Nearby data is usable but thin' : 'We have enough nearby data to judge this case',
      sourceBucket: 'System',
      result: scores.dataSufficiencyScore < 0.45 ? 'penalty' : 'pass',
      detail: `The system found ${localReferenceContext.localLiquidityIndex}. That gives ${scores.dataSufficiencyScore < 0.45 ? 'limited' : scores.dataSufficiencyScore < 0.6 ? 'some' : 'enough'} local support for judging the case. Visual and legal signals also improve confidence when provided.`
    },
    {
      id: 'cross_signal_consistency',
      check: 'Overall consistency',
      observedValue: crossSignalFlags.length ? `${crossSignalFlags.length} combined concern(s)` : 'No major mismatch found',
      reference: crossSignalFlags.length ? 'Multiple signals point to the same concern' : 'No major mismatch found',
      sourceBucket: 'System + Buckets',
      result: crossSignalStatus,
      detail: crossSignalFlags.length
        ? `The size, property type, location, and nearby market context combine into a concern: ${crossSignalFlags.map((flag) => flag.title).join(', ')}. That is why this can affect the final decision.`
        : 'The size, property type, location, and nearby market context do not combine into a strong contradiction, so no major review trigger is raised here.'
    }
  ].map((row) => ({
    ...row,
    sourceBucket: sourceBucketText(row.sourceBucket)
  }));
}

function makeStage2Decision(flags, scores) {
  const blocking = flags.some((flag) => flag.severity === 'block');
  const reviewCount = flags.filter((flag) => flag.severity === 'review').length;
  const penaltyCount = flags.filter((flag) => flag.severity === 'penalty').length;
  const hasStrongLocal = flags.some((flag) => flag.checkGroup === 'localNorms' && flag.severity === 'review');
  const hasStrongContext = flags.some((flag) => flag.checkGroup === 'context' && (flag.severity === 'review' || flag.severity === 'block'));
  const nonProtectiveFlags = flags.filter((flag) => !flag.protective);

  if (blocking) {
    return {
      decision: 'REJECT_BLOCK',
      explanation: 'A blocking validity or zoning issue was detected before valuation.'
    };
  }

  if (
    scores.suspicionScore >= 72
    || reviewCount >= 2
    || (hasStrongLocal && hasStrongContext && scores.suspicionScore >= 55)
    || (scores.dataSufficiencyScore < 0.45 && scores.anomalyScore >= 28)
  ) {
    return {
      decision: 'MANUAL_REVIEW',
      explanation: 'The case has enough contradictory or sparse signals to require human review before relying on valuation.'
    };
  }

  if (
    scores.dataSufficiencyScore < 0.45
    || scores.suspicionScore >= 42
    || scores.anomalyScore >= 35
    || penaltyCount > 0
  ) {
    return {
      decision: 'ACCEPT_CONFIDENCE_PENALTY',
      explanation: 'The case can proceed, but valuation confidence should be penalized because data or anomaly signals are not clean.'
    };
  }

  if (scores.suspicionScore >= 12 || nonProtectiveFlags.length > 0) {
    return {
      decision: 'ACCEPT_WARNING',
      explanation: 'Mild verification issues were found, but no strong contradiction blocks valuation.'
    };
  }

  return {
    decision: 'ACCEPT_CLEAN',
    explanation: 'Completeness, validity, local norms, context, and cross-signal checks passed without material flags.'
  };
}

export function makeVerificationDecision(suspicionScore, hasBlockingFlags, dataSufficiencyScore, anomalyScore = 0, flags = []) {
  const { decision, explanation } = makeStage2Decision(
    hasBlockingFlags ? [{ severity: 'block' }] : flags,
    { suspicionScore, dataSufficiencyScore, anomalyScore }
  );
  return {
    decision,
    label: DECISION_META[decision].label,
    color: DECISION_META[decision].color,
    explanation
  };
}

export function calculateSuspicionScore(allFlags, dataSufficiencyScore = 0.6) {
  const scores = scoreFlags(allFlags, dataSufficiencyScore);
  const crossSignalFlags = allFlags.filter((flag) => flag.checkGroup === 'crossSignal');
  return {
    score: scores.suspicionScore,
    crossSignalFlags
  };
}

export function aggregateFlags(normFlags, contextFlags, crossSignalFlags, validityFlags = [], locationFlags = []) {
  const allFlags = [...validityFlags, ...locationFlags, ...normFlags, ...contextFlags, ...crossSignalFlags];
  return [...allFlags].sort((a, b) => STATUS_WEIGHT[b.severity] - STATUS_WEIGHT[a.severity]);
}

function toLegacyFlag(flag) {
  return {
    id: flag.id,
    title: flag.title,
    text: flag.explanation,
    explanation: flag.explanation,
    severity: LEGACY_SEVERITY[flag.severity] || 'low',
    stage2Severity: flag.severity,
    source: flag.sourceBucket,
    sourceBucket: flag.sourceBucket,
    evidence: flag.evidence,
    anomalyScore: flag.anomalyPoints || 0,
    suspicionPoints: flag.suspicionPoints || 0,
    protective: flag.protective
  };
}

export function runAnomalyPipeline(
  property,
  coarseBucket,
  microMarket,
  hyperlocalContext,
  hasImages,
  hasLegal,
  context = {}
) {
  const profile = getProfile(property, context);
  const enrichedProperty = {
    ...property,
    subtype: profile.propertySubtype,
    isPremiumProfile: isPremiumProfile(profile, property, getNormBands(microMarket?.norms))
  };

  const dataSufficiencyScore = calculateDataSufficiency(microMarket, coarseBucket, hasImages, hasLegal);
  const localReferenceContext = buildLocalReferenceContext(enrichedProperty, microMarket, coarseBucket, dataSufficiencyScore);

  const validityFlags = runBlockingValidityChecks(profile, enrichedProperty, context);
  const locationFlags = runLocationValidation(profile, coarseBucket, hyperlocalContext);
  const normFlags = compareLocalNorms(enrichedProperty, microMarket);
  const contextFlags = detectContextMismatch(enrichedProperty, coarseBucket, hyperlocalContext, microMarket);
  const baseFlags = [...validityFlags, ...locationFlags, ...normFlags, ...contextFlags];
  const crossSignalFlags = runCrossSignalChecks({
    baseFlags,
    property: enrichedProperty,
    profile,
    coarseBucket,
    microMarket,
    hyperlocalContext,
    dataSufficiencyScore
  });

  const flags = aggregateFlags(normFlags, contextFlags, crossSignalFlags, validityFlags, locationFlags);
  const scores = scoreFlags(flags, dataSufficiencyScore);
  const decisionResult = makeStage2Decision(flags, scores);
  const checksRun = buildChecksRun(flags, localReferenceContext);
  const evaluationRows = buildEvaluationRows({
    checksRun,
    flags,
    profile,
    property: enrichedProperty,
    microMarket,
    coarseBucket,
    hyperlocalContext,
    localReferenceContext,
    scores
  });
  const nonProtectiveFlags = flags.filter((flag) => !flag.protective);

  const stage2Output = {
    checksRun,
    localReferenceContext,
    evaluationRows,
    flags,
    scores,
    decision: decisionResult.decision,
    decisionExplanation: decisionResult.explanation
  };

  const decision = {
    decision: stage2Output.decision,
    label: DECISION_META[stage2Output.decision].label,
    color: DECISION_META[stage2Output.decision].color,
    explanation: stage2Output.decisionExplanation
  };

  return {
    suspicionScore: scores.suspicionScore,
    anomalyScore: scores.anomalyScore,
    dataSufficiency: scores.dataSufficiencyScore,
    decision,
    flags: nonProtectiveFlags.map(toLegacyFlag),
    flagCount: nonProtectiveFlags.length,
    normFlags: normFlags.map(toLegacyFlag),
    contextFlags: contextFlags.map(toLegacyFlag),
    crossSignalFlags: crossSignalFlags.map(toLegacyFlag),
    checksRun,
    localReferenceContext,
    scores,
    stage2Output
  };
}
