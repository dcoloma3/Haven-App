// ============================================================
// CCLD Compliance Document Types
// California Title 22 / CDSS-CCLD RCFE requirements
// Central source of truth — nothing is hardcoded in components
// ============================================================

export const DOC_CATEGORIES = {
  ADMISSION:   { id: 'ADMISSION',   label: 'Required at or Before Admission' },
  THIRTY_DAY:  { id: 'THIRTY_DAY', label: 'Required within 30 Days of Admission' },
  CONDITIONAL: { id: 'CONDITIONAL', label: 'Conditional / Situational' },
  ONGOING:     { id: 'ONGOING',     label: 'Ongoing Documentation' },
}

// conditionFlag: residents column that must be true for this doc to be required
// alwaysShow: show in conditional section even without a specific flag
// expires: whether the doc has an expiration date
// expiryDays: how many days until expiration from date_completed (if expires)
export const DOC_TYPES = {
  LIC_604A:           { label: 'LIC 604A — Admission Agreement',              category: 'ADMISSION',   expires: false, conditionFlag: null },
  LIC_602A:           { label: 'LIC 602A — Physician\'s Report',               category: 'ADMISSION',   expires: true,  expiryDays: 365  },
  LIC_601:            { label: 'LIC 601 — ID & Emergency Information',         category: 'ADMISSION',   expires: false, conditionFlag: null },
  LIC_613C:           { label: 'LIC 613C — Personal Rights',                   category: 'ADMISSION',   expires: false, conditionFlag: null },
  LIC_9158:           { label: 'LIC 9158 — Telecommunications Notice',         category: 'ADMISSION',   expires: false, conditionFlag: null },
  LIC_9059:           { label: 'LIC 9059 — Theft & Loss Notice',              category: 'ADMISSION',   expires: false, conditionFlag: null },
  LIC_603:            { label: 'LIC 603 — Pre-placement Appraisal',           category: 'THIRTY_DAY',  expires: false, conditionFlag: null },
  LIC_625:            { label: 'LIC 625 — Needs & Services Plan',             category: 'THIRTY_DAY',  expires: true,  expiryDays: 365, conditionFlag: null },
  TB_CLEARANCE:       { label: 'TB Clearance (PPD/IGRA/Chest X-ray)',         category: 'THIRTY_DAY',  expires: true,  expiryDays: 365, conditionFlag: null },
  LIC_603A:           { label: 'LIC 603A — Restricted Health Condition',      category: 'CONDITIONAL', expires: false, conditionFlag: null, alwaysShow: true },
  LIC_9582:           { label: 'LIC 9582 — Hospice Waiver/Addendum',          category: 'CONDITIONAL', expires: false, conditionFlag: 'is_hospice' },
  DEMENTIA_CARE_PLAN: { label: 'Dementia Care Plan',                           category: 'CONDITIONAL', expires: false, conditionFlag: 'has_dementia' },
  AHCD_POLST:         { label: 'Advance Health Care Directive / POLST',        category: 'CONDITIONAL', expires: false, conditionFlag: null, alwaysShow: true },
  POA:                { label: 'Power of Attorney Documents',                  category: 'CONDITIONAL', expires: false, conditionFlag: 'has_poa' },
  CONSERVATORSHIP:    { label: 'Conservatorship Paperwork',                   category: 'CONDITIONAL', expires: false, conditionFlag: 'has_conservatorship' },
  MAR:                { label: 'Medication Administration Records (MARs)',     category: 'ONGOING',     expires: false, conditionFlag: null },
  WEIGHT_RECORDS:     { label: 'Monthly Weight Records',                       category: 'ONGOING',     expires: false, conditionFlag: null },
  LIC_624:            { label: 'LIC 624 — Incident Reports',                  category: 'ONGOING',     expires: false, conditionFlag: null },
  OBSERVATION_NOTES:  { label: 'Daily/Weekly Observation Notes',               category: 'ONGOING',     expires: false, conditionFlag: null },
  ANNUAL_REASSESSMENT:{ label: 'Annual Reassessment — Needs & Services Plan', category: 'ONGOING',     expires: true,  expiryDays: 365, conditionFlag: null },
}

// Returns 'on_file' | 'missing' | 'expired' | 'expiring_soon' | 'not_applicable'
export function computeDocStatus(item) {
  if (!item || !item.is_applicable) return 'not_applicable'
  if (!item.date_completed) return 'missing'
  if (item.expiration_date) {
    const today = new Date()
    const exp = new Date(item.expiration_date)
    if (exp < today) return 'expired'
    const daysUntil = Math.ceil((exp - today) / 86400000)
    if (daysUntil <= 30) return 'expiring_soon'
  }
  return 'on_file'
}

// Returns array of doc_type keys required for a given resident
// resident must include: is_hospice, has_dementia, has_poa, has_conservatorship
export function getRequiredDocs(resident) {
  return Object.entries(DOC_TYPES)
    .filter(([, def]) => {
      if (def.alwaysShow) return true
      if (!def.conditionFlag) return true
      return resident[def.conditionFlag] === true
    })
    .map(([key]) => key)
}

// Status display config
export const STATUS_CONFIG = {
  on_file:        { label: 'On File',        color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  expiring_soon:  { label: 'Expiring Soon',  color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  expired:        { label: 'Expired',        color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  missing:        { label: 'Missing',        color: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-400' },
  not_applicable: { label: 'N/A',            color: 'bg-slate-50 text-slate-400',      dot: 'bg-slate-300' },
}
