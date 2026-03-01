import type {
  ArtifactLink,
  IssueMetrics,
  LaneTag,
  LeagueRulesV1,
  ProposalNarrative,
  RuleDiff,
  SandboxImpactReport
} from "@/lib/types";

export type DemoMarketSizeTier = "SMALL" | "MID" | "LARGE" | "MEGA";
export type DemoIssueStatus = "OPEN" | "IN_REVIEW" | "RESOLVED";
export type DemoProposalStatus = "DRAFT" | "SUBMITTED" | "VOTING" | "DECISION";
export type DemoProjectType = "TOOL" | "INVESTIGATION" | "STRATEGY" | "PROPOSAL_SUPPORT";

type DemoContract = {
  playerName: string;
  years: number;
  salaries: number[];
  notes?: string;
};

type DemoTeam = {
  id: string;
  name: string;
  marketSizeTier: DemoMarketSizeTier;
  ownerProfile: string;
  ownerDisciplineScore: number;
  payroll: number;
  taxPaid: number;
  revenue: number;
  valuation: number;
  performanceProxy: number;
  taxStatus: string;
  strategyNote: string;
  contractNotes: string;
  linkedIssueIds: string[];
  strategyProjectIds: string[];
  contracts: DemoContract[];
};

type DemoRuleSet = {
  id: string;
  version: number;
  title: string;
  isActive: boolean;
  effectiveSeasonYear: number | null;
  createdAt: string;
  rules: LeagueRulesV1;
  summary: string;
  diffNotes: Array<{ label: string; previous: string; next: string }>;
};

type DemoIssue = {
  id: string;
  title: string;
  description: string;
  severity: number;
  status: DemoIssueStatus;
  metrics: IssueMetrics;
  evidence: string[];
  linkedProjectIds: string[];
  linkedProposalIds: string[];
  teamId?: string;
};

type DemoProject = {
  id: string;
  title: string;
  summary: string;
  projectType: DemoProjectType;
  laneTags: LaneTag[];
  issueIds: string[];
  teamId?: string;
  supportingProposalId?: string;
  artifactLinks: ArtifactLink[];
  findings: string[];
  createdBy: string;
  collaborators: string[];
  comments: Array<{ author: string; body: string; createdAt: string }>;
  createdAt: string;
};

type DemoProposal = {
  id: string;
  title: string;
  issueId: string;
  createdBy: string;
  status: DemoProposalStatus;
  ruleSetTargetId: string;
  voteWindow: string;
  narrative: ProposalNarrative;
  diff: RuleDiff;
  sandbox: SandboxImpactReport;
  decision?: {
    decision: "APPROVE" | "DENY" | "AMEND";
    notes: string;
    decidedBy: string;
    decidedAt: string;
  };
  voteTally: {
    yes: number;
    no: number;
  };
};

type DemoActivity = {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  href: string;
  type: string;
};

const activeRules: LeagueRulesV1 = {
  capGrowthRate: 0.08,
  luxuryTaxBrackets: [
    { label: "Tax line", thresholdMultiplier: 1.0, rate: 1.5 },
    { label: "Upper repeater band", thresholdMultiplier: 1.1, rate: 2.25 },
    { label: "Second apron band", thresholdMultiplier: 1.18, rate: 3.0 }
  ],
  secondApronThreshold: 1.18,
  revenueSharingRate: 0.14
};

const pendingRules: LeagueRulesV1 = {
  capGrowthRate: 0.075,
  luxuryTaxBrackets: [
    { label: "Tax line", thresholdMultiplier: 1.0, rate: 1.65 },
    { label: "Upper repeater band", thresholdMultiplier: 1.08, rate: 2.35 },
    { label: "Second apron band", thresholdMultiplier: 1.16, rate: 3.1 }
  ],
  secondApronThreshold: 1.16,
  revenueSharingRate: 0.17
};

export const dashboardOverview = {
  currentSeasonYear: 2028,
  currentSeasonLabel: "Season 2028 · Midyear Review",
  activeRuleSetVersion: 2,
  parityIndex: 8.4,
  taxConcentration: 0.68,
  revenueInequality: 1.46,
  smallVsBigCompetitiveness: 0.92
};

