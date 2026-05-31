import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InputWizard from '../components/InputWizard';
import PropertyMap from '../components/PropertyMap';
import AgentTerminal from '../components/AgentTerminal';
import LandingHub from '../components/LandingHub';
import XAIBubble from '../components/XAIBubble';
import Stage1IntakeSection from '../components/Dashboard/Stage1IntakeSection';
import Stage2VerificationSection from '../components/Dashboard/Stage2VerificationSection';
import HistoricalReliabilitySection from '../components/Dashboard/HistoricalReliabilitySection';
import PortfolioRiskSection from '../components/Dashboard/PortfolioRiskSection';
import AIUnderwriterSummarySection from '../components/Dashboard/AIUnderwriterSummarySection';
import AuditPackSection from '../components/Dashboard/AuditPackSection';
import CaseHeader from '../components/Dashboard/CaseHeader';
import OverviewSection from '../components/Dashboard/OverviewSection';
import ValuationLiquiditySection from '../components/Dashboard/ValuationLiquiditySection';
import FinalDecisionStrip from '../components/Dashboard/FinalDecisionStrip';
import VisualEvidenceSection from '../components/Dashboard/VisualEvidenceSection';
import LocalityIntelligenceSection from '../components/Dashboard/LocalityIntelligenceSection';
import { emptyVisualEvidence } from '../lib/visualEvidenceEngine';
import { runValuation } from '../lib/valuationEngine';
import { generateUnderwriterSummary, scanPropertyImage } from '../lib/api';

const getStage1Payload = (payload) => payload?.normalizedPropertyProfile ? payload : payload?.stage1 || payload?.stage1Output || null;

const getPayloadAddress = (payload) => {
  const stage1 = getStage1Payload(payload);
  return stage1?.normalizedPropertyProfile?.address || payload?.location || 'Target';
};

const getPayloadCoordinates = (payload) => {
  const stage1 = getStage1Payload(payload);
  const profile = stage1?.normalizedPropertyProfile;
  if (Number.isFinite(profile?.lat) && Number.isFinite(profile?.lon)) return [profile.lat, profile.lon];
  return payload?.coordinates || [19.1136, 72.8697];
};

const payloadHasImages = (payload) => {
  const stage1 = getStage1Payload(payload);
  if (stage1) return (stage1.normalizedPropertyProfile?.imageCount || 0) > 0;
  return Boolean(payload?.enrichment?.images?.exterior);
};

const pickDefined = (source, keys) => keys.reduce((result, key) => {
  if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
    result[key] = source[key];
  }
  return result;
}, {});

const firstItems = (items, limit) => Array.isArray(items) ? items.slice(0, limit) : [];

const compactStage1ForSummary = (stage1 = {}) => {
  const profile = stage1.normalizedPropertyProfile || stage1.profile || {};
  const bucketAssignment = stage1.bucketAssignment || {};
  const coarseBucket = bucketAssignment.coarseBucket || stage1.coarseBucket || {};
  const microMarketBucket = bucketAssignment.microMarketBucket || stage1.microMarketBucket || {};
  const hyperlocalContext = stage1.hyperlocalContext || {};

  return {
    normalizedPropertyProfile: pickDefined(profile, [
      'address',
      'propertyType',
      'subtype',
      'sizeSqft',
      'ageBucket',
      'legalStatus',
      'titleClarity',
      'rentalStatus',
      'occupancyStatus',
      'imageCount',
    ]),
    bucketAssignment: {
      coarseBucket: pickDefined(coarseBucket, ['id', 'label']),
      microMarketBucket: pickDefined(microMarketBucket, [
        'id',
        'label',
        'commonSizeBand',
        'liquidityNorm',
        'localPriceBand',
      ]),
    },
    hyperlocalContext: pickDefined(hyperlocalContext, ['accessQuality']),
  };
};

const compactStage2ForSummary = (stage2 = {}) => ({
  decision: stage2.decision,
  scores: stage2.scores || pickDefined(stage2, ['dataSufficiencyScore', 'anomalyScore', 'suspicionScore']),
  flags: firstItems(stage2.flags, 4),
  localReferenceContext: stage2.localReferenceContext,
  evaluationRows: firstItems(stage2.evaluationRows || stage2.evaluationTable, 4),
});

const compactHistoricalForSummary = (historical = {}) => ({
  source: historical.source,
  overallSignal: historical.overallSignal,
  confidenceAdjustment: historical.confidenceAdjustment,
  displayedCount: historical.displayedCount || historical.similarCases?.length || historical.cases?.length,
  similarCases: firstItems(historical.similarCases || historical.cases, 2).map((item) => pickDefined(item, [
    'caseId',
    'similarityScore',
    'recencyWeight',
    'confidenceContribution',
    'outcomeSummary',
  ])),
});

const compactPortfolioForSummary = (portfolio = {}) => {
  const portfolioSummary = portfolio.portfolioSummary || {};
  return {
    source: portfolio.source,
    portfolioSummary: pickDefined(portfolioSummary, [
      'riskLevel',
      'portfolioRiskScore',
      'recommendedLtv',
      'reviewRecommendation',
    ]),
    riskFlags: firstItems(portfolio.riskFlags, 4),
  };
};

