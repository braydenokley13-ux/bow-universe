import { prisma } from "../src/lib/prisma";

export const glossaryTerms = [
  // ── Salary Cap ────────────────────────────────────────────────────────────
  {
    slug: "salary-cap",
    term: "Salary Cap",
    definition:
      "A rule that sets the maximum amount of money a team can spend on player salaries in a season. It keeps rich teams from buying all the best players and makes the league more competitive.",
    bowExample:
      "In BOW League Season 4, the salary cap was set at $85M. Teams that wanted to sign expensive superstars had to trade away other players first.",
    category: "Salary Cap",
    sortOrder: 10
  },
  {
    slug: "hard-cap",
    term: "Hard Cap",
    definition:
      "A salary cap that teams are absolutely not allowed to go over — no exceptions. Even if a team is willing to pay a penalty, they still cannot exceed the hard cap limit.",
    bowExample:
      "When the BOW League switched to a hard cap in Season 6, three teams had to release players to get under the limit before the season started.",
    category: "Salary Cap",
    sortOrder: 11
  },
  {
    slug: "soft-cap",
    term: "Soft Cap",
    definition:
      "A salary cap that teams can go over if they pay a luxury tax penalty. Wealthier teams can spend more, but they pay extra money that is often shared with the rest of the league.",
    bowExample:
      "The BOW League uses a soft cap by default. The Eastbank Raptors went $18M over the cap in Season 3 and paid $9M in luxury tax as a result.",
    category: "Salary Cap",
    sortOrder: 12
  },
  {
    slug: "luxury-tax",
    term: "Luxury Tax",
    definition:
      "An extra fee that teams pay when their payroll goes above the salary cap. The money collected is usually shared with lower-spending teams to help balance competition.",
    bowExample:
      "In Season 3, the Westside Wolves paid $4.2M in luxury tax after their payroll reached $96M against a $78M cap. That money was split among the four teams with the lowest payrolls.",
    category: "Salary Cap",
    sortOrder: 13
  },
  {
    slug: "payroll",
    term: "Payroll",
    definition:
      "The total amount of money a team spends on all player salaries combined in one season. This is the number compared against the salary cap.",
    bowExample:
      "The Northgate Knights had the highest payroll in Season 5 at $101M, while the River City Falcons had the lowest at $52M.",
    category: "Salary Cap",
    sortOrder: 14
  },
  {
    slug: "cap-space",
    term: "Cap Space",
    definition:
      "The amount of money a team still has available to sign new players before hitting the salary cap. If cap space is zero or negative, the team is at or over the cap.",
    bowExample:
      "After trading their highest-paid player, the Lakewood Lions created $22M in cap space, which they used to sign two new players in the off-season.",
    category: "Salary Cap",
    sortOrder: 15
  },
  // ── Economics & Revenue ───────────────────────────────────────────────────
  {
    slug: "revenue",
    term: "Revenue",
    definition:
      "All the money a team earns — from ticket sales, merchandise, broadcast deals, and sponsorships. Revenue is different from profit because it does not subtract expenses.",
    bowExample:
      "The Eastbank Raptors earned $140M in revenue in Season 4, making them the highest-earning team in the league that year.",
    category: "Economics",
    sortOrder: 20
  },
  {
    slug: "revenue-sharing",
    term: "Revenue Sharing",
    definition:
      "A system where teams pool some of their income and divide it among all teams. It helps smaller-market teams compete with wealthier ones by giving them extra money.",
    bowExample:
      "The BOW League shares 35% of total league revenue equally. This means even the smallest team receives a check at the end of every season.",
    category: "Economics",
    sortOrder: 21
  },
  {
    slug: "valuation",
    term: "Valuation",
    definition:
      "An estimate of how much a team is worth if you were to buy or sell it. A higher valuation usually means the team earns more money and is more successful.",
    bowExample:
      "After winning three straight championships, the Northgate Knights' valuation grew from $380M to $620M over five seasons.",
    category: "Economics",
    sortOrder: 22
  },
  {
    slug: "profit",
    term: "Profit",
    definition:
      "What remains after you subtract all expenses (like player salaries and stadium costs) from total revenue. A team can earn lots of revenue but still have low profit if expenses are high.",
    bowExample:
      "Even though the Westside Wolves had the largest payroll in Season 5, their high ticket revenue still produced a $12M profit for the season.",
    category: "Economics",
    sortOrder: 23
  },
  {
    slug: "market-size",
    term: "Market Size",
    definition:
      "The size of the city or region where a team plays. Teams in bigger markets usually earn more from tickets and local sponsorships, giving them a financial advantage.",
    bowExample:
      "BOW League researchers found that teams in the top three markets earned 40% more revenue on average than teams in the bottom three markets.",
    category: "Economics",
    sortOrder: 24
  },
  // ── Competitive Balance ───────────────────────────────────────────────────
  {
    slug: "competitive-balance",
    term: "Competitive Balance",
    definition:
      "How even the competition is across all teams in a league. A league with high competitive balance has many different winners and no team dominates for too long.",
    bowExample:
      "A student research proposal showed that after the BOW League introduced revenue sharing, six different teams won the championship over the next eight seasons.",
    category: "Competitive Balance",
    sortOrder: 30
  },
  {
    slug: "parity",
    term: "Parity",
    definition:
      "When teams in a league are roughly equal in talent and resources, so any team could win on a given day. High parity makes games more exciting and unpredictable.",
    bowExample:
      "The BOW League parity index reached its highest point in Season 7, when the gap between the best and worst win percentage was only 18 percentage points.",
    category: "Competitive Balance",
    sortOrder: 31
  },
  {
    slug: "dynasty",
    term: "Dynasty",
    definition:
      "When one team wins championships repeatedly over many seasons. Dynasties can happen when a team has much more money or talent than everyone else.",
    bowExample:
      "The Northgate Knights won four championships in five seasons (Seasons 2–6), which caused other teams to propose new competitive-balance rules.",
    category: "Competitive Balance",
    sortOrder: 32
  },
  {
    slug: "performance-proxy",
    term: "Performance Proxy",
    definition:
      "A number used to represent how well a team performed when a full statistics breakdown is not available. In BOW League, it is calculated from payroll, win rate, and issue pressure.",
    bowExample:
      "After the Lakewood Lions paid less than half the league average payroll, their performance proxy dropped below 40, triggering a league financial alert.",
    category: "Competitive Balance",
    sortOrder: 33
  },
  // ── Rules & Policy ────────────────────────────────────────────────────────
  {
    slug: "ruleset",
    term: "Ruleset",
    definition:
      "The complete set of financial rules that govern the league for a season — including the salary cap, luxury tax rate, revenue sharing percentage, and draft rules.",
    bowExample:
      "The BOW League Ruleset v3 increased the luxury tax rate from 50% to 75% of overages after students argued it would discourage overspending.",
    category: "Rules & Policy",
    sortOrder: 40
  },
  {
    slug: "proposal",
    term: "Proposal",
    definition:
      "A formal request to change one or more league rules. Students write proposals explaining the problem, their evidence, and why their rule change would help the league.",
    bowExample:
      "In Season 5, a student team submitted a proposal to lower the salary cap by $10M per season. The proposal went through a commissioner review and a league-wide vote before passing.",
    category: "Rules & Policy",
    sortOrder: 41
  },
  {
    slug: "amendment",
    term: "Amendment",
    definition:
      "A change made to a proposal during the review process. The commissioner can ask for an amendment if parts of the proposal need to be revised before it can be approved.",
    bowExample:
      "The commissioner requested an amendment to remove a clause about player minimum salaries before approving the Lakewood Lions' cap reform proposal.",
    category: "Rules & Policy",
    sortOrder: 42
  },
  {
    slug: "rule-diff",
    term: "Rule Diff",
    definition:
      "A precise description of which rules would change if a proposal passed, showing the before and after values for each affected setting.",
    bowExample:
      "The rule diff for Proposal 14 showed the cap growth rate changing from 3% to 5% and the luxury tax threshold moving from 100% to 110% of the cap.",
    category: "Rules & Policy",
    sortOrder: 43
  },
  // ── Research & Analysis ───────────────────────────────────────────────────
  {
    slug: "issue",
    term: "Issue",
    definition:
      "A league-wide economic problem that has been identified and flagged for research. Issues have a severity score and become the starting point for student projects and proposals.",
    bowExample:
      "The 'Payroll Inequality Crisis' issue (severity 5) was opened in Season 4 when the gap between the highest and lowest team payrolls exceeded $60M.",
    category: "Research",
    sortOrder: 50
  },
  {
    slug: "evidence",
    term: "Evidence",
    definition:
      "Data, charts, and arguments that support a claim. In BOW League research, students must provide evidence before their proposals advance through the review process.",
    bowExample:
      "A student backed their proposal to raise revenue sharing with three seasons of payroll data showing that low-spending teams had a win rate 30% below the league average.",
    category: "Research",
    sortOrder: 51
  },
  {
    slug: "sandbox",
    term: "Sandbox",
    definition:
      "A simulation tool that lets you test what would happen if league rules were changed — without actually changing them. It shows projected impacts on payroll, revenue, and parity.",
    bowExample:
      "Using the BOW sandbox, a student discovered that raising the cap by 15% would increase luxury tax revenue by $28M but might allow two teams to dominate the league.",
    category: "Research",
    sortOrder: 52
  },
  {
    slug: "simulation",
    term: "Simulation",
    definition:
      "A computerized model that predicts future outcomes based on current rules and team data. BOW League uses simulation to project what would happen if a proposal passed.",
    bowExample:
      "The BOW simulator runs at the end of each season to update team valuations, calculate luxury tax payments, and trigger new issue alerts based on the results.",
    category: "Research",
    sortOrder: 53
  },
  {
    slug: "impact-report",
    term: "Impact Report",
    definition:
      "A summary of how a proposed rule change would affect the league — showing changes to team payrolls, tax revenue, parity, and individual team finances.",
    bowExample:
      "The sandbox impact report for raising revenue sharing from 30% to 45% showed that the bottom three teams would each gain about $8M in additional income.",
    category: "Research",
    sortOrder: 54
  },
  // ── Team Management ───────────────────────────────────────────────────────
  {
    slug: "roster",
    term: "Roster",
    definition:
      "The list of players on a team. In BOW League, roster decisions are simplified — teams manage payroll budgets rather than individual player contracts.",
    bowExample:
      "The River City Falcons restructured their roster before Season 6 to stay under the salary cap, dropping total payroll from $94M to $81M.",
    category: "Team Management",
    sortOrder: 60
  },
  {
    slug: "rebuild",
    term: "Rebuild",
    definition:
      "When a team deliberately spends less money and accepts worse short-term results in order to save money and build toward future success.",
    bowExample:
      "The Southport Storm entered a two-season rebuild in Seasons 4–5, cutting payroll to $48M to gain cap space and boost their performance in Season 7.",
    category: "Team Management",
    sortOrder: 61
  },
  {
    slug: "tax-bill",
    term: "Tax Bill",
    definition:
      "The total amount of luxury tax a team owes at the end of a season based on how much their payroll exceeded the cap.",
    bowExample:
      "The Eastbank Raptors' $22M tax bill in Season 5 was the highest single-season luxury tax payment in BOW League history.",
    category: "Team Management",
    sortOrder: 62
  }
];

export async function seedGlossaryTerms() {
  console.log(`Seeding ${glossaryTerms.length} glossary terms…`);
  for (const term of glossaryTerms) {
    await prisma.glossaryTerm.upsert({
      where: { slug: term.slug },
      update: {
        term: term.term,
        definition: term.definition,
        bowExample: term.bowExample,
        category: term.category,
        sortOrder: term.sortOrder
      },
      create: term
    });
  }
  console.log("Done seeding glossary.");
}

async function main() {
  await seedGlossaryTerms();
}

if (process.argv[1]?.endsWith("seed-glossary.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
