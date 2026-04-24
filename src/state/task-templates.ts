import type { IGoalClassifier } from "../ports/goal-classifier.js";

export type DomainKind =
  | "migration"
  | "new-feature"
  | "refactor"
  | "infrastructure"
  | "research"
  | "default";

export interface TaskTemplate {
  suffix: string;
  type: "repo" | "tech" | "business" | "synthesis";
  title: string;
  summary: string;
  acceptance: string[];
  open_questions: string[];
}

const TEMPLATES: Record<DomainKind, TaskTemplate[]> = {
  migration: [
    {
      suffix: "repo",
      type: "repo",
      title: "Map current implementation coupling and migration surface",
      summary: "Identify all touchpoints, dependencies, and contracts that need to change.",
      acceptance: [
        "Entry points, public contracts, and internal coupling are listed",
        "Files and modules that must change are identified",
        "Shared state and persistence boundaries are documented",
      ],
      open_questions: [
        "Which modules have the largest coupling to the current implementation?",
        "Are there any runtime-specific APIs with no direct equivalent in the target?",
      ],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research target platform constraints and migration tradeoffs",
      summary: "Evaluate the target stack, compatibility concerns, and migration risks.",
      acceptance: [
        "Target framework candidates are compared",
        "Compatibility gaps are documented with version or API evidence",
        "Migration order risks are identified",
      ],
      open_questions: [
        "Does the target platform support all required runtime behaviors?",
        "What migration tooling or shims exist for the transition?",
      ],
    },
    {
      suffix: "business",
      type: "business",
      title: "Clarify rollout risk, stakeholder impact, and migration sequencing",
      summary: "Document delivery constraints, rollout phases, and operational risk.",
      acceptance: [
        "Rollout phases and cutover strategy are documented",
        "Stakeholder and user-facing impact is assessed",
        "Operational risk and fallback options are identified",
      ],
      open_questions: [
        "Is a parallel-run period required before full cutover?",
        "Who approves the migration go/no-go decision?",
      ],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize migration findings into a phased execution plan",
      summary: "Converge discovery into ordered, low-risk delivery slices.",
      acceptance: [
        "Migration slices are ordered by dependency and risk",
        "Each slice delivers vertical value and can be verified independently",
        "Rollback criteria are defined per slice",
      ],
      open_questions: [],
    },
  ],

  "new-feature": [
    {
      suffix: "repo",
      type: "repo",
      title: "Map existing codebase patterns and integration points for the feature",
      summary: "Understand current architecture, conventions, and where the feature fits.",
      acceptance: [
        "Relevant modules, data models, and API boundaries are identified",
        "Existing patterns and conventions are documented",
        "Integration seams for the new feature are located",
      ],
      open_questions: [
        "Are there existing abstractions the feature should extend rather than replace?",
        "Which tests cover the areas this feature will touch?",
      ],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research technical options and external dependencies for the feature",
      summary: "Identify libraries, APIs, or protocols needed and compare tradeoffs.",
      acceptance: [
        "External dependencies are evaluated with version and license notes",
        "Technical tradeoffs between implementation options are documented",
        "Performance or security implications are noted",
      ],
      open_questions: [
        "Are there open-source libraries that already solve this problem well?",
        "What are the scaling constraints for this feature?",
      ],
    },
    {
      suffix: "business",
      type: "business",
      title: "Clarify acceptance criteria, rollout scope, and stakeholder expectations",
      summary: "Define what done looks like from the product and operational perspective.",
      acceptance: [
        "User-facing acceptance criteria are defined",
        "Rollout scope and feature flag strategy are documented",
        "Observability requirements are identified",
      ],
      open_questions: [
        "Is a gradual rollout or feature flag required?",
        "What are the success metrics for this feature?",
      ],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize feature scope into vertical delivery slices",
      summary: "Converge discovery into independently shippable slices.",
      acceptance: [
        "Slices are vertical and each delivers observable value",
        "Each slice has defined acceptance checks",
        "Dependencies between slices are explicit",
      ],
      open_questions: [],
    },
  ],

  refactor: [
    {
      suffix: "repo",
      type: "repo",
      title: "Map current implementation structure and refactor scope",
      summary: "Identify the code that needs to change, callers, and test coverage.",
      acceptance: [
        "Modules, classes, and functions in scope are listed",
        "Call sites and consumers of affected APIs are documented",
        "Test coverage gaps relevant to the refactor are identified",
      ],
      open_questions: [
        "Are there callers outside this repository that depend on the current interface?",
        "What test harness exists that can protect the refactor?",
      ],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research patterns and tools relevant to the refactor",
      summary: "Evaluate design patterns, tools, and benchmarks that apply.",
      acceptance: [
        "Target patterns or abstractions are documented with rationale",
        "Any tooling (codemods, linters, type checkers) is evaluated",
      ],
      open_questions: [
        "Does an automated codemod exist for any part of this refactor?",
      ],
    },
    {
      suffix: "business",
      type: "business",
      title: "Assess risk, rollout approach, and observability for the refactor",
      summary: "Document risk, backward compatibility concerns, and release strategy.",
      acceptance: [
        "Backward compatibility requirements are documented",
        "Risk of regression to callers is assessed",
        "Rollout strategy is defined",
      ],
      open_questions: [
        "Does this refactor require a deprecation period or a versioned rollout?",
      ],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize refactor scope into safe, incremental delivery slices",
      summary: "Converge findings into ordered slices that minimize regression risk.",
      acceptance: [
        "Slices are ordered to reduce blast radius at each step",
        "Each slice leaves the system in a working state",
        "Test strategy per slice is defined",
      ],
      open_questions: [],
    },
  ],

  infrastructure: [
    {
      suffix: "repo",
      type: "repo",
      title: "Map current infrastructure configuration and service dependencies",
      summary: "Identify existing infra code, config files, and service contracts.",
      acceptance: [
        "Relevant infrastructure files and environments are identified",
        "Service dependencies and network topology are documented",
        "Operational constraints are listed",
      ],
      open_questions: [
        "Which environments will be affected by this change?",
        "Are there manual steps or approvals in the current deployment process?",
      ],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research infrastructure options, tooling, and platform constraints",
      summary: "Evaluate cloud services, IaC tools, and platform-specific requirements.",
      acceptance: [
        "Infrastructure options are compared with cost and operational tradeoffs",
        "Platform quotas or compliance constraints are documented",
        "Relevant tools and their maturity are assessed",
      ],
      open_questions: [
        "Are there existing IaC modules or patterns already in use?",
        "What are the recovery-time requirements for this infrastructure?",
      ],
    },
    {
      suffix: "business",
      type: "business",
      title: "Clarify availability requirements, cost impact, and change approval process",
      summary: "Document SLA requirements, budget constraints, and change management.",
      acceptance: [
        "Availability and recovery objectives are documented",
        "Cost impact is estimated",
        "Change approval and rollback procedures are defined",
      ],
      open_questions: [
        "Is a maintenance window required?",
        "Who holds the final approval for infrastructure changes in production?",
      ],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize infrastructure changes into staged delivery slices",
      summary: "Converge findings into safe, testable infrastructure change slices.",
      acceptance: [
        "Each slice is independently deployable and verifiable",
        "Rollback procedure is defined per slice",
        "Acceptance tests or smoke checks are specified",
      ],
      open_questions: [],
    },
  ],

  research: [
    {
      suffix: "repo",
      type: "repo",
      title: "Map repository state relevant to the research question",
      summary: "Gather existing evidence and prior decisions from the codebase.",
      acceptance: [
        "Relevant code, comments, and prior decisions are identified",
        "Evidence gaps are noted",
      ],
      open_questions: [],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research external evidence and prior art for the question",
      summary: "Survey external sources, specs, and benchmarks relevant to the topic.",
      acceptance: [
        "Key references are cited with dates and version information",
        "Conflicting evidence or open debates are noted",
      ],
      open_questions: [],
    },
    {
      suffix: "business",
      type: "business",
      title: "Clarify scope, constraints, and decision criteria for the research",
      summary: "Define what a satisfactory answer looks like and who needs it.",
      acceptance: [
        "Decision criteria and audience are documented",
        "Out-of-scope topics are identified",
      ],
      open_questions: [],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize research findings into a recommendation",
      summary: "Converge evidence into a clear recommendation or decision.",
      acceptance: [
        "A recommendation is stated with supporting rationale",
        "Key assumptions and limitations are documented",
      ],
      open_questions: [],
    },
  ],

  default: [
    {
      suffix: "repo",
      type: "repo",
      title: "Map repository facts and current implementation boundaries",
      summary: "Gather repository-local evidence for the goal.",
      acceptance: ["Relevant modules and constraints are mapped"],
      open_questions: [],
    },
    {
      suffix: "tech",
      type: "tech",
      title: "Research technical feasibility and platform constraints",
      summary: "Gather external technical evidence required by the goal.",
      acceptance: ["Technical tradeoffs and constraints are documented"],
      open_questions: [],
    },
    {
      suffix: "business",
      type: "business",
      title: "Clarify business impact, rollout, and stakeholder concerns",
      summary: "Capture business and delivery implications for the goal.",
      acceptance: ["Business assumptions and rollout concerns are documented"],
      open_questions: [],
    },
    {
      suffix: "synthesis",
      type: "synthesis",
      title: "Synthesize research into slices and execution order",
      summary: "Converge the planner tracks into executable delivery slices.",
      acceptance: ["Execution slices are proposed with dependencies and acceptance checks"],
      open_questions: [],
    },
  ],
};