export const teams: DemoTeam[] = [
  {
    id: "glass-harbor-tides",
    name: "Glass Harbor Tides",
    marketSizeTier: "SMALL",
    ownerProfile: "Civic harbor trust focused on stable long-term planning.",
    ownerDisciplineScore: 1.08,
    payroll: 142,
    taxPaid: 2.8,
    revenue: 258,
    valuation: 1104,
    performanceProxy: 57,
    taxStatus: "Near tax line",
    strategyNote: "Invest in cost-controlled defense and local fan loyalty.",
    contractNotes: "Veteran-heavy middle of the roster keeps payroll efficient but inflexible.",
    linkedIssueIds: ["small-market-retention", "valuation-volatility"],
    strategyProjectIds: ["harbor-three-year-plan"],
    contracts: [
      { playerName: "Mara Ellison", years: 3, salaries: [31, 33, 35], notes: "Two-way anchor" },
      { playerName: "Theo Carden", years: 2, salaries: [24, 26], notes: "Lead initiator" },
      { playerName: "Iris Nolan", years: 4, salaries: [17, 18, 19, 20] }
    ]
  },
  {
    id: "cinder-vale-forge",
    name: "Cinder Vale Forge",
    marketSizeTier: "MID",
    ownerProfile: "Industrial family office that tolerates moderate tax pressure.",
    ownerDisciplineScore: 1.03,
    payroll: 154,
    taxPaid: 8.6,
    revenue: 282,
    valuation: 1180,
    performanceProxy: 61,
    taxStatus: "Taxpayer",
    strategyNote: "Use internal development to avoid a second-apron trap.",
    contractNotes: "Core is strong, but the third-year commitments start to bunch together.",
    linkedIssueIds: ["tax-arms-race"],
    strategyProjectIds: ["forge-apron-map"],
    contracts: [
      { playerName: "Jalen Mercer", years: 4, salaries: [36, 38, 40, 42] },
      { playerName: "Noa Petrov", years: 3, salaries: [21, 22, 24] },
      { playerName: "Gio Ramires", years: 2, salaries: [16, 18] }
    ]
  },
  {
    id: "northwind-astrals",
    name: "Northwind Astrals",
    marketSizeTier: "LARGE",
    ownerProfile: "Media-backed ownership group comfortable with aggressive payrolls.",
    ownerDisciplineScore: 0.96,
    payroll: 178,
    taxPaid: 21.4,
    revenue: 337,
    valuation: 1387,
    performanceProxy: 68,
    taxStatus: "Above upper band",
    strategyNote: "Balance immediate contention against future tax concentration concerns.",
    contractNotes: "Top-end salaries create title upside and measurable inequality pressure.",
    linkedIssueIds: ["market-inequality", "tax-arms-race"],
    strategyProjectIds: ["astrals-flexibility-window"],
    contracts: [
      { playerName: "Soren Vale", years: 5, salaries: [44, 46, 48, 51, 54] },
      { playerName: "Amaya Frost", years: 4, salaries: [32, 34, 36, 38] },
      { playerName: "Kellan Dune", years: 3, salaries: [23, 24, 26] }
    ]
  },
  {
    id: "larkspur-ledger",
    name: "Larkspur Ledger",
    marketSizeTier: "SMALL",
    ownerProfile: "Education foundation board that prefers cap discipline and depth.",
    ownerDisciplineScore: 1.11,
    payroll: 133,
    taxPaid: 0,
    revenue: 247,
    valuation: 1086,
    performanceProxy: 54,
    taxStatus: "Below tax line",
    strategyNote: "Maintain optionality and turn information advantage into roster depth.",
    contractNotes: "The team has room to absorb a targeted midseason salary increase.",
    linkedIssueIds: ["small-market-retention"],
    strategyProjectIds: ["ledger-depth-plan"],
    contracts: [
      { playerName: "Rina Hart", years: 4, salaries: [27, 28, 29, 31] },
      { playerName: "Malik Stone", years: 3, salaries: [18, 19, 21] },
      { playerName: "Pia Romero", years: 2, salaries: [15, 16] }
    ]
  },
  {
    id: "copper-basin-signals",
    name: "Copper Basin Signals",
    marketSizeTier: "MID",
    ownerProfile: "Data-first consortium using research partnerships to guide transactions.",
    ownerDisciplineScore: 1.09,
    payroll: 147,
    taxPaid: 3.9,
    revenue: 275,
    valuation: 1172,
    performanceProxy: 59,
    taxStatus: "Light taxpayer",
    strategyNote: "Convert modeling tools into sharper small-margin decisions.",
    contractNotes: "Contract structure is healthy, but the bench unit will need cheaper contributors.",
    linkedIssueIds: ["valuation-volatility"],
    strategyProjectIds: ["signals-efficiency-map"],
    contracts: [
      { playerName: "Dax Holloway", years: 3, salaries: [29, 31, 33] },
      { playerName: "Lina Zhou", years: 3, salaries: [20, 21, 23] },
      { playerName: "Bruno Valez", years: 4, salaries: [14, 15, 17, 18] }
    ]
  },
  {
    id: "port-meridian-atlas",
    name: "Port Meridian Atlas",
    marketSizeTier: "MEGA",
    ownerProfile: "Global portfolio ownership group comfortable funding peak contention cycles.",
    ownerDisciplineScore: 0.94,
    payroll: 186,
    taxPaid: 27.9,
    revenue: 356,
    valuation: 1434,
    performanceProxy: 71,
    taxStatus: "Second apron pressure",
    strategyNote: "The team is winning now, but its tax burden warps league incentives.",
    contractNotes: "This is the clearest example of concentrated star spending in the league.",
    linkedIssueIds: ["market-inequality", "tax-arms-race"],
    strategyProjectIds: ["atlas-cap-cliff-plan"],
    contracts: [
      { playerName: "Cassian Rowe", years: 4, salaries: [47, 49, 51, 54] },
      { playerName: "Etta Monroe", years: 5, salaries: [35, 36, 38, 40, 42] },
      { playerName: "Tariq Bell", years: 2, salaries: [24, 26] }
    ]
  },
  {
    id: "juniper-sound-owls",
    name: "Juniper Sound Owls",
    marketSizeTier: "MID",
    ownerProfile: "Regional cooperative with patience for slow-burn roster construction.",
    ownerDisciplineScore: 1.07,
    payroll: 139,
    taxPaid: 0,
    revenue: 266,
    valuation: 1131,
    performanceProxy: 55,
    taxStatus: "Below tax line",
    strategyNote: "Use consistency and player development to outperform market size.",
    contractNotes: "The roster is balanced, but offensive creation remains expensive to add.",
    linkedIssueIds: ["small-market-retention"],
    strategyProjectIds: ["owls-continuity-brief"],
    contracts: [
      { playerName: "Keira Sloan", years: 3, salaries: [25, 27, 29] },
      { playerName: "Owen Reyes", years: 4, salaries: [19, 20, 21, 23] },
      { playerName: "Zuri Hall", years: 2, salaries: [16, 17] }
    ]
  },
  {
    id: "red-mesa-surveyors",
    name: "Red Mesa Surveyors",
    marketSizeTier: "SMALL",
    ownerProfile: "Community-benefit owner that measures success across attendance and school partnerships.",
    ownerDisciplineScore: 1.14,
    payroll: 128,
    taxPaid: 0,
    revenue: 239,
    valuation: 1055,
    performanceProxy: 52,
    taxStatus: "Below tax line",
    strategyNote: "Preserve flexibility and target one major extension at a time.",
    contractNotes: "This team needs stronger retention tools more than larger spending capacity.",
    linkedIssueIds: ["small-market-retention"],
    strategyProjectIds: ["surveyors-retention-roadmap"],
    contracts: [
      { playerName: "Avery Pike", years: 3, salaries: [23, 24, 26] },
      { playerName: "Jiro Mendez", years: 4, salaries: [18, 18, 19, 20] },
      { playerName: "Nadia Bloom", years: 2, salaries: [14, 15] }
    ]
  },
  {
    id: "halcyon-ridge-summit",
    name: "Halcyon Ridge Summit",
    marketSizeTier: "LARGE",
    ownerProfile: "Private capital partnership chasing sustained postseason relevance.",
    ownerDisciplineScore: 0.99,
    payroll: 165,
    taxPaid: 13.1,
    revenue: 314,
    valuation: 1310,
    performanceProxy: 64,
    taxStatus: "Upper band",
    strategyNote: "Re-sequence major deals to avoid stacking tax spikes in the same year.",
    contractNotes: "Good talent base, but the extension timeline needs smoothing.",
    linkedIssueIds: ["tax-arms-race", "valuation-volatility"],
    strategyProjectIds: ["summit-extension-calendar"],
    contracts: [
      { playerName: "Levi Cairn", years: 4, salaries: [38, 40, 42, 45] },
      { playerName: "Mina Ortiz", years: 3, salaries: [24, 25, 27] },
      { playerName: "Dev Shah", years: 3, salaries: [18, 19, 20] }
    ]
  },
  {
    id: "moonlit-current-quorum",
    name: "Moonlit Current Quorum",
    marketSizeTier: "MID",
    ownerProfile: "Policy-minded board that uses league reform to stabilize long-term planning.",
    ownerDisciplineScore: 1.12,
    payroll: 145,
    taxPaid: 1.9,
    revenue: 271,
    valuation: 1175,
    performanceProxy: 58,
    taxStatus: "Just over tax line",
    strategyNote: "Turn governance literacy into better roster sequencing.",
    contractNotes: "The payroll is manageable today but one new max slot would shift the entire cap shape.",
    linkedIssueIds: ["second-apron-squeeze"],
    strategyProjectIds: ["quorum-governance-bridge"],
    contracts: [
      { playerName: "Selene Park", years: 4, salaries: [30, 31, 33, 35] },
      { playerName: "Dante Ellis", years: 2, salaries: [22, 24] },
      { playerName: "Nico Serrano", years: 3, salaries: [15, 16, 17] }
    ]
  },
  {
    id: "stonegate-bloom",
    name: "Stonegate Bloom",
    marketSizeTier: "LARGE",
    ownerProfile: "Institutional owner balancing civic expectations and playoff ambition.",
    ownerDisciplineScore: 1.01,
    payroll: 160,
    taxPaid: 10.2,
    revenue: 306,
    valuation: 1272,
    performanceProxy: 63,
    taxStatus: "Taxpayer",
    strategyNote: "The next step is smarter mid-tier contracting, not another star chase.",
    contractNotes: "The team could open a cleaner lane by moving one non-core veteran contract.",
    linkedIssueIds: ["valuation-volatility"],
    strategyProjectIds: ["bloom-midtier-reset"],
    contracts: [
      { playerName: "Elena Fox", years: 5, salaries: [34, 36, 38, 40, 42] },
      { playerName: "Marcus Ibarra", years: 3, salaries: [21, 23, 24] },
      { playerName: "Tessa Clay", years: 2, salaries: [19, 20] }
    ]
  },
  {
    id: "aurora-commons-array",
    name: "Aurora Commons Array",
    marketSizeTier: "MEGA",
    ownerProfile: "Corporate umbrella owner that prioritizes scale, sponsorship, and visibility.",
    ownerDisciplineScore: 0.92,
    payroll: 182,
    taxPaid: 24.6,
    revenue: 349,
    valuation: 1402,
    performanceProxy: 69,
    taxStatus: "Second apron pressure",
    strategyNote: "The model works on paper, but repeated tax spikes could harden league opposition.",
    contractNotes: "This is another club forcing the league to confront spending concentration.",
    linkedIssueIds: ["market-inequality", "tax-arms-race"],
    strategyProjectIds: ["array-pressure-scenarios"],
    contracts: [
      { playerName: "Yara Quinn", years: 5, salaries: [43, 45, 47, 49, 51] },
      { playerName: "Hugo Marin", years: 4, salaries: [31, 33, 35, 37] },
      { playerName: "Bryn Aalto", years: 3, salaries: [23, 24, 25] }
    ]
  }
];

