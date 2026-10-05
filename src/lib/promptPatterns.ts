/**
 * Per-variable overrides. Anything omitted is derived from the variable's name,
 * so this stays sparse and only carries what a name cannot say on its own.
 */
export interface VariableHint {
  /** Field label. Derived from the name when omitted ("template_structure"
   *  becomes "Template structure"). */
  label?: string;
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean;
  placeholder?: string;
  /** Textarea height. Ignored when `multiline` is false. */
  rows?: number;
}

export interface PromptPattern {
  name: string;
  /** Contains `{variable}` slots. Its tokens are the single source of truth for
   *  which fields the form shows and in what order. */
  template: string;
  /** Keyed by variable name. A key whose slot is gone from `template` is never
   *  read, so a stale one is inert rather than a source of drift. */
  variables?: Record<string, VariableHint>;
  description: string;
}

/** A variable resolved for display: derived name plus merged hints and defaults. */
export interface TemplateVariable extends Required<VariableHint> {
  name: string;
}

const DEFAULT_ROWS = 3;

/**
 * Reads the `{variable}` slots out of a template, in order of first appearance.
 *
 * A slot repeated in the template (`{domain}` appears twice in the guardrail
 * pattern) yields one variable, positioned where it first occurs. Order is what
 * the form stacks fields in, so it comes from the template rather than from an
 * object key order or a hand-maintained list that could disagree with it.
 */