const compactLocalityIntelligenceForSummary = (li = {}) => {
  const events = Array.isArray(li.events) ? li.events.filter((e) => e?.accepted) : [];
  return {
    status: li.status,
    eventsFound: li.eventsFound,
    acceptedEvents: li.acceptedEvents,
    growthSignals: li.growthSignals,
    riskSignals: li.riskSignals,
    neutralSignals: li.neutralSignals,
    sourceTierCounts: li.sourceTierCounts,
    corroborationCounts: li.corroborationCounts,
    watchlistCount: (li.watchlistSignals || []).length,
    liquidityDelta: li.liquidityDelta,
    marketabilityDelta: li.marketabilityDelta,
    confidenceDelta: li.confidenceDelta,
    timeToLiquidateDeltaPct: li.timeToLiquidateDeltaPct,
    manualReviewRequired: !!li.manualReviewRequired,
    inspectionRoute: li.inspectionRoute,
    riskFlags: li.riskFlags || [],
    topAcceptedEvents: events.slice(0, 4).map((e) => ({
      eventType: e.eventType,
      direction: e.direction,
      sourceName: e.sourceName,
      sourceTier: e.sourceTier,
      corroborationStatus: e.corroborationStatus,
      severity: e.severity,
      confidence: e.confidence,
      localityRelevance: e.localityRelevance,
      isWatchlist: !!e.isWatchlist,
      summary: (e.summary || e.title || '').slice(0, 180),
    })),
  };
};

const compactVisualEvidenceForSummary = (visualEvidence = {}) => {
  const effects = visualEvidence.deterministicEffects || {};
  return {
    packetStatus: visualEvidence.packetStatus,
    processingStatus: visualEvidence.processingStatus,
    source: visualEvidence.source,
    modelUsed: visualEvidence.modelUsed,
    missingCategories: visualEvidence.missingCategories || [],
    metadataTrust: visualEvidence.metadataTrust?.sourceTrustLevel,
    gpsMatchStatus: visualEvidence.metadataTrust?.gpsMatchStatus,
    confidenceDelta: effects.confidenceDelta,
    valuationModifierPct: effects.valuationModifierPct,
    manualInspectionRequired: !!effects.manualInspectionRequired,
    inspectionRoute: effects.inspectionRoute,
    evidenceStrength: effects.evidenceStrength,
    acceptedConcerns: (visualEvidence.visualSignals || [])
      .filter((s) => s.accepted)
      .slice(0, 4)
      .map((s) => `${s.label} in ${String(s.imageCategory || '').replace(/_/g, ' ')}`),
  };
};

const buildUnderwriterSummaryPayload = (data) => {
  const stage1 = data?.stage1 || data?.stage1Output || {};
  const stage2Output = data?.stage2Output || {};
  return {
    caseId: data?.caseId || data?.property_id || stage1?.stage1Metadata?.generatedAt || 'CURRENT_CASE',
    stage1: compactStage1ForSummary(stage1),
    stage2Output: compactStage2ForSummary(stage2Output),
    valuation: {
      marketValue: data?.marketValue,
      distressValue: data?.distressValue,
      timeToLiquidateDays: data?.timeToSell,
      confidenceScore: data?.confidence,
    },
    historicalCaseSummary: compactHistoricalForSummary(data?.historicalCaseSummary || {}),
    portfolioRiskSummary: compactPortfolioForSummary(data?.portfolioRiskSummary || {}),
    visualEvidence: compactVisualEvidenceForSummary(data?.visualEvidence || {}),
    localityIntelligence: compactLocalityIntelligenceForSummary(data?.localityIntelligence || {}),
    numericDecisionBoundary: 'All numeric scores, value estimates, LTV adjustments, and risk flags are computed by deterministic engines. The AI summary only explains those outputs and recommends evidence.',
  };
};

const getUnderwriterSummaryRequestKey = (data) => {
  if (!data) return null;
  return [
    data?.caseId || data?.property_id || data?.stage1?.stage1Metadata?.generatedAt || 'CURRENT_CASE',
    data?.stage1?.normalizedPropertyProfile?.address || data?.address || '',
    data?.stage1?.normalizedPropertyProfile?.sizeSqft || data?.size || data?.area || '',
    data?.stage2Output?.decision || data?.verificationDecision?.decision || '',
    data?.marketValue || ''
  ].join('|');
};

const normalizeUnderwriterSummaryResponse = (response, defaultMode = 'auto') => {
  const source = response?.source || 'unavailable';
  const mode = response?.mode || defaultMode;
  const summaryQuality = response?.summaryQuality || (
    source === 'rule_based_fallback'
      ? 'fallback'
      : mode === 'enhanced'
        ? 'enhanced'
        : mode === 'fast'
          ? 'fast'
          : 'unavailable'
  );

  return {
    source,
    modelUsed: response?.modelUsed ?? null,
    fallbackUsed: Boolean(response?.fallbackUsed),
    mode,
    summaryQuality,
    upgradeAvailable: Boolean(response?.upgradeAvailable),
    error: response?.error || null,
    summary: response?.summary || null,
    llmDebug: response?.llmDebug || null
  };
};

const isEnhancedUpgrade = (response) => (
  response?.source === 'ollama' &&
  response?.summaryQuality === 'enhanced' &&
  Boolean(response?.summary)
);