export const ruleSets: DemoRuleSet[] = [
  {
    id: "rules-v2",
    version: 2,
    title: "Research Charter v2",
    isActive: true,
    effectiveSeasonYear: 2028,
    createdAt: "2028-08-18",
    rules: activeRules,
    summary: "Balanced cap growth with moderate revenue sharing and a visible second-apron warning zone.",
    diffNotes: [
      { label: "Cap growth rate", previous: "6.0%", next: "8.0%" },
      { label: "Revenue sharing rate", previous: "12.0%", next: "14.0%" }
    ]
  },
  {
    id: "rules-v3",
    version: 3,
    title: "Pending Equity Adjustment",
    isActive: false,
    effectiveSeasonYear: 2029,
    createdAt: "2028-11-02",
    rules: pendingRules,
    summary: "A proposed next-season ruleset that deepens sharing and slightly pulls down the second apron threshold.",
    diffNotes: [
      { label: "Revenue sharing rate", previous: "14.0%", next: "17.0%" },
      { label: "Second apron threshold", previous: "118.0% of cap", next: "116.0% of cap" },
      { label: "Top tax rates", previous: "1.50 / 2.25 / 3.00", next: "1.65 / 2.35 / 3.10" }
    ]
  },
  {
    id: "rules-v1",
    version: 1,
    title: "Founding Rulebook",
    isActive: false,
    effectiveSeasonYear: 2027,
    createdAt: "2027-08-10",
    rules: {
      capGrowthRate: 0.06,
      luxuryTaxBrackets: [
        { label: "Tax line", thresholdMultiplier: 1.0, rate: 1.25 },
        { label: "Escalation band", thresholdMultiplier: 1.12, rate: 2.0 }
      ],
      secondApronThreshold: 1.2,
      revenueSharingRate: 0.12
    },
    summary: "The original rules emphasized owner discretion and a lighter redistribution model.",
    diffNotes: []
  }
];