export function extractVariables(template: string): string[] {
  const names: string[] = [];
  // Built per call rather than shared at module scope: a module-level regex
  // carrying `g` keeps a lastIndex between uses, and reusing it across calls
  // would silently skip tokens.
  for (const match of template.matchAll(/\{([a-z_][a-z0-9_]*)\}/g)) {
    const name = match[1];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/** Turns a snake_case variable name into a readable field label. */
export function humanize(name: string): string {
  const words = name.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The fields a pattern's form should render: template order, with hints merged
 * over derived defaults.
 */
export function resolveVariables(pattern: PromptPattern): TemplateVariable[] {
  return extractVariables(pattern.template).map((name) => {
    const hint = pattern.variables?.[name] ?? {};
    return {
      name,
      label: hint.label ?? humanize(name),
      multiline: hint.multiline ?? false,
      placeholder: hint.placeholder ?? "",
      rows: hint.rows ?? DEFAULT_ROWS,
    };
  });
}

/**
 * The built-in prompt patterns.
 *
 * Keyed by id so a prompt can name the pattern it came from, and listed in
 * insertion order, which is the order the picker shows them in.
 *
 * `temperature` was dropped: the extension only builds prompt text and never
 * calls a model, so there was nothing for it to configure.
 */
export const PROMPT_PATTERNS: Record<string, PromptPattern> = {
  meta_prompt: {
    name: "Meta-Prompt Pattern",
    template: `Write a prompt for an LLM that will {objective}.

The prompt should include:
- A specific role/persona
- Clear constraints and output format
- 2-3 few-shot examples
- Edge case handling

Optimize the prompt for {metric}.
Target model: {model}.`,
    variables: {
      objective: {
        multiline: true,
        placeholder: "summarise a support ticket into a one-line title",
      },
      metric: { placeholder: "accuracy" },
      model: { placeholder: "gpt-5" },
    },
    description: "Uses the LLM to generate optimized prompts for other tasks",
  },

  persona: {
    name: "Persona Pattern",
    template: `You are {role} with {experience}.
Your communication style is {style}.
You prioritize {priority}.

{task}`,
    variables: {
      task: {
        multiline: true,
        placeholder: "Write a release announcement for our 2.0 launch.",
      },
    },
    description:
      "Activates a specific expert distribution in the model's training data",
  },

  few_shot: {
    name: "Few-Shot Pattern",
    template: `Here are examples of the expected input/output format:

{examples}

Now process this input:
{input}`,
    variables: {
      examples: {
        multiline: true,
        rows: 5,
        placeholder: "Input: What is a mutex?\nOutput: A lock…",
      },
      input: { multiline: true, placeholder: "What is a semaphore?" },
    },
    description:
      "Provides concrete examples to anchor the output format and style",
  },

  chain_of_thought: {
    name: "Chain-of-Thought Pattern",
    template: `Think through this step by step.

Problem: {problem}

Steps:
1. Identify the key components
2. Analyze each component
3. Synthesize your findings
4. State your conclusion

Show your reasoning before giving the final answer.`,
    variables: {
      problem: {
        multiline: true,
        placeholder: "Our p99 latency tripled after last week's deploy.",
      },
    },
    description: "Forces explicit reasoning steps before the final answer",
  },

  template_fill: {
    name: "Template Fill Pattern",
    template: `Extract information from the following text and fill in the template.

Text: {text}

Template:
{template_structure}

Fill in every field. If information is not available, write 'N/A'.`,
    variables: {
      text: { multiline: true, rows: 5, placeholder: "Paste the source text…" },
      template_structure: {
        multiline: true,
        rows: 5,
        placeholder:
          "Company: {name}\nContract value: {amount}\nStart date: {date}",
      },
    },
    description: "Constrains output to a specific structure with named fields",
  },

  critique: {
    name: "Critique Pattern",
    template: `Task: {task}

Step 1: Generate an initial response.
Step 2: Critique your response for accuracy, completeness, and clarity.
Step 3: Produce an improved final version.

Label each step clearly.`,
    variables: {
      task: { multiline: true, placeholder: "Draft a reply to this customer." },
    },
    description:
      "Self-refinement through explicit critique before final output",
  },

  guardrail: {
    name: "Guardrail Pattern",
    template: `You are a {role}.

Rules:
- ONLY answer questions about {domain}
- If the question is outside {domain}, say: 'This is outside my scope.'
- NEVER make up information. If unsure, say 'I don't know.'
- {additional_rules}

User question: {question}`,
    variables: {
      role: { placeholder: "billing support agent" },
      domain: { placeholder: "invoices and refunds" },
      additional_rules: {
        multiline: true,
        placeholder: "Escalate anything over $500 to a human.",
      },
      question: { multiline: true, placeholder: "Why was I charged twice?" },
    },
    description:
      "Constrains the model to a specific domain with explicit boundaries",
  },

  decomposition: {
    name: "Decomposition Pattern",
    template: `Problem: {problem}

Break this into sub-problems:
1. List each sub-problem
2. Solve each independently
3. Combine sub-solutions into a final answer
4. Verify the final answer against the original problem\n`,
    variables: {
      problem: {
        multiline: true,
        placeholder: "Migrating 40k rows from Postgres to DynamoDB.",
      },
    },
    description: "Breaks complex problems into manageable pieces",
  },

  audience_adapt: {
    name: "Audience Adaptation Pattern",
    template: `Explain {concept} for the following audience: {audience}.

Constraints:
- Use vocabulary appropriate for {audience}
- Length: {length}
- Include {include}
- Exclude {exclude}`,
    variables: {
      concept: { placeholder: "database indexes" },
      audience: { placeholder: "a new frontend developer" },
      length: { placeholder: "3 paragraphs" },
      include: { multiline: true, placeholder: "a worked example" },
      exclude: { multiline: true, placeholder: "mathematical notation" },
    },
    description: "Adapts explanation complexity to the target audience",
  },

  boundary: {
    name: "Boundary Pattern",
    template: `You are an assistant that ONLY handles {scope}.

If the user's request is within scope, help them fully.
If the user's request is outside scope, respond exactly with:
'{refusal_message}'

Do not attempt to answer out-of-scope questions.

User: {user_input}`,
    variables: {
      scope: {
        multiline: true,
        placeholder: "appointments: booking, rescheduling, and cancelling",
      },
      refusal_message: {
        multiline: true,
        placeholder: "I can only help with appointments.",
      },
      user_input: {
        multiline: true,
        placeholder: "What's the capital of Peru?",
      },
    },
    description: "Hard boundary on what the model will and will not respond to",
  },
};

/** A pattern paired with its id, in the order the picker lists them. */
export function listPatterns(): { id: string; pattern: PromptPattern }[] {
  return Object.entries(PROMPT_PATTERNS).map(([id, pattern]) => ({
    id,
    pattern,
  }));
}