const MIGRATION_KEYWORDS = ["migrat", "port", "replac", "conver", "rewrite", "upgrade"];
const NEW_FEATURE_KEYWORDS = ["add", "implement", "build", "create", "introduce", "new"];
const REFACTOR_KEYWORDS = ["refactor", "restructur", "reorganiz", "clean", "simplif", "extract"];
const INFRA_KEYWORDS = ["deploy", "infrastructure", "infra", "ci", "cd", "pipeline", "cloud", "kubernetes", "docker", "terraform", "provision"];
const RESEARCH_KEYWORDS = ["research", "evaluat", "compare", "analyz", "investigat", "assess", "audit", "spike"];

export function classifyGoal(goal: string): DomainKind {
  const lower = goal.toLowerCase();
  if (MIGRATION_KEYWORDS.some((kw) => lower.includes(kw))) return "migration";
  if (INFRA_KEYWORDS.some((kw) => lower.includes(kw))) return "infrastructure";
  if (REFACTOR_KEYWORDS.some((kw) => lower.includes(kw))) return "refactor";
  if (RESEARCH_KEYWORDS.some((kw) => lower.includes(kw))) return "research";
  if (NEW_FEATURE_KEYWORDS.some((kw) => lower.includes(kw))) return "new-feature";
  return "default";
}

export function getTaskTemplates(goal: string): TaskTemplate[] {
  return TEMPLATES[classifyGoal(goal)];
}

export class KeywordClassifier implements IGoalClassifier {
  getTemplates(goal: string): TaskTemplate[] {
    return getTaskTemplates(goal);
  }
}

export const defaultGoalClassifier: IGoalClassifier = new KeywordClassifier();