export const issues: DemoIssue[] = [
  {
    id: "market-inequality",
    title: "Market inequality is widening elite-team advantages",
    description:
      "The largest markets can absorb tax pain, hold multiple stars, and outlast smaller teams in long negotiation cycles.",
    severity: 5,
    status: "OPEN",
    metrics: {
      revenueInequality: 1.46,
      taxConcentration: 0.68,
      triggerReason: "Large-market clubs still dominate the top three revenue positions."
    },
    evidence: [
      "The two mega-market clubs and one large-market club account for most tax spending.",
      "Average payroll in the top revenue tier is more than 20 million above the small-market median.",
      "Valuation growth remains faster in the largest media markets even when performance is only moderately better."
    ],
    linkedProjectIds: ["equity-monitor", "array-pressure-scenarios"],
    linkedProposalIds: ["expand-revenue-sharing"]
  },
  {
    id: "tax-arms-race",
    title: "Luxury-tax spending is concentrating too tightly",
    description:
      "A few contenders are carrying most of the league tax load, which makes the policy feel optional for big markets and punitive for everyone else.",
    severity: 4,
    status: "OPEN",
    metrics: {
      taxConcentration: 0.68,
      parityIndex: 8.4,
      triggerReason: "Top three taxpayers cover more than two-thirds of all projected tax payments."
    },
    evidence: [
      "Tax bills are heavily concentrated in Atlas, Array, and Astrals scenarios.",
      "Mid-market teams report that the current tax structure changes behavior earlier than intended.",
      "Students repeatedly flag tax concentration as an incentives problem rather than just a fairness problem."
    ],
    linkedProjectIds: ["forge-apron-map", "tax-distribution-lab"],
    linkedProposalIds: ["raise-top-tax-band"]
  },
  {
    id: "small-market-retention",
    title: "Small-market teams need stronger retention pathways",
    description:
      "Smaller markets can draft and develop talent, but they struggle to keep stars through second and third contracts without losing long-term flexibility.",
    severity: 4,
    status: "IN_REVIEW",
    metrics: {
      smallVsBigCompetitiveness: 0.92,
      revenueInequality: 1.46,
      triggerReason: "The competitiveness gap is manageable now, but retention stress is visible in team plans."
    },
    evidence: [
      "Glass Harbor, Larkspur, and Red Mesa all rely on unusually disciplined cap timing.",
      "Several three-year plans recommend staggered extensions instead of direct retention because of apron fear.",
      "League interviews suggest small markets value revenue certainty more than higher cap growth."
    ],
    linkedProjectIds: ["harbor-three-year-plan", "surveyors-retention-roadmap"],
    linkedProposalIds: ["small-market-extensions"]
  },
  {
    id: "second-apron-squeeze",
    title: "The second apron is shaping behavior earlier than intended",
    description:
      "Teams are avoiding future flexibility losses before they even reach the apron, which may make the whole system too conservative.",
    severity: 3,
    status: "OPEN",
    metrics: {
      parityIndex: 8.4,
      triggerReason: "Mid-market teams report 'apron anxiety' one full planning cycle before they cross the line."
    },
    evidence: [
      "Quorum and Forge strategy notes show future apron fear affecting present roster choices.",
      "The current threshold may be visible enough to change incentives but not precise enough to feel fair.",
      "Several proposal drafts ask for a smoother ramp rather than a hard behavioral cliff."
    ],
    linkedProjectIds: ["quorum-governance-bridge", "second-apron-memo"],
    linkedProposalIds: ["soften-second-apron"]
  },
  {
    id: "valuation-volatility",
    title: "Franchise valuation swings are outpacing operational stability",
    description:
      "Several teams have healthy revenues but unstable valuation narratives because tax exposure and long contract stacking distort the outlook.",
    severity: 2,
    status: "IN_REVIEW",
    metrics: {
      revenueInequality: 1.46,
      triggerReason: "Valuations move more sharply than revenue because tax and stability factors push in opposite directions."
    },
    evidence: [
      "Teams with similar revenue are showing larger than expected valuation gaps.",
      "Students identify contract duration, not just contract size, as a hidden valuation driver.",
      "This issue overlaps with both tax policy and strategic planning practices."
    ],
    linkedProjectIds: ["signals-efficiency-map", "bloom-midtier-reset"],
    linkedProposalIds: []
  }
];

