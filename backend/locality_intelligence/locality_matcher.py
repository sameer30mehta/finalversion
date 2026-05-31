"""Hybrid locality matcher: exact / alias / zone / project-keyword.

No embeddings. Pure deterministic keyword + alias matching, scored 0..1.
Returns matchReason + matchedTerms so the validator + audit trail can show
exactly why a document was considered locality-relevant.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

# Adjacency map — landmarks / micro-areas / stations frequently mentioned in
# official-source text that are unambiguous proxies for a locality.
LOCALITY_ALIAS_HINTS: Dict[str, Tuple[str, ...]] = {
    "andheri east": ("andheri", "midc andheri", "jb nagar", "marol", "saki naka", "chakala", "sahar"),
    "andheri west": ("andheri", "lokhandwala", "versova", "dn nagar", "yari road"),
    "bandra west": ("bandra", "bandstand", "linking road", "carter road", "pali hill"),
    "bandra east": ("bandra", "bkc", "kalanagar", "bandra kurla complex"),
    "powai": ("powai", "hiranandani", "iit bombay", "chandivali"),
    "goregaon east": ("goregaon", "nesco", "aarey"),
    "goregaon west": ("goregaon",),
    "malad west": ("malad", "infinity mall", "evershine nagar"),
    "borivali west": ("borivali", "ic colony", "carter road borivali"),
    "chembur": ("chembur", "rcf colony"),
    "ghatkopar east": ("ghatkopar", "pant nagar"),
    "mulund west": ("mulund",),
    "dadar west": ("dadar", "shivaji park", "prabhadevi"),
    "lower parel": ("lower parel", "elphinstone road", "phoenix mills", "kamala mills"),
    "worli": ("worli", "sea face"),
    "vikhroli": ("vikhroli", "godrej hillside"),
    "kurla": ("kurla", "lbs marg"),
    "santacruz west": ("santacruz",),
    "kandivali east": ("kandivali", "thakur village"),
    "vashi": ("vashi", "vashi sector"),
}

# Project / station tokens that strongly localize an event when the locality
# name itself doesn't appear in the text but a known associated project does.
PROJECT_TOKEN_HINTS: Dict[str, Tuple[str, ...]] = {
    "andheri east": ("metro line 7", "metro 7", "metro line 2a", "western express highway", "wehg", "santacruz-chembur link road"),
    "bandra east": ("bkc", "bandra kurla complex", "bandra worli sea link"),
    "lower parel": ("phoenix", "kamala mills", "lower parel skywalk"),
    "powai": ("eastern express highway", "jvlr"),
    "worli": ("coastal road", "bandra worli sea link"),
    "vashi": ("trans-harbour link", "mtthl"),
}

ZONE_ALIASES: Dict[str, Tuple[str, ...]] = {
    "western suburbs": ("western suburbs", "western express highway", "wehg"),
    "central suburbs": ("central suburbs", "eastern express highway", "lbs marg"),
    "island city": ("island city", "south mumbai"),
    "harbour": ("harbour", "harbour line"),
    "navi mumbai": ("navi mumbai", "nmmc"),
}


@dataclass
class LocalityMatchResult:
    relevance: float
    matchReason: str
    matchedTerms: List[str]
    matchType: str  # 'exact_locality' | 'alias' | 'project' | 'zone' | 'city' | 'none'


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def _terms_present(haystack: str, terms: Iterable[str]) -> List[str]:
    hits: List[str] = []
    for t in terms:
        tt = (t or "").lower().strip()
        if not tt:
            continue
        if tt in haystack:
            hits.append(tt)
    return hits


def build_alias_pool(locality: str, aliases: Optional[Iterable[str]] = None) -> List[str]:
    loc = _norm(locality)
    pool: List[str] = []
    if loc:
        pool.append(loc)
    if aliases:
        for a in aliases:
            an = _norm(a)
            if an and an not in pool:
                pool.append(an)
    pool.extend(t for t in LOCALITY_ALIAS_HINTS.get(loc, ()) if t not in pool)
    return pool


def match_document_to_locality(
    document_text: str,
    *,
    locality: str,
    aliases: Optional[Iterable[str]] = None,
    zone: Optional[str] = None,
    city: Optional[str] = None,
) -> LocalityMatchResult:
    """Score 0..1 for how strongly this document references the target locality."""
    haystack = _norm(document_text)
    if not haystack:
        return LocalityMatchResult(0.0, "empty_text", [], "none")

    loc_norm = _norm(locality)
    zone_norm = _norm(zone or "")
    city_norm = _norm(city or "")

    matched: List[str] = []

    # 1) Exact locality match → relevance 0.95–1.0
    if loc_norm and loc_norm in haystack:
        matched.append(loc_norm)
        return LocalityMatchResult(0.95, "exact_locality_match", matched, "exact_locality")

    # 2) Alias matches → relevance 0.70–0.85
    alias_pool = build_alias_pool(locality, aliases)
    alias_hits = _terms_present(haystack, alias_pool)
    if alias_hits:
        matched.extend(alias_hits)
        # Pick relevance based on how strong the alias is. The first item in
        # the pool is the locality itself (already handled above), so any hit
        # here is an adjacency alias.
        return LocalityMatchResult(0.78, "alias_match", matched, "alias")

    # 3) Project / landmark token match → 0.65
    project_hits = _terms_present(haystack, PROJECT_TOKEN_HINTS.get(loc_norm, ()))
    if project_hits:
        matched.extend(project_hits)
        return LocalityMatchResult(0.65, "project_landmark_match", matched, "project")

    # 4) Zone match → 0.40 (low, not enough by itself for confidence>=0.6 rule)
    if zone_norm:
        z_hits = _terms_present(haystack, ZONE_ALIASES.get(zone_norm, (zone_norm,)))
        if z_hits:
            matched.extend(z_hits)
            return LocalityMatchResult(0.40, "zone_match_only", matched, "zone")

    # 5) City-only mention → 0.20
    if city_norm and city_norm in haystack:
        matched.append(city_norm)
        return LocalityMatchResult(0.20, "city_only_mention", matched, "city")

    return LocalityMatchResult(0.0, "no_locality_signal", [], "none")
