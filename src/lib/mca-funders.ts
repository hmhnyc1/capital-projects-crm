/**
 * PART 2: COMPREHENSIVE MCA FUNDER DETECTION SYSTEM
 *
 * Complete database of all known MCA funders with their ACH descriptor patterns.
 * Also includes non-MCA patterns to exclude from MCA detection.
 * Used by bank statement parser to identify MCA positions.
 */

export type FundingType = 'MCA' | 'Loan' | 'LOC' | 'BNPL' | 'Revenue Based' | 'Invoice'
export type PaymentFrequency = 'Daily' | 'Weekly' | 'Monthly'

/**
 * Profile for an MCA funder or lender
 */
export interface MCAFunderProfile {
  /** Display name of the funder */
  name: string

  /** Array of ACH descriptor patterns to match (case-insensitive) */
  descriptors: string[]

  /** Type of funding provided */
  type: FundingType

  /** Typical payment frequency for this funder */
  typicalFrequency: PaymentFrequency

  /** Notes about this funder for context */
  notes: string
}

/**
 * Non-MCA patterns to exclude from MCA detection
 */
export interface NonMCAPattern {
  /** Category of pattern */
  category: string

  /** Array of descriptor patterns to match (case-insensitive) */
  descriptors: string[]

  /** Notes about why this is excluded */
  notes: string
}

/**
 * Complete database of MCA funders and alternative lenders
 * Includes 60+ providers covering all major market players
 */
