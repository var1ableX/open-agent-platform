<!-- f682fefd-d175-460a-914a-ede803b0a9cf 3f69affe-b156-4397-8e46-7db19e1b1a8d -->
# Fix Limitations Component Prompt Instructions

## Problem

The `limitationsComponent` definition in `structure_report_mdx_prompt` has:

1. An incomplete sentence at line 561 ("Use this **specialized tool** *only* for sections that contain")
2. Missing explicit instruction that this component MUST be added as the final block per Global Rule #4, regardless of whether limitation content exists in the markdown
3. No guidance on what to do when limitation content is NOT present in the markdown (which is the expected case)
4. Missing from `SectionBlock` exception list, causing heading + content to be split incorrectly when limitation patterns do appear
5. **Missing from the Instructions section** - no step-by-step reminder to add limitations_component as final block

## Context

The markdown passed to the MDX report writer will NOT contain limitation/disclaimer text (intentionally elided from the markdown generator prompt). Therefore, the `limitationsComponent` must be synthesized as the final block even when no limitation content patterns are present in the input markdown.

## Changes Required

### 1. Strengthen Global Rule #4 (line 382) with explicit disclaimer text

- Replace: "The final piece of content in the JSON should be a `limitations_component` block type."
- With: "**MANDATORY:** The final block in your output MUST be a `limitations_component`, regardless of whether limitation content appears in the input markdown. If limitation content is not present, synthesize a standard disclaimer with title='Important' and content='This content was generated with the assistance of AI and may contain inaccuracies or omissions. Please verify critical information independently.'"

### 2. Update SectionBlock exception rule (line 397)

- Add `limitationsComponent` to the exception list alongside `ControlsTableComponent`, `MitreAttackChainComponent`, and `SourcesComponent`
- This ensures if "Important" heading + content appears (rare case), it gets processed as limitationsComponent, not split into separate blocks

### 3. Complete the incomplete CRITICAL RULE (line 561)

- Replace incomplete sentence: "Use this **specialized tool** *only* for sections that contain"
- With: "Use this **specialized tool** for AI-generated content disclaimers and research limitations. **Per Global Rule #4, this component MUST appear as the final block in your output.**"

### 4. Replace Usage Conditions & Signals (lines 562-563)

- Remove vague pattern matching language
- Replace with: "**MANDATORY FINAL BLOCK:** You MUST add a `limitations_component` as the final block in your JSON output. If limitation content exists in the markdown (rare), extract it. Otherwise (normal case), use the standard disclaimer text specified in Global Rule #4."

### 5. Update Processing Rules / Format Example (lines 564-570)

- Keep the JSON format example
- Add clarification: "When limitation content is not present in the markdown (normal case), use the title and content specified in Global Rule #4."

### 6. Add explicit step to Instructions section (after line 579, before final step)

- Insert new step 7: "**Add limitations_component as final block:** Per Global Rule #4, you MUST end your blocks array with a `limitations_component`. Use the standard disclaimer specified in Global Rule #4 if no limitation content was found in the article."
- Renumber current step 7 to step 8

## Files to Modify

- `open_deep_research/src/open_deep_research/prompts.py` (lines 382, 397, 560-570, 579-580)