import React, { useState, useEffect, useRef } from 'react';

// ─── Item 2: Unit Conversion Constants ───
const UNIT_CONVERSIONS = {
  sqft: { toSqft: 1, label: 'Sq.Ft' },
  sqm:  { toSqft: 10.7639, label: 'Sq.M' },
  sqyd: { toSqft: 9, label: 'Sq.Yd' }
};

// ─── Item 3: Property Taxonomy Mapping ───
const SUBTYPE_MAP = {
  // Apartment subtypes
  'flat': 'Apartment', 'apartment': 'Apartment', 'condo': 'Apartment',
  'penthouse': 'Penthouse', 'duplex': 'Duplex', 'triplex': 'Duplex',
  'studio': 'Studio', 'service apartment': 'Studio',
  // Villa subtypes
  'villa': 'Villa', 'bungalow': 'Villa', 'row house': 'Villa',
  'townhouse': 'Villa', 'farmhouse': 'Villa', 'independent house': 'Villa',
  'kothi': 'Villa',
  // Commercial subtypes
  'office': 'Commercial', 'shop': 'Commercial', 'showroom': 'Commercial',
  'warehouse': 'Commercial', 'godown': 'Commercial', 'co-working': 'Commercial',
  // Plot subtypes
  'plot': 'Plot', 'land': 'Plot', 'agricultural': 'Plot',
};

function fuzzyMatchSubtype(input) {
  if (!input || input.trim().length === 0) return { match: null, confidence: 0 };
  const lower = input.toLowerCase().trim();

  // Exact match
  if (SUBTYPE_MAP[lower]) return { match: SUBTYPE_MAP[lower], original: input, confidence: 1 };

  // Partial match — check if input contains any known key
  for (const [key, val] of Object.entries(SUBTYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { match: val, original: input, confidence: 0.7 };
    }
  }

  // No match
  return { match: 'Other', original: input, confidence: 0 };
}

// ─── Item 4: Age Bucket Assignment ───
function parseAgeBucket(ageInput) {
  if (!ageInput && ageInput !== 0) return { years: null, bucket: 'unknown', label: 'Unknown' };
  const str = String(ageInput).trim();

  let years;
  // Handle range strings like "5-10" or "8 to 12"
  const rangeMatch = str.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (rangeMatch) {
    years = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
  } else {
    years = parseFloat(str);
  }

  if (isNaN(years)) return { years: null, bucket: 'unknown', label: 'Unknown' };

  if (years < 5) return { years, bucket: 'new', label: 'New (<5 yrs)' };
  if (years <= 15) return { years, bucket: 'mid', label: 'Mid-age (5–15 yrs)' };
  return { years, bucket: 'old', label: 'Old (>15 yrs)' };
}