const buildAuditExportPayload = (data, underwriterSummary) => {
  const stage1 = data?.stage1 || {};
  const portfolioSummary = data?.portfolioRiskSummary?.portfolioSummary || {};
  const stage2 = data?.stage2Output || {};

  return {
    generatedAt: new Date().toISOString(),
    reportType: 'PropScore collateral audit pack',
    case: {
      address: data?.caseDetails?.address || stage1?.normalizedPropertyProfile?.address,
      asset: data?.caseDetails,
      marketValue: data?.marketValue,
      distressValue: data?.distressValue,
      liquidityScore: data?.propScore,
      confidence: data?.confidence,
      recommendedLtv: portfolioSummary.recommendedLtv ?? data?.ltv,
      verificationDecision: data?.verificationDecision || stage2?.decision,
    },
    sources: {
      stage1: stage1?.stage1Metadata,
      stage2: {
        normSource: stage2?.normSource,
        normSourceLabel: stage2?.normSourceLabel,
        decision: stage2?.decision,
      },
      historical: {
        source: data?.historicalCaseSummary?.source,
        candidateCount: data?.historicalCaseSummary?.candidateCount,
        displayedCount: data?.historicalCaseSummary?.displayedCount,
        overallSignal: data?.historicalCaseSummary?.overallSignal,
      },
      portfolio: {
        source: data?.portfolioRiskSummary?.source,
        riskLevel: portfolioSummary.riskLevel,
        score: portfolioSummary.portfolioRiskScore,
      },
      ai: {
        source: underwriterSummary?.source,
        modelUsed: underwriterSummary?.modelUsed,
        summaryQuality: underwriterSummary?.summaryQuality,
        fallbackUsed: underwriterSummary?.fallbackUsed,
      },
      vision: {
        source: data?.visualAudit?.source,
        imageCount: data?.rawImages?.length || 0,
      },
    },
    deterministicBoundary: 'Numeric scores, value estimates, LTV adjustments, and risk flags are deterministic. AI only explains computed outputs and recommends evidence.',
    reviewFlags: [
      ...(stage2?.flags || []).filter((flag) => !flag?.protective),
      ...(data?.portfolioRiskSummary?.riskFlags || []).map((flag) => ({ source: 'portfolio', text: flag })),
    ],
    recommendedEvidence: underwriterSummary?.summary?.recommendedEvidence || [],
    aiSummary: underwriterSummary?.summary || null,
  };
};

