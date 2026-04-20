export const normalData = {
  caseDetails: {
    address: "Lotus Heights, Apt 301, Andheri East, Mumbai",
    type: "Apartment",
    config: "2 BHK",
    area: 950,
    age: "5-15 years",
    facing: "West",
  },
  propScore: 78,
  confidence: 0.78,
  confidenceBreakdown: {
    base: 0.55,
    legal: 0.10,
    visual: 0.13,
  },
  marketValue: "₹1.05Cr - ₹1.25Cr",
  distressValue: "₹78L - ₹92L",
  timeToSell: "45 - 90 days",
  drivers: [
    { name: "Proximity to Metro (500m)", impact: "+12%", positive: true },
    { name: "Standard 2 BHK Layout", impact: "+8%", positive: true },
    { name: "Mid-age Building (12 yrs)", impact: "-5%", positive: false },
  ],
  risks: [
    { text: "Moderate competition in micro-market", severity: "medium" },
    { text: "Building age 12 years - monitor maintenance", severity: "low" },
  ],
  ltv: 65,
  visualAudit: {
    conditionScore: 7.8,
    conditionFindings: "Minor hairline crack detected (non-structural)",
    qualityFindings: "Premium finishes: marble flooring, modular kitchen",
    featuresFindings: "Balcony, built-in wardrobes. No staging detected.",
  },
};

export const fraudData = {
  caseDetails: {
    address: "Lotus Heights, Apt 301, Andheri East, Mumbai",
    type: "Apartment",
    config: "2 BHK",
    area: 400,
    age: "5-15 years",
    facing: "West",
  },
  propScore: 45,
  confidence: 0.55,
  confidenceBreakdown: {
    base: 0.55,
    legal: 0.00,
    visual: 0.00,
  },
  marketValue: "₹65L - ₹80L",
  distressValue: "₹45L - ₹55L",
  timeToSell: "90 - 150 days",
  drivers: [
    { name: "Proximity to Metro (500m)", impact: "+12%", positive: true },
    { name: "Non-standard Configuration", impact: "-15%", positive: false },
    { name: "Area Below Locality Norm", impact: "-20%", positive: false },
  ],
  risks: [
    { text: "Configuration Mismatch: 2BHK at 400 sqft", severity: "critical" },
    { text: "Area below 5th percentile for locality", severity: "critical" },
  ],
  ltv: 40,
  visualAudit: {
    conditionScore: 6.2,
    conditionFindings: "Visible wear, multiple hairline cracks",
    qualityFindings: "Standard finishes, some wear visible",
    featuresFindings: "Staging indicators detected in photos",
  },
};

export const whatsappMessages = [
  { type: 'bot', text: 'Hello! I am your property analysis assistant.', time: '10:30 AM' },
  { type: 'bot', text: 'Please share the property location. You can send a pin or type the address.', time: '10:30 AM' },
  { type: 'user', text: 'Location shared', time: '10:31 AM', isLocation: true, locationText: 'Lotus Heights, Andheri East, Mumbai' },
  { type: 'bot', text: 'Got it! Andheri East, Mumbai. Now, please share details', time: '10:31 AM' },
  { type: 'user', text: 'Apartment\n2 BHK\n950 sqft', time: '10:32 AM' },
  { type: 'bot', text: 'Great! Now please upload 3-5 photos of the property', time: '10:32 AM' },
  { type: 'user', text: '3 photos uploaded', time: '10:33 AM', isImage: true },
  { type: 'bot', text: 'Processing your submission... \nRunning AI Agents', time: '10:34 AM' },
  { type: 'bot', text: 'PropScore Analysis Complete! View full report on the web dashboard.', time: '10:35 AM' },
];

export const formatINR = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(0)}L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};

export const formatINRShort = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(0)}L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
};
