export const mockHistoricalCases = [
  {
    caseId: 'HC-102',
    location: 'Andheri East, Mumbai',
    microMarket: 'MM-19.115-72.870',
    propertyType: 'Apartment',
    subtype: 'Apartment',
    config: '2 BHK',
    sizeBand: '900-1100 sqft',
    sizeMin: 900,
    sizeMax: 1100,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 62,
      valuationDeviationPct: 4,
      recoveryQuality: 'Strong recovery'
    },
    contribution: {
      confidenceDelta: 0.07,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-184',
    location: 'Andheri East, Mumbai',
    microMarket: 'MM-19.115-72.870',
    propertyType: 'Apartment',
    subtype: 'Apartment',
    config: '2 BHK',
    sizeBand: '850-1050 sqft',
    sizeMin: 850,
    sizeMax: 1050,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 75,
      valuationDeviationPct: 6,
      recoveryQuality: 'Good recovery'
    },
    contribution: {
      confidenceDelta: 0.05,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-221',
    location: 'Powai, Mumbai',
    microMarket: 'MM-19.120-72.910',
    propertyType: 'Apartment',
    subtype: 'Apartment',
    config: '2 BHK',
    sizeBand: '900-1200 sqft',
    sizeMin: 900,
    sizeMax: 1200,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 94,
      valuationDeviationPct: 8,
      recoveryQuality: 'Normal recovery'
    },
    contribution: {
      confidenceDelta: 0.03,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-305',
    location: 'Andheri East, Mumbai',
    microMarket: 'MM-19.115-72.870',
    propertyType: 'Apartment',
    subtype: 'Studio',
    config: 'Studio',
    sizeBand: '450-650 sqft',
    sizeMin: 450,
    sizeMax: 650,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 118,
      valuationDeviationPct: 11,
      recoveryQuality: 'Slower recovery'
    },
    contribution: {
      confidenceDelta: -0.02,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-477',
    location: 'Kandivali East, Mumbai',
    microMarket: 'MM-19.205-72.870',
    propertyType: 'Apartment',
    subtype: 'Apartment',
    config: '3 BHK',
    sizeBand: '1200-1500 sqft',
    sizeMin: 1200,
    sizeMax: 1500,
    ageBucket: 'Old',
    legalProfile: 'Leasehold',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'Delayed Repayment',
      liquidationDays: 146,
      valuationDeviationPct: 14,
      recoveryQuality: 'Discounted recovery'
    },
    contribution: {
      confidenceDelta: -0.04,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-618',
    location: 'Andheri West, Mumbai',
    microMarket: 'MM-19.135-72.830',
    propertyType: 'Apartment',
    subtype: 'Penthouse',
    config: '4 BHK+',
    sizeBand: '1800-2400 sqft',
    sizeMin: 1800,
    sizeMax: 2400,
    ageBucket: 'New',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 88,
      valuationDeviationPct: 7,
      recoveryQuality: 'Good recovery'
    },
    contribution: {
      confidenceDelta: 0.02,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-733',
    location: 'Thane West, Mumbai',
    microMarket: 'MM-19.215-72.980',
    propertyType: 'Commercial',
    subtype: 'Office',
    config: 'Office',
    sizeBand: '700-1000 sqft',
    sizeMin: 700,
    sizeMax: 1000,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Rejected',
      defaultStatus: 'High Risk',
      liquidationDays: null,
      valuationDeviationPct: 18,
      recoveryQuality: 'Rejected before disbursal'
    },
    contribution: {
      confidenceDelta: -0.06,
      liquidityDelta: 0,
      distressDelta: 0
    }
  },
  {
    caseId: 'HC-884',
    location: 'Baner, Pune',
    microMarket: 'MM-18.560-73.780',
    propertyType: 'Apartment',
    subtype: 'Apartment',
    config: '2 BHK',
    sizeBand: '950-1200 sqft',
    sizeMin: 950,
    sizeMax: 1200,
    ageBucket: 'Mid-age',
    legalProfile: 'Clear',
    outcome: {
      approvalStatus: 'Approved',
      defaultStatus: 'No Default',
      liquidationDays: 81,
      valuationDeviationPct: 5,
      recoveryQuality: 'Good recovery'
    },
    contribution: {
      confidenceDelta: 0.02,
      liquidityDelta: 0,
      distressDelta: 0
    }
  }
];