const downloadJsonFile = (filename, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  
  const [showWizard, setShowWizard] = useState(false);
  const [currentData, setCurrentData] = useState(null); 
  const [pendingPayload, setPendingPayload] = useState(null);
  
  const [fieldDataIncluded, setFieldDataIncluded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [underwriterSummary, setUnderwriterSummary] = useState(null);
  const [isUnderwriterSummaryLoading, setIsUnderwriterSummaryLoading] = useState(false);
  const [underwriterSummaryEnhancement, setUnderwriterSummaryEnhancement] = useState({ status: 'idle', message: '' });
  const underwriterSummaryRequestRef = useRef({
    key: null,
    fastPromise: null,
    enhancedPromise: null,
    enhancementTimerId: null,
    enhancedRequestStarted: false,
    enhancedSummaryCommitted: false,
    visibleSummarySource: null
  });
  const underwriterSummarySequenceRef = useRef(0);

  // Modal & Notification States
  const [toast, setToast] = useState(null); 
  const [selectedImage, setSelectedImage] = useState(null); 

  // Map Filter States
  const [showCircleRate, setShowCircleRate] = useState(false);
  const [showMetro, setShowMetro] = useState(true);
  const [showFlood, setShowFlood] = useState(false);
  const [showImpactFactors, setShowImpactFactors] = useState(true);
  
  // Dashboard Tabs State
  const [activeTab, setActiveTab] = useState('summary');

  // Optional Visual Collateral Evidence — state is lifted here so the pre-
  // evaluation step (overlay between wizard and AgentTerminal) and the
  // post-evaluation dashboard tab share one source of truth.
  const [packet, setPacket] = useState({});
  const [packetMetadata, setPacketMetadata] = useState({
    uploadedByRole: 'unknown',
    gpsMatchStatus: 'unknown',
    captureVerificationStatus: 'unknown',
    freshnessDays: '',
  });
  const [scanStatus, setScanStatus] = useState('not_run');
  const [modelResults, setModelResults] = useState([]);
  const [modelUsed, setModelUsed] = useState('none');
  const [visualEvidence, setVisualEvidence] = useState(() => emptyVisualEvidence());
  const [showEvidenceStep, setShowEvidenceStep] = useState(false);

  // True CUDA Vision Backend State
  const [detectedBoxes, setDetectedBoxes] = useState({});
  const [visionStatus, setVisionStatus] = useState('idle');

  useEffect(() => {
     if (selectedImage) {
        const targetUrl = selectedImage === 'exterior' ? getImageUrl(0, defaultExterior) : 
                          selectedImage === 'living' ? getImageUrl(1, defaultLiving) : 
                          selectedImage === 'kitchen' ? getImageUrl(2, defaultKitchen) : null;
                          
        if (targetUrl && !detectedBoxes[targetUrl]) {
           const runCudaInference = async () => {
              setVisionStatus('scanning');
              try {
                 const apiData = await scanPropertyImage(targetUrl);
                 setDetectedBoxes(prev => ({ ...prev, [targetUrl]: apiData.results || [] }));
                 setVisionStatus('idle');
              } catch (err) {
                 console.error("Vision backend offline or failed:", err);
                 setVisionStatus('idle');
              }
           };
           runCudaInference();
        }
     }
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImage) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') setSelectedImage(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedImage]);

  useEffect(() => {
    if (!currentData) {
      if (underwriterSummaryRequestRef.current.enhancementTimerId) {
        window.clearTimeout(underwriterSummaryRequestRef.current.enhancementTimerId);
      }
      setUnderwriterSummary(null);
      setIsUnderwriterSummaryLoading(false);
      setUnderwriterSummaryEnhancement({ status: 'idle', message: '' });
      underwriterSummaryRequestRef.current = {
        key: null,
        fastPromise: null,
        enhancedPromise: null,
        enhancementTimerId: null,
        enhancedRequestStarted: false,
        enhancedSummaryCommitted: false,
        visibleSummarySource: null
      };
      return;
    }

    const requestKey = getUnderwriterSummaryRequestKey(currentData);
    const summaryPayload = buildUnderwriterSummaryPayload(augmentedData || currentData);
    const requestSequence = underwriterSummarySequenceRef.current + 1;
    underwriterSummarySequenceRef.current = requestSequence;

    const clearEnhancementTimer = () => {
      if (!underwriterSummaryRequestRef.current.enhancementTimerId) return;
      window.clearTimeout(underwriterSummaryRequestRef.current.enhancementTimerId);
      underwriterSummaryRequestRef.current = {
        ...underwriterSummaryRequestRef.current,
        enhancementTimerId: null
      };
    };

    const startEnhancedSummary = () => {
      if (underwriterSummarySequenceRef.current !== requestSequence) return;

      const requestState = underwriterSummaryRequestRef.current;
      if (requestState.key !== requestKey || requestState.enhancedRequestStarted) return;

      clearEnhancementTimer();

      let enhancedPromise = requestState.enhancedPromise;
      if (!enhancedPromise) {
        enhancedPromise = generateUnderwriterSummary(summaryPayload, { mode: 'enhanced' });
      }

      underwriterSummaryRequestRef.current = {
        ...requestState,
        enhancedPromise,
        enhancementTimerId: null,
        enhancedRequestStarted: true
      };
      setUnderwriterSummaryEnhancement({
        status: 'enhancing',
        message: 'Enhancing summary with qwen2.5:7b...'
      });

      enhancedPromise
        .then((enhancedResult) => {
          if (underwriterSummarySequenceRef.current !== requestSequence) return;

          const normalizedEnhanced = normalizeUnderwriterSummaryResponse(enhancedResult, 'enhanced');
          if (isEnhancedUpgrade(normalizedEnhanced)) {
            underwriterSummaryRequestRef.current = {
              ...underwriterSummaryRequestRef.current,
              enhancedSummaryCommitted: true,
              visibleSummarySource: 'ollama'
            };
            setUnderwriterSummary(normalizedEnhanced);
            setUnderwriterSummaryEnhancement({
              status: 'upgraded',
              message: 'Enhanced summary replaced the fast summary.'
            });
            showToast(`AI summary upgraded with ${normalizedEnhanced.modelUsed || 'qwen2.5:7b'}.`, 'success');
            return;
          }

          const currentSummarySource = underwriterSummaryRequestRef.current.visibleSummarySource || 'unavailable';

          if (currentSummarySource === 'ollama') {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable; fast summary retained.'
            });
            showToast('Fast AI summary retained. Enhanced model was unavailable.', 'info');
          } else if (currentSummarySource === 'rule_based_fallback') {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable; rule-based fallback retained.'
            });
            showToast('Fallback AI summary retained. Enhanced model was unavailable.', 'info');
          } else {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable while the fast summary is still loading.'
            });
            showToast('Enhanced model was unavailable while the fast summary was still loading.', 'info');
          }
        })
        .catch((error) => {
          if (underwriterSummarySequenceRef.current !== requestSequence) return;
          console.warn('Enhanced AI summary unavailable; retaining current summary.', error);
          const currentSummarySource = underwriterSummaryRequestRef.current.visibleSummarySource || 'unavailable';
          if (currentSummarySource === 'ollama') {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable; fast summary retained.'
            });
            showToast('Fast AI summary retained. Enhanced model was unavailable.', 'info');
          } else if (currentSummarySource === 'rule_based_fallback') {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable; rule-based fallback retained.'
            });
            showToast('Fallback AI summary retained. Enhanced model was unavailable.', 'info');
          } else {
            setUnderwriterSummaryEnhancement({
              status: 'unavailable',
              message: 'Enhanced model unavailable while the fast summary is still loading.'
            });
            showToast('Enhanced model was unavailable while the fast summary was still loading.', 'info');
          }
        })
        .finally(() => {
          if (underwriterSummarySequenceRef.current === requestSequence) {
            underwriterSummaryRequestRef.current = {
              ...underwriterSummaryRequestRef.current,
              enhancedPromise: null,
              enhancementTimerId: null,
            };
          }
        });
    };

    let fastPromise = (
      underwriterSummaryRequestRef.current.key === requestKey
      ? underwriterSummaryRequestRef.current.fastPromise
      : null
    );

    if (!fastPromise) {
      fastPromise = generateUnderwriterSummary(summaryPayload, { mode: 'fast' });
    }

    underwriterSummaryRequestRef.current = {
      key: requestKey,
      fastPromise,
      enhancedPromise: null,
      enhancementTimerId: null,
      enhancedRequestStarted: false,
      enhancedSummaryCommitted: false,
      visibleSummarySource: null
    };
    setUnderwriterSummary(null);
    setIsUnderwriterSummaryLoading(true);
    setUnderwriterSummaryEnhancement({ status: 'idle', message: '' });

    fastPromise
      .then((result) => {
        if (underwriterSummarySequenceRef.current !== requestSequence) return;

        const fastResponse = normalizeUnderwriterSummaryResponse(result, 'fast');
        if (!underwriterSummaryRequestRef.current.enhancedSummaryCommitted) {
          underwriterSummaryRequestRef.current = {
            ...underwriterSummaryRequestRef.current,
            visibleSummarySource: fastResponse.source
          };
          setUnderwriterSummary(fastResponse);
        }
        setIsUnderwriterSummaryLoading(false);

        if (fastResponse.source === 'rule_based_fallback') {
          showToast('AI summary is available in fallback form. Enhanced model will be attempted next.', 'info');
        } else if (fastResponse.summary) {
          showToast('Fast AI underwriter summary is ready in the AI Brief tab.', 'info');
        }

        if (!fastResponse.upgradeAvailable) {
          clearEnhancementTimer();
          underwriterSummaryRequestRef.current = {
            ...underwriterSummaryRequestRef.current,
            fastPromise: null,
            enhancedPromise: null
          };
          return;
        }

        startEnhancedSummary();
      })
      .catch((error) => {
        if (underwriterSummarySequenceRef.current !== requestSequence) return;
        setUnderwriterSummary(
          normalizeUnderwriterSummaryResponse({
            source: 'unavailable',
            modelUsed: null,
            fallbackUsed: false,
            mode: 'fast',
            summaryQuality: 'unavailable',
            upgradeAvailable: false,
            error: error?.message || 'AI underwriter summary unavailable',
            summary: null
          }, 'fast')
        );
        clearEnhancementTimer();
        underwriterSummaryRequestRef.current = {
          ...underwriterSummaryRequestRef.current,
          fastPromise: null,
          enhancedPromise: null,
          enhancementTimerId: null
        };
        setUnderwriterSummaryEnhancement({ status: 'idle', message: '' });
        setIsUnderwriterSummaryLoading(false);
      })
      .finally(() => {
        if (underwriterSummarySequenceRef.current === requestSequence) {
          underwriterSummaryRequestRef.current = {
            ...underwriterSummaryRequestRef.current,
            fastPromise: null
          };
          setIsUnderwriterSummaryLoading(false);
        }
      });

    return () => {
      clearEnhancementTimer();
    };
  }, [currentData]);

  const resetUnderwriterSummary = () => {
    underwriterSummarySequenceRef.current += 1;
    if (underwriterSummaryRequestRef.current.enhancementTimerId) {
      window.clearTimeout(underwriterSummaryRequestRef.current.enhancementTimerId);
    }
    underwriterSummaryRequestRef.current = {
      key: null,
      fastPromise: null,
      enhancedPromise: null,
      enhancementTimerId: null,
      enhancedRequestStarted: false,
      enhancedSummaryCommitted: false,
      visibleSummarySource: null
    };
    setUnderwriterSummary(null);
    setIsUnderwriterSummaryLoading(false);
    setUnderwriterSummaryEnhancement({ status: 'idle', message: '' });
  };

  const resetVisualEvidenceState = () => {
    Object.values(packet).forEach((entry) => {
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    });
    setPacket({});
    setPacketMetadata({
      uploadedByRole: 'unknown',
      gpsMatchStatus: 'unknown',
      captureVerificationStatus: 'unknown',
      freshnessDays: '',
    });
    setScanStatus('not_run');
    setModelResults([]);
    setModelUsed('none');
    setVisualEvidence(emptyVisualEvidence());
  };

  const handleWizardSubmit = (payload) => {
    setShowWizard(false);
    setPendingPayload(payload);
    setActiveTab('summary');
    resetUnderwriterSummary();
    resetVisualEvidenceState();
    // Pause before evaluation: collect optional visual evidence first.
    setShowEvidenceStep(true);
  };

  const handleEvidenceContinue = () => {
    setShowEvidenceStep(false);
    setIsLoading(true); // Triggers AgentTerminal + finalizeValuation
  };

  // Augment dashboard data with bounded visual-evidence + locality cross-rule effects.
  // confidence is clamped; market value is NOT altered (visualModifier shows separately).
  const augmentedData = useMemo(() => {
    if (!currentData) return null;
    const visualDelta = visualEvidence?.deterministicEffects?.confidenceDelta || 0;

    // Cross-rule — media waterlogging + visual seepage/dampness → technical inspection.
    const li = currentData.localityIntelligence;
    const acceptedEvents = li?.events?.filter((e) => e?.accepted) || [];
    const hasMediaWaterRisk = acceptedEvents.some(
      (e) => ['waterlogging_risk', 'flood_warning', 'weather_water_risk', 'heavy_rain_alert'].includes(e.eventType)
    );
    const hasVisualWaterDamage = (visualEvidence?.visualSignals || []).some(
      (s) => s.accepted && ['seepage', 'dampness', 'water_stain', 'damaged_plaster'].includes(s.id)
    );
    const crossRuleFired = hasMediaWaterRisk && hasVisualWaterDamage;
    const crossRuleConfidencePenalty = crossRuleFired ? -0.02 : 0;

    const effectiveConfidence = Math.max(
      0.25,
      Math.min(0.95, (Number(currentData.confidence) || 0) + visualDelta + crossRuleConfidencePenalty)
    );

    const crossRuleAudit = crossRuleFired ? {
      ruleId: 'NEWS_VISUAL_CROSS_WATER_001',
      source: 'cross_rule_engine',
      input: 'media waterlogging/flood/heavy_rain + visual seepage/dampness/water_stain',
      effect: 'confidence -0.02 (clamped), technical_valuer_inspection',
      explanation: 'Locality-news water risk corroborated by accepted visual seepage/dampness signal. Triggered technical valuer inspection and a small bounded confidence penalty.',
    } : null;

    return {
      ...currentData,
      visualEvidence,
      confidence: effectiveConfidence,
      confidenceBreakdown: {
        ...(currentData.confidenceBreakdown || {}),
        visualEvidenceDelta: visualDelta,
        crossRuleDelta: crossRuleConfidencePenalty,
      },
      crossRule: crossRuleFired ? {
        ruleId: 'NEWS_VISUAL_CROSS_WATER_001',
        inspectionRoute: 'technical_valuer_inspection',
        confidencePenalty: crossRuleConfidencePenalty,
        audit: crossRuleAudit,
      } : null,
    };
  }, [currentData, visualEvidence]);
  const finalizeValuation = async () => {
    try {
      const targetCenter = getPayloadCoordinates(pendingPayload); 
      
      const results = await runValuation(pendingPayload);
      results.coordinates = targetCenter;
      const visionDetections = {};
      (results.visualAudit?.detectionsByImage || []).forEach((item) => {
        const imageUrl = results.rawImages?.[item.index];
        if (imageUrl) visionDetections[imageUrl] = item.results || [];
      });
      
      setDetectedBoxes(visionDetections);
      setCurrentData(results);
      setActiveTab('summary');
      setFieldDataIncluded(payloadHasImages(pendingPayload));
    } catch (error) {
      console.error("Valuation Engine Error:", error);
      showToast("Valuation Engine crashed. Check console.", "error");
    } finally {
      setIsLoading(false);
      setPendingPayload(null);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleExportAuditPack = () => {
    if (!currentData) {
      showToast('Generate a case before exporting an audit pack.', 'info');
      return;
    }

    const payload = buildAuditExportPayload(currentData, underwriterSummary);
    const slug = String(currentData.caseDetails?.address || 'propscore-case')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'propscore-case';
    downloadJsonFile(`${slug}-audit-pack.json`, payload);
    showToast('Audit pack exported as JSON.', 'success');
  };

  const calculateGaugeOffset = (score) => {
    return 251 - (251 * (score / 100));
  };

  const defaultExterior = "https://lh3.googleusercontent.com/aida-public/AB6AXuA1SApb750yQYbJtFHGRemWz--sEHdPwXTJr5nCpIK_cj6gKGKzRn7EHOVIynJu4gnSDq3IfgclBa-N1AYzotN_OSVnwAMma4ujpHUh6PDPe4gjWQb1MEx6gqZO4FW9Cc4WbRilA3v-rJq5JTdcCROu0y0vwZ9T6VLnU2AdSpJgX6OYZvhkgiGbtEJk51NG3_cjrWA3MU8R7JuotoyBjEjvq3_eLylkq3rv5ADbknUoRfFLNcsDjsC8P5DIRtZ9vF9z7kS7WAEPJTPv";
  const defaultLiving = "https://lh3.googleusercontent.com/aida-public/AB6AXuAjHoqaV86y19B2s3MLps2eYeM0bz5984kIaOpdLw4IvBDkDC8Ucna9rdaBgoijAwlZ5kTqU9WvU7ecUmTQixJG5IX2Ncnw2hgvZEcPBoaGf5HFE9G-_1eZ9ECF1U-5fRH_ko2gUVuoM5rwvH-GAfGTFJK--P42SyYdTSpkPZvoHuPiORe_F3HWI7JR5sWskKEZvjvPQugYLrLTFVp5ZcIUS5O7e8D5iykxzpKmWx54odKLNg2B7C3ih1NSaXzDKzI-EDBmlCcVqAU6";
  const defaultKitchen = "https://lh3.googleusercontent.com/aida-public/AB6AXuB8XGn5YwGAABpNvnbJvaA57CyQyc_Z3mlGZynB3mg1irAN1ZxTTr0ilTosQrAUIC_ELEFiXWlNwPMVxuIDSn_TQgzqWAAOxAlI_wYvLChOAVaHRutWGrkZ6UIo121roaZYD_xCgkx0mJgqXzgOOFsi0CqotflFpbDaBPHOo-Q2_mW3T53mUsn7-OJZcIQ_KZNF6UMwD4qIVzCVCIHbDMf31b3eBxx9G7xGTz9IaBCcd91Z1OW5DoUU2gkJimJHgMZv-ABprPcaEnsI";

  const getImageUrl = (index, fallback) => {
    return (currentData?.rawImages && currentData.rawImages[index]) ? currentData.rawImages[index] : fallback;
  };

  const selectedImageObj = selectedImage === 'exterior' ? getImageUrl(0, defaultExterior) : 
                           selectedImage === 'living' ? getImageUrl(1, defaultLiving) : 
                           selectedImage === 'kitchen' ? getImageUrl(2, defaultKitchen) : null;

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Toast Notification Portal */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white`}>
          <span className="material-symbols-outlined text-xl">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Modals & Overlays */}
      {showWizard && <InputWizard onSubmit={handleWizardSubmit} onCancel={() => setShowWizard(false)} />}

      {/* Image Annotation Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged property image"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 animate-in fade-in"
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image"
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors duration-150 bg-white/10 p-2 rounded-full"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
          
          <div className="max-w-4xl w-full h-[80vh] relative flex flex-col justify-center items-center">
            <div className="relative inline-block border-4 border-slate-800 rounded-xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
               <img src={selectedImageObj} alt="Enlarged visualization" className="max-h-[75vh] w-auto max-w-full object-contain" />
              {/* Active ML Bounding Boxes mapping */}
              {selectedImageObj && detectedBoxes[selectedImageObj] && detectedBoxes[selectedImageObj].map((box, idx) => {
                 return (
                  <div key={idx} style={{ 
                      top: `${box.top_pct}%`, left: `${box.left_pct}%`, width: `${box.width_pct}%`, height: `${box.height_pct}%` 
                  }} className="absolute border-2 shadow-sm pointer-events-none rounded transition-all flex justify-center border-red-500 bg-red-500/10">
                    <span className="absolute -top-7 whitespace-nowrap px-2 py-0.5 text-xs font-bold text-white rounded shadow-sm bg-red-500">
                      {box.label} ({Math.round(box.score * 100)}%)
                    </span>
                  </div>
                 );
              })}
              
              {visionStatus === 'scanning' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md text-white font-mono flex-col gap-3 rounded-xl z-50">
                      <div className="w-10 h-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                      <p className="font-bold text-amber-500 tracking-widest text-sm">RUNNING VISION SCAN...</p>
                  </div>
              )}
              
            </div>
            <p className="text-emerald-400 mt-4 font-mono text-sm">
                {visionStatus === 'scanning' ? "Vision Agent processing matrix... Do not close." : 
                 (detectedBoxes[selectedImageObj] ? `Analysis Complete: Detected ${detectedBoxes[selectedImageObj].length} Risk Element(s)` : "Vision Agent Diagnostics Connected")}
            </p>
          </div>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TopNavBar */}
        <header className="z-50 flex w-full items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">PropScore</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Collateral intelligence</p>
            </div>
            <span className="hidden items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Deterministic engines active
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-[12px] font-mono font-semibold uppercase tracking-wider text-slate-500 lg:flex">
              <span>Local SQLite</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <span>FastAPI</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <span>Ollama optional</span>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Case
            </button>
            <button
              onClick={handleExportAuditPack}
              disabled={!currentData}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Audit Pack
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-5 pb-32 transition-opacity duration-300 relative md:p-8">

          {/* Step 2: Visual Evidence (between wizard and AgentTerminal) */}
          {showEvidenceStep && pendingPayload && (
            <div className="fixed inset-0 z-50 flex flex-col bg-[#eef2f6]">
              <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600">Step 2 of 2 · Optional</p>
                    <h2 className="text-lg font-bold text-slate-900">Visual Collateral Evidence</h2>
                    <p className="text-sm text-slate-500 max-w-3xl">
                      Upload the standardized image packet now and run the optional vision scan, or continue without — image impact will be zero.
                      You can also add or change evidence later from the Visual Evidence tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEvidenceContinue}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-slate-800"
                  >
                    Continue to evaluation
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-5 md:p-8">
                <div className="max-w-7xl mx-auto">
                  <VisualEvidenceSection
                    packet={packet}
                    setPacket={setPacket}
                    packetMetadata={packetMetadata}
                    setPacketMetadata={setPacketMetadata}
                    scanStatus={scanStatus}
                    setScanStatus={setScanStatus}
                    modelResults={modelResults}
                    setModelResults={setModelResults}
                    modelUsed={modelUsed}
                    setModelUsed={setModelUsed}
                    onChange={setVisualEvidence}
                  />
                </div>
              </div>
            </div>
          )}

          {isLoading && pendingPayload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/90 backdrop-blur-md px-4 py-6">
              <div className="w-full max-w-4xl">
              <div className="mb-5 flex flex-col items-center text-center">
                 <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                 <h2 className="text-xl font-bold font-headline text-slate-800">Generating collateral intelligence</h2>
                 <p className="text-sm text-slate-500">The deterministic valuation and verification pipeline is running.</p>
              </div>
              <AgentTerminal 
              isActive={isLoading} 
              locationName={getPayloadAddress(pendingPayload).split(',')[0]} 
              hasImages={payloadHasImages(pendingPayload)}
              externalLog={visionStatus.startsWith('Downloading') ? visionStatus : null}
              blockComplete={visionStatus.startsWith('Downloading')}
              onComplete={finalizeValuation} 
            />
              </div>
            </div>
          )}

          {!currentData && !isLoading ? (
             <LandingHub onInitialize={() => setShowWizard(true)} />
          ) : (
             currentData && (
              <div className={`max-w-7xl mx-auto space-y-6 ${isLoading ? 'opacity-0 scale-95 transition-all' : 'opacity-100 scale-100 transition-all duration-500'}`}>
                <CaseHeader
                  data={augmentedData}
                  aiStatus={
                    isUnderwriterSummaryLoading
                      ? 'Generating'
                      : underwriterSummaryEnhancement.status === 'enhancing'
                        ? 'Enhancing'
                        : underwriterSummary?.summaryQuality || 'Pending'
                  }
                />
                
                {/* Clean Tab Navigation */}
                <div className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
                  <div className="flex gap-1.5 overflow-x-auto">
                  {[
                    { id: 'summary', label: 'Overview', icon: 'monitoring' },
                    { id: 'intake', label: 'Stage 1 Buckets', icon: 'rule_settings' },
                    { id: 'verification', label: 'Stage 2 Verification', icon: 'fact_check' },
                    { id: 'valuation', label: 'Valuation', icon: 'payments' },
                    { id: 'history', label: 'Historical Cases', icon: 'history' },
                    { id: 'portfolio', label: 'Portfolio Risk', icon: 'account_balance' },
                    { id: 'audit', label: 'Audit Pack', icon: 'fact_check' },
                    {
                      id: 'ai',
                      label: 'AI Brief',
                      icon: 'psychology',
                      status: isUnderwriterSummaryLoading
                        ? 'Fast'
                        : underwriterSummaryEnhancement.status === 'scheduled'
                          ? 'Queued'
                        : underwriterSummaryEnhancement.status === 'enhancing'
                          ? 'Enhancing'
                          : underwriterSummaryEnhancement.status === 'upgraded'
                            ? 'Enhanced'
                            : underwriterSummary?.summary
                              ? 'Ready'
                              : null
                    },
                    { id: 'analysis', label: 'Visual Evidence', icon: 'camera_enhance' },
                    { id: 'locality_events', label: 'Locality Events', icon: 'public' },
                    { id: 'location', label: 'Map Intelligence', icon: 'public' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                        activeTab === tab.id 
                          ? 'text-white bg-slate-950 border border-slate-950 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      {tab.label}
                      {tab.status && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest">
                          {tab.status}
                        </span>
                      )}
                    </button>
                  ))}
                  </div>
                </div>

                {activeTab === 'summary' && (
                  <OverviewSection
                    data={augmentedData}
                    underwriterSummary={underwriterSummary}
                    isUnderwriterSummaryLoading={isUnderwriterSummaryLoading}
                  />
                )}

                {activeTab === 'intake' && <Stage1IntakeSection stage1={currentData.stage1} />}

                {activeTab === 'verification' && <Stage2VerificationSection stage2Output={currentData.stage2Output} />}

                {activeTab === 'valuation' && <ValuationLiquiditySection data={augmentedData} />}

                {activeTab === 'history' && <HistoricalReliabilitySection historicalCaseSummary={currentData.historicalCaseSummary} />}

                {activeTab === 'portfolio' && <PortfolioRiskSection portfolioRiskSummary={currentData.portfolioRiskSummary} />}

                {activeTab === 'audit' && (
                  <AuditPackSection
                    data={augmentedData}
                    underwriterSummary={underwriterSummary}
                  />
                )}

                {activeTab === 'ai' && (
                  <AIUnderwriterSummarySection
                    summaryResponse={underwriterSummary}
                    isLoading={isUnderwriterSummaryLoading}
                    enhancementState={underwriterSummaryEnhancement}
                  />
                )}

                {/* Hyperlocal Event Intelligence */}
                {activeTab === 'locality_events' && (
                  <LocalityIntelligenceSection localityIntelligence={augmentedData?.localityIntelligence} />
                )}

                {/* Visual Collateral Evidence (post-evaluation edit) */}
                {activeTab === 'analysis' && (
                  <VisualEvidenceSection
                    packet={packet}
                    setPacket={setPacket}
                    packetMetadata={packetMetadata}
                    setPacketMetadata={setPacketMetadata}
                    scanStatus={scanStatus}
                    setScanStatus={setScanStatus}
                    modelResults={modelResults}
                    setModelResults={setModelResults}
                    modelUsed={modelUsed}
                    setModelUsed={setModelUsed}
                    onChange={setVisualEvidence}
                  />
                )}

                {/* Bottom Row: Map */}
                {activeTab === 'location' && (
                <div className="bg-white rounded-xl p-6 w-full border border-slate-200 shadow-sm mb-8 relative z-0">
                   <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                         <span className="material-symbols-outlined text-indigo-500">public</span>
                         Hyperlocal Map Intelligence
                         <XAIBubble title="Location Intelligence Engine">
                           <p>Address is resolved to precise coordinates using the <span className="font-semibold text-slate-800">Komoot Photon</span> geocoder backed by OpenStreetMap data.</p>
                           <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs text-slate-600 mt-2 space-y-1 border border-slate-100">
                             <div>Geocoder: <span className="text-indigo-600">Photon (Komoot)</span></div>
                             <div>Data: <span className="text-indigo-600">OpenStreetMap</span></div>
                             <div>Proximity: <span className="text-indigo-600">Haversine distance</span></div>
                           </div>
                           <p className="mt-3">Infrastructure proximity (metro, highway, commercial hubs) is calculated using Haversine distance formulas. Circle rate zones are interpolated from government registry benchmarks to establish the statutory floor value.</p>
                         </XAIBubble>
                      </h3>
                      <div className="flex flex-wrap justify-end gap-2 max-w-lg">
                         <button onClick={() => setShowCircleRate(!showCircleRate)} className={`px-3 py-1 text-xs border rounded-full transition-colors font-bold flex items-center gap-1 ${showCircleRate ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <span className={`w-2 h-2 rounded-full ${showCircleRate ? 'bg-indigo-500' : 'bg-slate-300'}`}></span> Zone
                         </button>
                         <button onClick={() => setShowMetro(!showMetro)} className={`px-3 py-1 text-xs border rounded-full transition-colors font-bold flex items-center gap-1 ${showMetro ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <span className={`w-2 h-2 rounded-full ${showMetro ? 'bg-emerald-500' : 'bg-slate-300'}`}></span> Metro
                         </button>
                         <button onClick={() => setShowImpactFactors(!showImpactFactors)} className={`px-3 py-1 text-xs border rounded-full transition-colors font-bold flex items-center gap-1 shadow-sm ${showImpactFactors ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <span className={`w-2 h-2 rounded-full ${showImpactFactors ? 'bg-indigo-500' : 'bg-slate-300'}`}></span> Collateral Signals
                         </button>
                      </div>
                   </div>

                   <PropertyMap 
                     center={currentData.coordinates} 
                     showCircleRate={showCircleRate} 
                     showMetro={showMetro} 
                     showFlood={showFlood} 
                     showImpactFactors={showImpactFactors}
                     hyperlocalPOIs={currentData.hyperlocalContext?.pois || []}
                   />
                </div>
                )}

              </div>
             )
          )}
        </main>

        {/* Bottom Decision Bar */}
        {currentData && !isLoading && (
          <FinalDecisionStrip
            data={augmentedData}
            underwriterSummary={underwriterSummary}
          />
        )}

      </div>
    </div>
  );
}