export const projects: DemoProject[] = [
  {
    id: "equity-monitor",
    title: "League Equity Monitor",
    summary: "A simple metrics board that tracks revenue inequality, tax concentration, and small-market competitiveness in one place.",
    projectType: "TOOL",
    laneTags: ["TOOL_BUILDERS", "ECONOMIC_INVESTIGATORS"],
    issueIds: ["market-inequality"],
    artifactLinks: [
      { label: "Sheets dashboard", url: "https://example.com/equity-monitor" },
      { label: "Method note", url: "https://example.com/equity-monitor-notes" }
    ],
    findings: [
      "Revenue inequality falls fastest when sharing increases before cap growth rises.",
      "Tax concentration is more sensitive to top-band rates than to the first tax line.",
      "The tool helps students compare policy ideas without turning the league into a video game."
    ],
    createdBy: "Riya Patel",
    collaborators: ["Owen Brooks", "Mina Holt"],
    comments: [
      {
        author: "Commissioner Avery",
        body: "Keep the explanation panel plain-language so fifth graders can use it independently.",
        createdAt: "2028-10-21"
      }
    ],
    createdAt: "2028-10-18"
  },
  {
    id: "harbor-three-year-plan",
    title: "Glass Harbor Three-Year Stability Plan",
    summary: "A strategy archive entry focused on staggered extensions and small-market retention.",
    projectType: "STRATEGY",
    laneTags: ["STRATEGIC_OPERATORS"],
    issueIds: ["small-market-retention"],
    teamId: "glass-harbor-tides",
    artifactLinks: [{ label: "Slides deck", url: "https://example.com/harbor-plan" }],
    findings: [
      "The Tides can extend one star this summer but should wait on a second major negotiation.",
      "Attendance stability matters almost as much as pure payroll efficiency in the local model.",
      "The team should preserve one year of optionality instead of chasing a short-term jump."
    ],
    createdBy: "Lena Cruz",
    collaborators: ["Mateo Ross"],
    comments: [
      {
        author: "Riya Patel",
        body: "This is a strong example of how strategy work can connect back to league policy questions.",
        createdAt: "2028-10-25"
      }
    ],
    createdAt: "2028-10-22"
  },
  {
    id: "forge-apron-map",
    title: "Forge Apron Map",
    summary: "A scenario model showing how payroll timing pushes a mid-market team into tax danger long before the roster peaks.",
    projectType: "INVESTIGATION",
    laneTags: ["ECONOMIC_INVESTIGATORS", "STRATEGIC_OPERATORS"],
    issueIds: ["tax-arms-race", "second-apron-squeeze"],
    teamId: "cinder-vale-forge",
    artifactLinks: [{ label: "Scenario sheet", url: "https://example.com/forge-apron-map" }],
    findings: [
      "The Forge are not reckless spenders, but the current thresholds still force defensive planning.",
      "A smoother top-tax ramp would preserve caution without causing early freeze behavior."
    ],
    createdBy: "Jonah Fields",
    collaborators: ["Sasha Kim"],
    comments: [],
    createdAt: "2028-10-23"
  },
  {
    id: "tax-distribution-lab",
    title: "Tax Distribution Lab",
    summary: "A proposal-support project exploring how different top-band rates shift tax concentration.",
    projectType: "PROPOSAL_SUPPORT",
    laneTags: ["POLICY_REFORM_ARCHITECTS", "TOOL_BUILDERS"],
    issueIds: ["tax-arms-race"],
    supportingProposalId: "raise-top-tax-band",
    artifactLinks: [{ label: "Short memo", url: "https://example.com/tax-distribution-lab" }],
    findings: [
      "Raising only the top band rate reduces concentration without changing low-tax team behavior very much.",
      "Students found this easier to explain than adding a fourth bracket."
    ],
    createdBy: "Ari Benson",
    collaborators: ["Nia Park"],
    comments: [],
    createdAt: "2028-10-27"
  },
  {
    id: "quorum-governance-bridge",
    title: "Quorum Governance Bridge",
    summary: "A team-focused memo on how policy knowledge can improve strategic timing and extension design.",
    projectType: "STRATEGY",
    laneTags: ["STRATEGIC_OPERATORS", "POLICY_REFORM_ARCHITECTS"],
    issueIds: ["second-apron-squeeze"],
    teamId: "moonlit-current-quorum",
    artifactLinks: [{ label: "Policy memo", url: "https://example.com/quorum-bridge" }],
    findings: [
      "Teams that understand policy windows can act earlier and more calmly.",
      "The issue is not just where the apron sits, but how teams interpret the signal."
    ],
    createdBy: "Mika Torres",
    collaborators: ["Nora James"],
    comments: [],
    createdAt: "2028-10-24"
  },
  {
    id: "array-pressure-scenarios",
    title: "Array Pressure Scenarios",
    summary: "An investigation into how mega-market tax tolerance affects league legitimacy.",
    projectType: "INVESTIGATION",
    laneTags: ["ECONOMIC_INVESTIGATORS"],
    issueIds: ["market-inequality"],
    teamId: "aurora-commons-array",
    artifactLinks: [{ label: "Case study", url: "https://example.com/array-pressure" }],
    findings: [
      "The Array are not breaking the rules, but they are exposing how much freedom large markets still have.",
      "Students argue that legitimacy matters as much as parity when rules are judged in class."
    ],
    createdBy: "Zane Keller",
    collaborators: ["Mia Solis"],
    comments: [],
    createdAt: "2028-10-29"
  },
  {
    id: "surveyors-retention-roadmap",
    title: "Surveyors Retention Roadmap",
    summary: "A three-year plan for Red Mesa centered on extension timing, fan trust, and salary flexibility.",
    projectType: "STRATEGY",
    laneTags: ["STRATEGIC_OPERATORS"],
    issueIds: ["small-market-retention"],
    teamId: "red-mesa-surveyors",
    artifactLinks: [{ label: "Roadmap", url: "https://example.com/surveyors-roadmap" }],
    findings: [
      "Retention is easier when the club keeps one clear long-range story for fans and players.",
      "The most useful reform would be a narrow small-market extension relief pathway."
    ],
    createdBy: "Eva Quinn",
    collaborators: ["Leo Marsh"],
    comments: [],
    createdAt: "2028-10-30"
  }
];