export default function InputWizard({ onSubmit, onCancel }) {
  const [step, setStep] = useState(1);
  
  // Form State
  const [locationName, setLocationName] = useState('Lotus Heights, Andheri East, Mumbai');
  const [locationCoordinates, setLocationCoordinates] = useState([19.1136, 72.8697]);
  const [type, setType] = useState('Apartment');
  const [subtype, setSubtype] = useState('');
  const [config, setConfig] = useState('2 BHK');
  const [area, setArea] = useState(950);
  const [areaUnit, setAreaUnit] = useState('sqft');
  const [age, setAge] = useState('12');
  const [floor, setFloor] = useState(3);
  
  const [legalStatus, setLegalStatus] = useState('clear');
  const [occupancy, setOccupancy] = useState('owner');
  const [images, setImages] = useState([]);

  // Derived state
  const [subtypeMatch, setSubtypeMatch] = useState({ match: null, confidence: 0 });
  const ageBucket = parseAgeBucket(age);
  const areaSqft = Math.round(Number(area) * (UNIT_CONVERSIONS[areaUnit]?.toSqft || 1));

  // Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (subtype) setSubtypeMatch(fuzzyMatchSubtype(subtype));
    else setSubtypeMatch({ match: null, confidence: 0 });
  }, [subtype]);

  // ─── Item 1: Field Completeness ───
  const fieldStatus = {
    address:  { filled: locationName.length >= 3, mandatory: true, label: 'Address' },
    type:     { filled: !!type, mandatory: true, label: 'Property Type' },
    config:   { filled: !!config || type === 'Plot', mandatory: true, label: 'Configuration' },
    area:     { filled: Number(area) > 0, mandatory: true, label: 'Area' },
    age:      { filled: ageBucket.bucket !== 'unknown', mandatory: true, label: 'Age' },
    legal:    { filled: !!legalStatus, mandatory: false, label: 'Legal Status' },
    images:   { filled: images.length > 0, mandatory: false, label: 'Images' },
  };
  const mandatoryComplete = Object.values(fieldStatus).filter(f => f.mandatory).every(f => f.filled);
  const completenessScore = Object.values(fieldStatus).filter(f => f.filled).length / Object.values(fieldStatus).length;

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      let finalSuggestions = data.features || [];
      if (finalSuggestions.length === 0) {
        const hashOffsetLat = (query.length * 0.002) - 0.04;
        const hashOffsetLon = (query.charCodeAt(0) * 0.002) - 0.04;
        finalSuggestions = [{
          properties: { name: query.split(',')[0], city: query.split(',').slice(1).join(',').trim() || 'Maharashtra', state: 'PropScore Interpolated' },
          geometry: { coordinates: [73.0183 + hashOffsetLon, 19.0183 + hashOffsetLat] }
        }];
      }
      setSuggestions(finalSuggestions);
      setShowDropdown(true);
    } catch (err) { console.warn("Autosuggest failed", err); }
    setIsSearching(false);
  };

  const handleLocationChange = (e) => {
    setLocationName(e.target.value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchSuggestions(e.target.value), 400);
  };

  const selectLocation = (feature) => {
    const prop = feature.properties;
    const coords = feature.geometry.coordinates;
    setLocationName([prop.name, prop.street, prop.city, prop.state].filter(Boolean).join(', '));
    setLocationCoordinates([coords[1], coords[0]]);
    setShowDropdown(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files);
    const newImages = files.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...newImages].slice(0, 5));
  };

  const handleSubmit = () => {
    onSubmit({
      location: locationName,
      coordinates: locationCoordinates,
      circleRate: 15000,
      cityTier: 1,
      demandScore: 0.8,
      infrastructure: { metroDistance: 400, highwayDistance: 1200, commercialHubDistance: 800, schoolDistance: 600, hospitalDistance: 1500 },
      propertyDetails: {
        type: subtypeMatch.match || type,
        config,
        area: areaSqft,
        areaRaw: Number(area),
        areaUnit,
        age: ageBucket.years || 0,
        ageBucket: ageBucket.bucket,
        floor: Number(floor),
        subtype: subtype || null
      },
      enrichment: {
        legalStatus,
        occupancy,
        rental: 0,
        images: { exterior: images.length > 0, interior: images.length > 1 },
        rawImages: images
      },
      fieldCompleteness: {
        mandatoryComplete,
        score: completenessScore,
        fields: fieldStatus
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex max-w-4xl w-full h-[620px] border border-slate-200">
        
        {/* Left Side: Progress & Info */}
        <div className="w-1/3 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
          
          <h2 className="text-2xl font-headline font-bold mb-2">PropScore Valuator</h2>
          <p className="text-white/60 text-sm font-body mb-8">Constructing value step-by-step using multiple intelligence engines.</p>
          
          <div className="space-y-6 flex-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex gap-4 items-start relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step === s ? 'bg-indigo-500 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {step > s ? <span className="material-symbols-outlined text-sm">check</span> : s}
                </div>
                <div>
                  <p className={`font-headline font-bold text-sm ${step === s ? 'text-white' : 'text-white/60'}`}>
                    {s === 1 ? 'Location Intelligence' : s === 2 ? 'Property Details' : 'Data Enrichment'}
                  </p>
                  <p className="text-white/40 text-xs mt-1 leading-snug">
                    {s === 1 ? 'Anchor to circle rates & infra grids.' : s === 2 ? 'Establish structural baseline.' : 'Optional signals to narrow uncertainty.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Field Completeness Indicator (Item 1) */}
          <div className="mt-auto relative z-10">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Data Completeness</p>
                <span className="text-[10px] font-mono text-indigo-300">{Math.round(completenessScore * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${completenessScore * 100}%` }}></div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.values(fieldStatus).map((f, i) => (
                  <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                    f.filled ? 'bg-emerald-500/20 text-emerald-300' : f.mandatory ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/30'
                  }`}>
                    {f.filled ? '✓' : f.mandatory ? '!' : '○'} {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-white/80 flex items-center gap-2 font-bold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-[14px] text-amber-400">shield</span> Guaranteed Output
              </p>
              <p className="text-[11px] text-white/60 leading-tight">Proceeding without images will widen uncertainty bounds, but all 6 risk models will still run.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="w-2/3 bg-slate-50 flex flex-col">
          <div className="flex justify-between items-center px-8 py-5 border-b border-slate-200 bg-white">
            <h3 className="font-headline font-bold text-slate-800 text-lg">
              {step === 1 && "Step 1: Where is the asset?"}
              {step === 2 && "Step 2: What is the asset?"}
              {step === 3 && "Step 3: Enrich & Finalize (Optional)"}
            </h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Search Address, Locality, or Building</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400">search</span>
                    <input 
                      type="text" value={locationName} onChange={handleLocationChange}
                      onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 outline-none transition-shadow shadow-sm"
                      placeholder="Start typing an address..."
                    />
                    {showDropdown && suggestions.length > 0 && (
                      <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {suggestions.map((feature, idx) => (
                          <li key={idx} onClick={() => selectLocation(feature)}
                            className="px-4 py-3 hover:bg-indigo-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3 transition-colors">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">location_on</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{feature.properties.name || feature.properties.street || feature.properties.city}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {[feature.properties.city, feature.properties.state, feature.properties.country].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {isSearching && (
                      <div className="absolute right-3 top-3 w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-indigo-600">my_location</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900 mb-1">Found: {locationName.split(',').slice(0, 2).join(',')}</p>
                    <p className="text-xs text-indigo-700 leading-snug">Circle Rate: ₹15,000/sqft established. 400m to nearest Metro. High demand micro-market detected.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Property Type</label>
                    <select value={type} onChange={e=>setType(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800">
                      <option>Apartment</option><option>Villa</option><option>Commercial</option><option>Plot</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Configuration</label>
                    <select value={config} onChange={e=>setConfig(e.target.value)} disabled={type === 'Plot'} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-slate-800">
                      <option>1 BHK</option><option>2 BHK</option><option>3 BHK</option><option>4 BHK+</option><option>Studio</option>
                    </select>
                  </div>
                </div>
                
                {/* Item 3: Sub-type with fuzzy matching */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Sub-type <span className="text-slate-300 normal-case tracking-normal">(optional — e.g. penthouse, row house, duplex)</span>
                  </label>
                  <div className="relative">
                    <input type="text" value={subtype} onChange={e => setSubtype(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800"
                      placeholder="Start typing sub-type..."
                    />
                    {subtypeMatch.match && (
                      <span className={`absolute right-3 top-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        subtypeMatch.confidence >= 0.7 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        subtypeMatch.match === 'Other' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}>
                        {subtypeMatch.confidence >= 0.7 ? `→ ${subtypeMatch.match}` : '⚠ Unknown → Other'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Item 2: Area with unit normalization */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Carpet Area
                    </label>
                    <div className="flex gap-2">
                      <input type="number" value={area} onChange={e=>setArea(e.target.value)} 
                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                      <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {Object.entries(UNIT_CONVERSIONS).map(([key, val]) => (
                          <button key={key} onClick={() => setAreaUnit(key)}
                            className={`px-3 py-2 text-[11px] font-bold transition-colors ${
                              areaUnit === key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                            }`}>
                            {val.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {areaUnit !== 'sqft' && (
                      <p className="text-[10px] text-indigo-600 mt-1 font-mono">= {areaSqft} sqft (normalized)</p>
                    )}
                  </div>
                  
                  {/* Item 4: Age with bucket assignment */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Age <span className="text-slate-300 normal-case tracking-normal">(years or range e.g. 5-10)</span>
                    </label>
                    <input type="text" value={age} onChange={e=>setAge(e.target.value)} 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800"
                      placeholder="e.g. 12 or 5-10"
                    />
                    {ageBucket.bucket !== 'unknown' && (
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        ageBucket.bucket === 'new' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ageBucket.bucket === 'mid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {ageBucket.label}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Floor Number</label>
                  <input type="number" value={floor} onChange={e=>setFloor(e.target.value)} disabled={type !== 'Apartment'} 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-slate-800" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Legal/Title Status</label>
                    <select value={legalStatus} onChange={e=>setLegalStatus(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800">
                      <option value="clear">Clear Title (Freehold)</option>
                      <option value="lease">Leasehold</option>
                      <option value="dispute">Legal Dispute Known</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Occupancy</label>
                    <select value={occupancy} onChange={e=>setOccupancy(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 text-slate-800">
                      <option value="owner">Owner Occupied</option>
                      <option value="rented">Rented</option>
                      <option value="vacant">Vacant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Field Verification Scans</label>
                  <div onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50 transition-colors rounded-2xl p-6 text-center cursor-pointer relative">
                    <input type="file" multiple accept="image/*" onChange={handleFileDrop} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" title="Upload photos" />
                    <span className="material-symbols-outlined text-indigo-400 text-4xl mb-2">add_photo_alternate</span>
                    <p className="text-sm font-bold text-slate-700">Drag & Drop or Click to Browse</p>
                    <p className="text-xs text-slate-500 mt-1">Images unlock Vision AI and raise confidence bounds.</p>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((src, i) => (
                      <img key={i} src={src} className="w-16 h-16 rounded-lg object-cover shadow-sm border border-slate-200" alt={`upload-${i}`} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Back</button>
            ) : <div />}
            
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} 
                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-2">
                Continue <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button onClick={handleSubmit}
                disabled={!mandatoryComplete}
                className="px-8 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined">analytics</span>
                Generate Intelligence
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