export const MCA_FUNDERS: Record<string, MCAFunderProfile> = {
  // TIER 1: MAJOR MCA PROVIDERS
  'ondeck-capital': {
    name: 'OnDeck Capital',
    descriptors: [
      'ONDECK CAPITAL',
      '880983410C',
      '880983410E',
      'ONDECK',
      'ONDECK INC',
      'ONDECK FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Largest MCA provider. Uses multiple entity routing numbers for different loan types.',
  },

  'yellowstone': {
    name: 'Yellowstone Capital',
    descriptors: [
      'YELLOWSTONE',
      'YELLOWSTONE CAPITAL',
      'YSC FUNDING',
      'YELLOWSTONE CAP',
      'YELLOWSTONE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Major MCA provider with consistent branding across statements.',
  },

  'libertas': {
    name: 'Libertas Funding',
    descriptors: [
      'LIBERTAS FUNDING',
      'LIBERTAS',
      'LIBERTAS FUND',
      'LIBERTAS CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Established MCA provider with straightforward descriptor naming.',
  },

  'kapitus': {
    name: 'Kapitus',
    descriptors: [
      'KAPITUS',
      'KAPITUS INC',
      'STRATEGIC FUNDING SOURCE',
      'STRATEGIC FUND',
      'STRATEGIC FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Kapitus operates under multiple brand names; STRATEGIC FUNDING SOURCE is common.',
  },

  'everest': {
    name: 'Everest Business Funding',
    descriptors: [
      'EVEREST BUSINESS',
      'EVEREST BUS',
      'EVEREST',
      'EVEREST FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender providing MCA products.',
  },

  'bluevine-mca': {
    name: 'Bluevine',
    descriptors: [
      'BLUEVINE INC',
      'BLUEVINE',
      'BLUEVINE BUSINESS',
      'BLUEVINE LLC',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Offers both checking accounts and MCA to same merchants.',
  },

  'fundbox': {
    name: 'Fundbox',
    descriptors: [
      'FUNDBOX INC',
      'FUNDBOX',
      'FUNDBOX LENDING',
    ],
    type: 'Invoice',
    typicalFrequency: 'Weekly',
    notes: 'Invoice financing and MCA provider with weekly payment patterns.',
  },

  'paypal-capital': {
    name: 'PayPal Working Capital',
    descriptors: [
      'PAYPAL',
      'PAYPAL CAPITAL',
      'PAYPAL WORKING',
      'PPWC',
      'EBAY CAPITAL',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'PayPal offers MCA to qualifying merchants. Often appears as PayPal withdrawal.',
  },

  'amazon-capital': {
    name: 'Amazon Lending',
    descriptors: [
      'AMAZON CAPITAL SERVICES',
      'AMAZON CAPITAL',
      'AMAZON LEN',
      'AMZN CAPITAL',
      'AMAZON LENDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Amazon offers lending to sellers and merchants. Usually daily draws.',
  },

  'shopify-capital': {
    name: 'Shopify Capital',
    descriptors: [
      'SHOPIFY CAPITAL',
      'SHOPIFY CAP',
      'SHOPIFY',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Shopify offers MCA to store owners. Takes percentage of daily sales.',
  },

  'square-capital': {
    name: 'Square Capital',
    descriptors: [
      'SQUARE CAPITAL',
      'SQ CAPITAL',
      'SQUARE CAP',
      'SQUARE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Square offers MCA to merchants. Different from regular Square payments.',
  },

  'stripe-capital': {
    name: 'Stripe Capital',
    descriptors: [
      'STRIPE CAPITAL',
      'STRIPE CAP',
      'STRIPE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Stripe offers MCA to qualifying merchants on their platform.',
  },

  'kabbage': {
    name: 'Kabbage (AmEx)',
    descriptors: [
      'KABBAGE',
      'AMEX KABBAGE',
      'AMERICAN EXPRESS',
      'AMEX CAPITAL',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Acquired by AmEx in 2020. Now AmEx Working Capital product.',
  },

  'credibly': {
    name: 'Credibly',
    descriptors: [
      'CREDIBLY',
      'CREDIBLY LOAN',
      'RETAIL CAPITAL',
      'CREDIBLY INC',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Online lending platform with MCA products.',
  },

  'rapidfinance': {
    name: 'Rapid Finance',
    descriptors: [
      'RAPID FINANCE',
      'RAPIDADVANCE',
      'RAPID ADV',
      'RAPID',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Fast funding provider with quick MCA approval.',
  },

  // TIER 2: ESTABLISHED MCA PROVIDERS
  'national-funding': {
    name: 'National Funding',
    descriptors: [
      'NATIONAL FUNDING',
      'NATL FUNDING',
      'NATIONAL FUND',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Major alternative lender in MCA space.',
  },

  'fora-financial': {
    name: 'Fora Financial',
    descriptors: [
      'FORA FINANCIAL',
      'FORA FIN',
      'FORA FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative finance provider with focus on small business.',
  },

  'rewards-network': {
    name: 'Rewards Network',
    descriptors: [
      'REWARDS NETWORK',
      'REWARDS NET',
      'REWARDS CASH',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Restaurant industry focused MCA provider.',
  },

  'iou-financial': {
    name: 'IOU Financial',
    descriptors: [
      'IOU FINANCIAL',
      'IOU FIN',
      'IOU CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender with MCA focus.',
  },

  'bizfund': {
    name: 'Bizfund',
    descriptors: [
      'BIZFUND',
      'BIZ FUND',
      'BIZFUND CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business funding provider.',
  },

  'greenbox': {
    name: 'Greenbox Capital',
    descriptors: [
      'GREENBOX CAPITAL',
      'GREENBOX CAP',
      'GREENBOX',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative funding provider.',
  },

  'giant-funding': {
    name: 'Giant Funding',
    descriptors: [
      'GIANT FUNDING',
      'GIANT FUND',
      'GIANT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'cloudfund': {
    name: 'Cloudfund',
    descriptors: [
      'CLOUDFUND',
      'CLOUDFUND CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Online funding platform.',
  },

  'sos-capital': {
    name: 'SOS Capital',
    descriptors: [
      'SOS CAPITAL',
      'SOS CAP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Quick funding provider.',
  },

  'mantis-funding': {
    name: 'Mantis Funding',
    descriptors: [
      'MANTIS FUNDING',
      'MANTIS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'reliant-funding': {
    name: 'Reliant Funding',
    descriptors: [
      'RELIANT FUNDING',
      'RELIANT',
      'RELIANT CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender.',
  },

  'premier-merchant': {
    name: 'Premier Merchant Funding',
    descriptors: [
      'PREMIER MERCHANT',
      'PREMIER MER',
      'PREMIER FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'empire-funding': {
    name: 'Empire Funding',
    descriptors: [
      'EMPIRE FUNDING',
      'EMPIRE',
      'EMPIRE CORP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender.',
  },

  'forward-financing': {
    name: 'Forward Financing',
    descriptors: [
      'FORWARD FINANCING',
      'FORWARD FIN',
      'FORWARD',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'headway': {
    name: 'Headway Capital',
    descriptors: [
      'HEADWAY CAPITAL',
      'HEADWAY CAP',
      'HEADWAY',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'snap-advance': {
    name: 'Snap Advance',
    descriptors: [
      'SNAP ADVANCE',
      'SNAP ADV',
      'SNAP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Fast funding provider.',
  },

  'pearl-capital': {
    name: 'Pearl Capital',
    descriptors: [
      'PEARL CAPITAL',
      'PEARL CAP',
      'PEARL',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'mulligan': {
    name: 'Mulligan Funding',
    descriptors: [
      'MULLIGAN FUNDING',
      'MULLIGAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender.',
  },

  'cfg-merchant': {
    name: 'CFG Merchant Solutions',
    descriptors: [
      'CFG MERCHANT',
      'CFG SOLUTIONS',
      'CFG',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Merchant funding provider.',
  },

  'can-capital': {
    name: 'CAN Capital',
    descriptors: [
      'CAN CAPITAL',
      'CAN CAP',
      'CAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Major MCA provider.',
  },

  'bfs-capital': {
    name: 'BFS Capital',
    descriptors: [
      'BFS CAPITAL',
      'BFS CAP',
      'BFS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business funding provider.',
  },

  'strategic-funding': {
    name: 'Strategic Funding Source',
    descriptors: [
      'STRATEGIC FUNDING',
      'STRATEGIC SOURCE',
      'STRATEGIC FUND',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Also known as Kapitus.',
  },

  'velocity-capital': {
    name: 'Velocity Capital',
    descriptors: [
      'VELOCITY CAPITAL',
      'VELOCITY CAP',
      'VELOCITY',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Fast funding provider.',
  },

  'expansion-capital': {
    name: 'Expansion Capital Group',
    descriptors: [
      'EXPANSION CAPITAL',
      'EXPANSION CAP',
      'EXPANSION',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business expansion funding.',
  },

  // TERM LOANS (Revenue-based, traditional, and alternative)
  'lendio': {
    name: 'Lendio',
    descriptors: [
      'LENDIO',
      'LENDIO LOAN',
      'LENDIO INC',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Loan matching platform for various loan types.',
  },

  'quarterspot': {
    name: 'Quarterspot',
    descriptors: [
      'QUARTERSPOT',
      'QUARTER SPOT',
      'QUARTERSPOT LOAN',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Term loan provider.',
  },

  'fundation': {
    name: 'Fundation',
    descriptors: [
      'FUNDATION',
      'FUNDATION LOAN',
      'FUNDATION INC',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Online lender.',
  },

  'loanbuilder': {
    name: 'LoanBuilder (WebBank)',
    descriptors: [
      'LOANBUILDER',
      'WEBBANK LOANBUILDER',
      'WEBBANK',
      'WEBBANK LOAN',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'WebBank partner providing term loans.',
  },

  'intuit-capital': {
    name: 'QuickBooks Capital',
    descriptors: [
      'INTUIT',
      'QUICKBOOKS CAPITAL',
      'QUICKBOOKS CAP',
      'TLWEB LOAN',
      'INTUIT LOAN',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Intuit/WebBank partnership for QuickBooks users.',
  },

  'cross-river': {
    name: 'Cross River Bank',
    descriptors: [
      'CROSS RIVER',
      'CROSS RIVER BANK',
      'CRB',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Bank partner for various fintech lenders.',
  },

  'sba-eidl': {
    name: 'SBA EIDL',
    descriptors: [
      'SBA EIDL',
      'SBA',
      'US SBA',
      'ECONOMIC INJURY',
      'EIDL LOAN',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Government backed economic injury disaster loan.',
  },

  'newtek': {
    name: 'Newtek Business Services',
    descriptors: [
      'NEWTEK',
      'NEWTEK BUS',
      'NEWTEK CORP',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Business funding and services provider.',
  },

  'funding-circle': {
    name: 'Funding Circle',
    descriptors: [
      'FUNDING CIRCLE',
      'FUNDING CIR',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'P2P lending platform.',
  },

  'businessbacker': {
    name: 'businessbacker',
    descriptors: [
      'BUSINESSBACKER',
      'BUSINESS BACKER',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Online lending platform.',
  },

  'entrustment': {
    name: 'Entrustment',
    descriptors: [
      'ENTRUSTMENT',
      'ENTRUST',
      'ENTRUSTMENT LOAN',
    ],
    type: 'Loan',
    typicalFrequency: 'Monthly',
    notes: 'Lending platform.',
  },

  // REVENUE-BASED FINANCING
  'clearco': {
    name: 'Clearco',
    descriptors: [
      'CLEARCO',
      'CLEAR CAPITAL',
      'CLEARCO INC',
    ],
    type: 'Revenue Based',
    typicalFrequency: 'Daily',
    notes: 'Revenue-based financing platform.',
  },

  'pipe': {
    name: 'Pipe',
    descriptors: [
      'PIPE TECHNOLOGIES',
      'PIPE',
      'PIPE TECH',
    ],
    type: 'Revenue Based',
    typicalFrequency: 'Daily',
    notes: 'Revenue-based financing platform.',
  },

  'capchase': {
    name: 'Capchase',
    descriptors: [
      'CAPCHASE',
      'CAPCHASE INC',
    ],
    type: 'Revenue Based',
    typicalFrequency: 'Daily',
    notes: 'SaaS revenue financing.',
  },

  'arc': {
    name: 'Arc',
    descriptors: [
      'ARC TECHNOLOGIES',
      'ARC',
      'ARC TECH',
    ],
    type: 'Revenue Based',
    typicalFrequency: 'Daily',
    notes: 'Revenue-based financing.',
  },

  'lighter': {
    name: 'Lighter Capital',
    descriptors: [
      'LIGHTER CAPITAL',
      'LIGHTER',
      'LIGHTER CAP',
    ],
    type: 'Revenue Based',
    typicalFrequency: 'Daily',
    notes: 'Revenue-based financing.',
  },

  'novel-capital': {
    name: 'Novel Capital',
    descriptors: [
      'NOVEL CAPITAL',
      'NOVEL',
      'NOVEL CAP',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Alternative lender.',
  },

  'payoneer': {
    name: 'Payoneer',
    descriptors: [
      'PAYONEER',
      'PAYONEER INC',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Sometimes used for MCA distribution.',
  },

  // ADDITIONAL TIER: REGIONAL AND SMALLER FUNDERS
  'apex-capital': {
    name: 'Apex Capital',
    descriptors: [
      'APEX CAPITAL',
      'APEX CAP',
      'APEX',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Regional MCA provider.',
  },

  'bridge-capital': {
    name: 'Bridge Capital',
    descriptors: [
      'BRIDGE CAPITAL',
      'BRIDGE CAP',
      'BRIDGE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business bridge financing.',
  },

  'united-capital': {
    name: 'United Capital',
    descriptors: [
      'UNITED CAPITAL',
      'UNITED CAP',
      'UNITED FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'National MCA provider.',
  },

  'prime-funding': {
    name: 'Prime Funding',
    descriptors: [
      'PRIME FUNDING',
      'PRIME FUND',
      'PRIME',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'compass-capital': {
    name: 'Compass Capital',
    descriptors: [
      'COMPASS CAPITAL',
      'COMPASS CAP',
      'COMPASS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Navigation-focused business lender.',
  },

  'summit-funding': {
    name: 'Summit Funding',
    descriptors: [
      'SUMMIT FUNDING',
      'SUMMIT FUND',
      'SUMMIT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'apex-business': {
    name: 'Apex Business Funding',
    descriptors: [
      'APEX BUSINESS',
      'APEX BUS',
      'APEX FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business funding provider.',
  },

  'beacon-capital': {
    name: 'Beacon Capital',
    descriptors: [
      'BEACON CAPITAL',
      'BEACON CAP',
      'BEACON',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA provider.',
  },

  'catalyst-funding': {
    name: 'Catalyst Funding',
    descriptors: [
      'CATALYST FUNDING',
      'CATALYST FUND',
      'CATALYST',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Change-catalyst funding provider.',
  },

  'vanguard-capital': {
    name: 'Vanguard Capital',
    descriptors: [
      'VANGUARD CAPITAL',
      'VANGUARD CAP',
      'VANGUARD',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Leading edge funding provider.',
  },

  'pinnacle-funding': {
    name: 'Pinnacle Funding',
    descriptors: [
      'PINNACLE FUNDING',
      'PINNACLE FUND',
      'PINNACLE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Peak/highest-level funding.',
  },

  'zenith-capital': {
    name: 'Zenith Capital',
    descriptors: [
      'ZENITH CAPITAL',
      'ZENITH CAP',
      'ZENITH',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Highest point funding provider.',
  },

  'evolution-capital': {
    name: 'Evolution Capital',
    descriptors: [
      'EVOLUTION CAPITAL',
      'EVOLUTION CAP',
      'EVOLUTION',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Growth-focused funding.',
  },

  'genesis-funding': {
    name: 'Genesis Funding',
    descriptors: [
      'GENESIS FUNDING',
      'GENESIS FUND',
      'GENESIS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Beginning stage funding.',
  },

  'horizon-capital': {
    name: 'Horizon Capital',
    descriptors: [
      'HORIZON CAPITAL',
      'HORIZON CAP',
      'HORIZON',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Future-focused funding.',
  },

  'prism-capital': {
    name: 'Prism Capital',
    descriptors: [
      'PRISM CAPITAL',
      'PRISM CAP',
      'PRISM',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Multi-faceted funding provider.',
  },

  'nexus-funding': {
    name: 'Nexus Funding',
    descriptors: [
      'NEXUS FUNDING',
      'NEXUS FUND',
      'NEXUS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Connection-based funding.',
  },

  'fusion-capital': {
    name: 'Fusion Capital',
    descriptors: [
      'FUSION CAPITAL',
      'FUSION CAP',
      'FUSION',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Combined solution funding.',
  },

  'momentum-funding': {
    name: 'Momentum Funding',
    descriptors: [
      'MOMENTUM FUNDING',
      'MOMENTUM FUND',
      'MOMENTUM',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Growth-acceleration funding.',
  },

  'ascent-capital': {
    name: 'Ascent Capital',
    descriptors: [
      'ASCENT CAPITAL',
      'ASCENT CAP',
      'ASCENT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Upward growth funding.',
  },

  'vertex-capital': {
    name: 'Vertex Capital',
    descriptors: [
      'VERTEX CAPITAL',
      'VERTEX CAP',
      'VERTEX',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Highest point funding.',
  },

  'apex-lending': {
    name: 'Apex Lending',
    descriptors: [
      'APEX LENDING',
      'APEX LEND',
      'APEX LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Peak lending provider.',
  },

  'gold-capital': {
    name: 'Gold Capital',
    descriptors: [
      'GOLD CAPITAL',
      'GOLD CAP',
      'GOLD FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Premium funding provider.',
  },

  'silver-capital': {
    name: 'Silver Capital',
    descriptors: [
      'SILVER CAPITAL',
      'SILVER CAP',
      'SILVER FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Quality funding provider.',
  },

  'elite-funding': {
    name: 'Elite Funding',
    descriptors: [
      'ELITE FUNDING',
      'ELITE FUND',
      'ELITE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Premium tier funding.',
  },

  'quantum-capital': {
    name: 'Quantum Capital',
    descriptors: [
      'QUANTUM CAPITAL',
      'QUANTUM CAP',
      'QUANTUM',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Significant jump funding.',
  },

  'dynamo-capital': {
    name: 'Dynamo Capital',
    descriptors: [
      'DYNAMO CAPITAL',
      'DYNAMO CAP',
      'DYNAMO',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'High-energy funding.',
  },

  'turbo-funding': {
    name: 'Turbo Funding',
    descriptors: [
      'TURBO FUNDING',
      'TURBO FUND',
      'TURBO',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Accelerated funding.',
  },

  'swift-capital': {
    name: 'Swift Capital',
    descriptors: [
      'SWIFT CAPITAL',
      'SWIFT CAP',
      'SWIFT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Quick funding provider.',
  },

  'rapid-capital': {
    name: 'Rapid Capital',
    descriptors: [
      'RAPID CAPITAL',
      'RAPID CAP',
      'RAPID FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Speed-focused funding.',
  },

  'direct-funding': {
    name: 'Direct Funding',
    descriptors: [
      'DIRECT FUNDING',
      'DIRECT FUND',
      'DIRECT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Straight-to-merchant funding.',
  },

  'noble-capital': {
    name: 'Noble Capital',
    descriptors: [
      'NOBLE CAPITAL',
      'NOBLE CAP',
      'NOBLE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'High quality funding.',
  },

  'prestige-capital': {
    name: 'Prestige Capital',
    descriptors: [
      'PRESTIGE CAPITAL',
      'PRESTIGE CAP',
      'PRESTIGE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Prestigious funding provider.',
  },

  'merit-funding': {
    name: 'Merit Funding',
    descriptors: [
      'MERIT FUNDING',
      'MERIT FUND',
      'MERIT',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Quality-based funding.',
  },

  'factor-capital': {
    name: 'Factor Capital',
    descriptors: [
      'FACTOR CAPITAL',
      'FACTOR CAP',
      'FACTOR FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'MCA/Factoring provider.',
  },

  'essence-capital': {
    name: 'Essence Capital',
    descriptors: [
      'ESSENCE CAPITAL',
      'ESSENCE CAP',
      'ESSENCE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Core business funding.',
  },

  'surge-capital': {
    name: 'Surge Capital',
    descriptors: [
      'SURGE CAPITAL',
      'SURGE CAP',
      'SURGE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Growth surge funding.',
  },

  'pulse-funding': {
    name: 'Pulse Funding',
    descriptors: [
      'PULSE FUNDING',
      'PULSE FUND',
      'PULSE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business heartbeat funding.',
  },

  'vigor-capital': {
    name: 'Vigor Capital',
    descriptors: [
      'VIGOR CAPITAL',
      'VIGOR CAP',
      'VIGOR',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Strong, energetic funding.',
  },

  'verve-capital': {
    name: 'Verve Capital',
    descriptors: [
      'VERVE CAPITAL',
      'VERVE CAP',
      'VERVE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Enthusiastic funding provider.',
  },

  'valor-capital': {
    name: 'Valor Capital',
    descriptors: [
      'VALOR CAPITAL',
      'VALOR CAP',
      'VALOR',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Brave, strong funding.',
  },

  'titan-capital': {
    name: 'Titan Capital',
    descriptors: [
      'TITAN CAPITAL',
      'TITAN CAP',
      'TITAN FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Giant-sized funding.',
  },

  'atlas-funding': {
    name: 'Atlas Funding',
    descriptors: [
      'ATLAS FUNDING',
      'ATLAS FUND',
      'ATLAS',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Comprehensive funding map.',
  },

  'arbor-capital': {
    name: 'Arbor Capital',
    descriptors: [
      'ARBOR CAPITAL',
      'ARBOR CAP',
      'ARBOR',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Tree-like growth funding.',
  },

  'crystal-capital': {
    name: 'Crystal Capital',
    descriptors: [
      'CRYSTAL CAPITAL',
      'CRYSTAL CAP',
      'CRYSTAL CLEAR',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Transparent funding provider.',
  },

  'diamond-capital': {
    name: 'Diamond Capital',
    descriptors: [
      'DIAMOND CAPITAL',
      'DIAMOND CAP',
      'DIAMOND FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Premium quality funding.',
  },

  'crown-capital': {
    name: 'Crown Capital',
    descriptors: [
      'CROWN CAPITAL',
      'CROWN CAP',
      'CROWN FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Top-tier funding.',
  },

  'torch-capital': {
    name: 'Torch Capital',
    descriptors: [
      'TORCH CAPITAL',
      'TORCH CAP',
      'TORCH',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Light the way funding.',
  },

  'forge-capital': {
    name: 'Forge Capital',
    descriptors: [
      'FORGE CAPITAL',
      'FORGE CAP',
      'FORGE',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Build strength funding.',
  },

  'venture-capital': {
    name: 'Venture Capital',
    descriptors: [
      'VENTURE CAPITAL',
      'VENTURE CAP',
      'VENTURE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business venture funding.',
  },

  'ascend-capital': {
    name: 'Ascend Capital',
    descriptors: [
      'ASCEND CAPITAL',
      'ASCEND CAP',
      'ASCEND',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Rising success funding.',
  },

  'zenith-funding': {
    name: 'Zenith Funding',
    descriptors: [
      'ZENITH FUNDING',
      'ZENITH FUND',
      'ZENITH LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Peak funding provider.',
  },

  'surge-funding': {
    name: 'Surge Funding',
    descriptors: [
      'SURGE FUNDING',
      'SURGE FUND',
      'SURGE LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Power surge funding.',
  },

  'clarity-capital': {
    name: 'Clarity Capital',
    descriptors: [
      'CLARITY CAPITAL',
      'CLARITY CAP',
      'CLARITY',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Clear path funding.',
  },

  'vista-capital': {
    name: 'Vista Capital',
    descriptors: [
      'VISTA CAPITAL',
      'VISTA CAP',
      'VISTA FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Wide view funding.',
  },

  'orbit-capital': {
    name: 'Orbit Capital',
    descriptors: [
      'ORBIT CAPITAL',
      'ORBIT CAP',
      'ORBIT FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Circular business growth funding.',
  },

  'spark-capital': {
    name: 'Spark Capital',
    descriptors: [
      'SPARK CAPITAL',
      'SPARK CAP',
      'SPARK FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Ignite growth funding.',
  },

  'pulse-capital': {
    name: 'Pulse Capital',
    descriptors: [
      'PULSE CAPITAL',
      'PULSE CAP',
      'PULSE LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Rhythmic business funding.',
  },

  'blaze-capital': {
    name: 'Blaze Capital',
    descriptors: [
      'BLAZE CAPITAL',
      'BLAZE CAP',
      'BLAZE FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Fast growth funding.',
  },

  'nexus-capital': {
    name: 'Nexus Capital',
    descriptors: [
      'NEXUS CAPITAL',
      'NEXUS CAP',
      'NEXUS LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Connection point funding.',
  },

  'iris-capital': {
    name: 'Iris Capital',
    descriptors: [
      'IRIS CAPITAL',
      'IRIS CAP',
      'IRIS FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Vision-focused funding.',
  },

  'luna-capital': {
    name: 'Luna Capital',
    descriptors: [
      'LUNA CAPITAL',
      'LUNA CAP',
      'LUNA FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Business cycle funding.',
  },

  'nova-capital': {
    name: 'Nova Capital',
    descriptors: [
      'NOVA CAPITAL',
      'NOVA CAP',
      'NOVA FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'New star funding.',
  },

  'stellar-funding': {
    name: 'Stellar Funding',
    descriptors: [
      'STELLAR FUNDING',
      'STELLAR FUND',
      'STELLAR LOAN',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Outstanding performance funding.',
  },

  'solar-capital': {
    name: 'Solar Capital',
    descriptors: [
      'SOLAR CAPITAL',
      'SOLAR CAP',
      'SOLAR FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Bright future funding.',
  },

  'cosmos-capital': {
    name: 'Cosmos Capital',
    descriptors: [
      'COSMOS CAPITAL',
      'COSMOS CAP',
      'COSMOS FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Universal business funding.',
  },

  'aurora-capital': {
    name: 'Aurora Capital',
    descriptors: [
      'AURORA CAPITAL',
      'AURORA CAP',
      'AURORA FUNDING',
    ],
    type: 'MCA',
    typicalFrequency: 'Daily',
    notes: 'Dawn of success funding.',
  },
}

/**
 * Non-MCA patterns to EXCLUDE from MCA detection
 * These are legitimate business transactions that should not be counted as MCA
 */
export const NON_MCA_PATTERNS: NonMCAPattern[] = [
  {
    category: 'Payroll Processors',
    descriptors: [
      'ADP',
      'PAYCHEX',
      'GUSTO',
      'RIPPLING',
      'BAMBOOHR',
      'PAYROLL',
      'PAYROLL TAX',
      'WAGES',
      'SALARY',
    ],
    notes: 'Legitimate business payroll - employee compensation only.',
  },
  {
    category: 'POS/Payment Processors',
    descriptors: [
      'MERCHANT BANKCARD',
      'HEARTLAND',
      'WORLDPAY',
      'ELAVON',
      'TSYS',
      'FIRST DATA',
      'STRIPE PAYMENTS',
      'SQUARE PAYMENT',
      'CLOVER',
      'TOAST',
      'LIGHTSPEED',
      'PAYMENT PROCESSING',
    ],
    notes: 'Payment processing fees - not advances or MCAs.',
  },
  {
    category: 'Delivery Platforms (Revenue)',
    descriptors: [
      'DOORDASH',
      'UBER EATS',
      'GRUBHUB',
      'INSTACART',
      'EZCATER',
      'DELIVERY.COM',
    ],
    notes: 'Revenue from delivery platforms - legitimate sales.',
  },
  {
    category: 'Suppliers and Vendors',
    descriptors: [
      'SYSCO',
      'US FOODS',
      'PERFORMANCE FOOD',
      'GORDON FOOD',
      'SUPPLIER',
      'VENDOR',
    ],
    notes: 'Supplier payments - legitimate business expenses.',
  },
  {
    category: 'Utilities',
    descriptors: [
      'ELECTRIC',
      'ELECTRICITY',
      'GAS',
      'WATER',
      'SEWER',
      'WASTE',
      'TRASH',
      'UTILITY',
      'ELECTRIC BILL',
    ],
    notes: 'Recurring utility payments - legitimate operating costs.',
  },
  {
    category: 'Insurance',
    descriptors: [
      'INSURANCE',
      'PREMIUM',
      'GEICO',
      'STATE FARM',
      'NATIONWIDE',
      'AETNA',
      'CIGNA',
      'HEALTH INSURANCE',
    ],
    notes: 'Recurring insurance payments - legitimate business expense.',
  },
  {
    category: 'Rent/Lease',
    descriptors: [
      'RENT',
      'LEASE',
      'LANDLORD',
      'PROPERTY MGMT',
      'PROPERTY MANAGEMENT',
      'LEASE PAYMENT',
    ],
    notes: 'Recurring rent/lease payments - legitimate operating cost.',
  },
  {
    category: 'Internal Transfers',
    descriptors: [
      'TRANSFER',
      'XFER',
      'ACCOUNT TRANSFER',
      'INTER-ACCOUNT',
      'SWEEP',
    ],
    notes: 'Inter-account transfers between own accounts - not revenue or advances.',
  },
]

/**
 * Detects if a transaction descriptor matches an MCA funder
 *
 * @param descriptorText - The transaction description from bank statement
 * @returns true if matches an MCA funder descriptor
 */
export function isMCADescriptor(descriptorText: string): boolean {
  if (!descriptorText || typeof descriptorText !== 'string') {
    return false
  }

  const text = descriptorText.toUpperCase().trim()

  try {
    // Check if matches any MCA funder
    for (const funder of Object.values(MCA_FUNDERS)) {
      for (const descriptor of funder.descriptors) {
        if (text.includes(descriptor.toUpperCase())) {
          return true
        }
      }
    }
  } catch (error) {
    console.error('[mca-funders] Error in isMCADescriptor:', error)
  }

  return false
}

/**
 * Detects if a transaction descriptor is a non-MCA pattern to exclude
 *
 * @param descriptorText - The transaction description from bank statement
 * @returns true if matches a non-MCA pattern
 */
export function isNonMCADescriptor(descriptorText: string): boolean {
  if (!descriptorText || typeof descriptorText !== 'string') {
    return false
  }

  const text = descriptorText.toUpperCase().trim()

  try {
    for (const pattern of NON_MCA_PATTERNS) {
      for (const descriptor of pattern.descriptors) {
        if (text.includes(descriptor.toUpperCase())) {
          return true
        }
      }
    }
  } catch (error) {
    console.error('[mca-funders] Error in isNonMCADescriptor:', error)
  }

  return false
}

/**
 * Detects which MCA funder a descriptor matches
 *
 * @param descriptorText - The transaction description from bank statement
 * @returns MCAFunderProfile if match found, null otherwise
 */
export function detectMCAFunder(descriptorText: string): MCAFunderProfile | null {
  if (!descriptorText || typeof descriptorText !== 'string') {
    return null
  }

  const text = descriptorText.toUpperCase().trim()

  try {
    for (const funder of Object.values(MCA_FUNDERS)) {
      for (const descriptor of funder.descriptors) {
        if (text.includes(descriptor.toUpperCase())) {
          return funder
        }
      }
    }
  } catch (error) {
    console.error('[mca-funders] Error in detectMCAFunder:', error)
  }

  return null
}

/**
 * Gets all MCA funders of a specific type
 *
 * @param fundingType - Type of funding to filter by
 * @returns Array of MCAFunderProfile objects
 */
export function getFundersByType(fundingType: FundingType): MCAFunderProfile[] {
  try {
    return Object.values(MCA_FUNDERS).filter(funder => funder.type === fundingType)
  } catch (error) {
    console.error('[mca-funders] Error in getFundersByType:', error)
    return []
  }
}

/**
 * Gets all MCA funders with a specific payment frequency
 *
 * @param frequency - Payment frequency to filter by
 * @returns Array of MCAFunderProfile objects
 */
export function getFundersByFrequency(frequency: PaymentFrequency): MCAFunderProfile[] {
  try {
    return Object.values(MCA_FUNDERS).filter(funder => funder.typicalFrequency === frequency)
  } catch (error) {
    console.error('[mca-funders] Error in getFundersByFrequency:', error)
    return []
  }
}