export const proposals: DemoProposal[] = [
  {
    id: "expand-revenue-sharing",
    title: "Expand revenue sharing before the next season rollover",
    issueId: "market-inequality",
    createdBy: "Riya Patel",
    status: "VOTING",
    ruleSetTargetId: "rules-v2",
    voteWindow: "Voting open · Nov 4 to Nov 8, 2028",
    narrative: {
      problem:
        "Large-market tax tolerance still creates a structural advantage even when cap rules are formally the same for everyone.",
      proposedChange:
        "Raise revenue sharing from 14% to 17% and move the second apron threshold slightly lower so concentrated payrolls face clearer tradeoffs.",
      expectedImpact:
        "The proposal should lower revenue inequality and improve the competitiveness outlook for small markets without flattening the league entirely.",
      tradeoffs:
        "High-revenue teams may argue that stronger sharing reduces reward for strong local business decisions."
    },
    diff: {
      changes: [
        {
          op: "replace",
          path: "/revenueSharingRate",
          value: 0.17,
          reason: "Increase league redistribution"
        },
        {
          op: "replace",
          path: "/secondApronThreshold",
          value: 1.16,
          reason: "Signal overspending pressure slightly earlier"
        }
      ]
    },
    sandbox: {
      baseline: {
        parityIndex: 8.4,
        taxConcentration: 0.68,
        revenueInequality: 1.46,
        smallVsBigCompetitiveness: 0.92
      },
      proposed: {
        parityIndex: 8.1,
        taxConcentration: 0.64,
        revenueInequality: 1.38,
        smallVsBigCompetitiveness: 0.95
      },
      delta: {
        parityIndex: -0.3,
        taxConcentration: -0.04,
        revenueInequality: -0.08,
        smallVsBigCompetitiveness: 0.03
      },
      explanation: [
        "More sharing reduces the raw revenue gap between the largest and smallest markets.",
        "A slightly lower apron threshold nudges the biggest taxpayers earlier without changing every team's payroll plan."
      ]
    },
    voteTally: {
      yes: 18,
      no: 6
    }
  },
  {
    id: "soften-second-apron",
    title: "Soften the second apron into a smoother ramp",
    issueId: "second-apron-squeeze",
    createdBy: "Mika Torres",
    status: "SUBMITTED",
    ruleSetTargetId: "rules-v2",
    voteWindow: "Awaiting commissioner scheduling",
    narrative: {
      problem:
        "The current threshold changes team behavior too early because the jump into the top band feels abrupt.",
      proposedChange:
        "Keep the apron concept, but align the upper tax band and apron band so teams see a gradual ramp instead of a cliff.",
      expectedImpact:
        "Mid-market teams should be able to plan more calmly while the biggest spenders still face visible penalties.",
      tradeoffs:
        "If the ramp is too soft, the strongest clubs may simply treat it as another cost of doing business."
    },
    diff: {
      changes: [
        {
          op: "replace",
          path: "/luxuryTaxBrackets/1/thresholdMultiplier",
          value: 1.08,
          reason: "Begin escalation earlier"
        },
        {
          op: "replace",
          path: "/secondApronThreshold",
          value: 1.16,
          reason: "Reduce hard-cliff behavior"
        }
      ]
    },
    sandbox: {
      baseline: {
        parityIndex: 8.4,
        taxConcentration: 0.68,
        revenueInequality: 1.46,
        smallVsBigCompetitiveness: 0.92
      },
      proposed: {
        parityIndex: 8.3,
        taxConcentration: 0.66,
        revenueInequality: 1.44,
        smallVsBigCompetitiveness: 0.93
      },
      delta: {
        parityIndex: -0.1,
        taxConcentration: -0.02,
        revenueInequality: -0.02,
        smallVsBigCompetitiveness: 0.01
      },
      explanation: [
        "The softer ramp changes planning more than final standings.",
        "Tax concentration improves modestly because the largest taxpayers face a little more pressure earlier."
      ]
    },
    voteTally: {
      yes: 0,
      no: 0
    }
  },
  {
    id: "raise-top-tax-band",
    title: "Raise only the top tax band for concentrated contenders",
    issueId: "tax-arms-race",
    createdBy: "Ari Benson",
    status: "DECISION",
    ruleSetTargetId: "rules-v2",
    voteWindow: "Voting closed · Oct 29, 2028",
    narrative: {
      problem:
        "A few contenders can still absorb the top-end tax rates without changing behavior much.",
      proposedChange:
        "Raise the top tax rate while keeping the first line stable so mid-tier taxpayers are not hit first.",
      expectedImpact:
        "This should lower tax concentration by targeting the biggest spenders directly.",
      tradeoffs:
        "Large-market teams may claim that the change punishes success more than it improves fairness."
    },
    diff: {
      changes: [
        {
          op: "replace",
          path: "/luxuryTaxBrackets/2/rate",
          value: 3.1,
          reason: "Increase pressure on top-band taxpayers"
        }
      ]
    },
    sandbox: {
      baseline: {
        parityIndex: 8.4,
        taxConcentration: 0.68,
        revenueInequality: 1.46,
        smallVsBigCompetitiveness: 0.92
      },
      proposed: {
        parityIndex: 8.2,
        taxConcentration: 0.63,
        revenueInequality: 1.45,
        smallVsBigCompetitiveness: 0.92
      },
      delta: {
        parityIndex: -0.2,
        taxConcentration: -0.05,
        revenueInequality: -0.01,
        smallVsBigCompetitiveness: 0
      },
      explanation: [
        "The biggest effect is on the top three taxpayers, not on the entire league revenue map."
      ]
    },
    decision: {
      decision: "AMEND",
      notes:
        "Approved in principle, but amended to pair the top-band increase with a modest sharing adjustment in the pending ruleset.",
      decidedBy: "Commissioner Avery",
      decidedAt: "2028-10-31"
    },
    voteTally: {
      yes: 14,
      no: 9
    }
  },
  {
    id: "small-market-extensions",
    title: "Create a narrow small-market extension relief pathway",
    issueId: "small-market-retention",
    createdBy: "Eva Quinn",
    status: "DRAFT",
    ruleSetTargetId: "rules-v2",
    voteWindow: "Draft only",
    narrative: {
      problem:
        "Small-market clubs need a more practical route to keep stars without stacking long-term risk all at once.",
      proposedChange:
        "Add a tightly scoped extension relief rule for teams below the league median revenue band.",
      expectedImpact:
        "The proposal would improve retention confidence without handing every team a new loophole.",
      tradeoffs:
        "The rule must stay narrow or it may look like a special exemption that is hard to explain."
    },
    diff: {
      changes: [
        {
          op: "add",
          path: "/luxuryTaxBrackets/3",
          value: {
            label: "Small-market extension review",
            thresholdMultiplier: null,
            rate: 0
          },
          reason: "Placeholder for policy discussion"
        }
      ]
    },
    sandbox: {
      baseline: {
        parityIndex: 8.4,
        taxConcentration: 0.68,
        revenueInequality: 1.46,
        smallVsBigCompetitiveness: 0.92
      },
      proposed: {
        parityIndex: 8.3,
        taxConcentration: 0.67,
        revenueInequality: 1.43,
        smallVsBigCompetitiveness: 0.95
      },
      delta: {
        parityIndex: -0.1,
        taxConcentration: -0.01,
        revenueInequality: -0.03,
        smallVsBigCompetitiveness: 0.03
      },
      explanation: [
        "This early draft mainly improves retention confidence in small markets.",
        "The placeholder diff needs a cleaner schema before it should move forward."
      ]
    },
    voteTally: {
      yes: 0,
      no: 0
    }
  }
];

export const activityFeed: DemoActivity[] = [
  {
    id: "activity-1",
    title: "Voting opened on revenue sharing proposal",
    summary: "Students are now voting on a rules change that would expand revenue sharing next season.",
    timestamp: "2 hours ago",
    href: "/proposals/expand-revenue-sharing",
    type: "proposal"
  },
  {
    id: "activity-2",
    title: "New strategy archive entry filed for Red Mesa",
    summary: "The Surveyors' three-year retention roadmap was added to the strategy archive.",
    timestamp: "Yesterday",
    href: "/projects/surveyors-retention-roadmap",
    type: "project"
  },
  {
    id: "activity-3",
    title: "Commissioner amended top-band tax proposal",
    summary: "The commissioner approved the concept but merged it into one pending next-season ruleset.",
    timestamp: "2 days ago",
    href: "/proposals/raise-top-tax-band",
    type: "decision"
  },
  {
    id: "activity-4",
    title: "Issue board updated: small-market retention",
    summary: "The issue moved to in-review after two linked team plans identified similar retention pressure.",
    timestamp: "3 days ago",
    href: "/issues/small-market-retention",
    type: "issue"
  }
];

export const accessPreview = {
  commissioner: {
    name: "Commissioner Avery",
    role: "ADMIN",
    note: "Runs voting windows, decisions, and season advancement."
  },
  students: [
    { name: "Riya Patel", role: "STUDENT", note: "Tool builder and policy analyst." },
    { name: "Eva Quinn", role: "STUDENT", note: "Strategic operator with a small-market focus." },
    { name: "Mika Torres", role: "STUDENT", note: "Policy reform architect studying apron behavior." }
  ]
};

export function getTeam(teamId: string) {
  return teams.find((team) => team.id === teamId);
}

export function getIssue(issueId: string) {
  return issues.find((issue) => issue.id === issueId);
}

export function getProject(projectId: string) {
  return projects.find((project) => project.id === projectId);
}

export function getProposal(proposalId: string) {
  return proposals.find((proposal) => proposal.id === proposalId);
}

export function getRuleSet(ruleSetId: string) {
  return ruleSets.find((ruleSet) => ruleSet.id === ruleSetId);
}

export function getProjectsForIssue(issueId: string) {
  return projects.filter((project) => project.issueIds.includes(issueId));
}

export function getProjectsForTeam(teamId: string) {
  return projects.filter((project) => project.teamId === teamId);
}

export function getProposalsForIssue(issueId: string) {
  return proposals.filter((proposal) => proposal.issueId === issueId);
}

export function getIssuesForTeam(teamId: string) {
  return issues.filter((issue) => issue.teamId === teamId || teams.find((team) => team.id === teamId)?.linkedIssueIds.includes(issue.id));
}

export function getTopTaxTeams() {
  return [...teams].sort((a, b) => b.taxPaid - a.taxPaid).slice(0, 3);
}

export function getToolRegistry() {
  return projects.filter((project) => project.projectType === "TOOL");
}

export function getStrategyArchive(teamId?: string) {
  return projects.filter(
    (project) => project.projectType === "STRATEGY" && (teamId ? project.teamId === teamId : true)
  );
}
