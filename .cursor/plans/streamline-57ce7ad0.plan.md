<!-- 57ce7ad0-d498-4263-9d4c-a3814bca1439 3496d9b3-3372-4f78-b148-98ed5f3e7684 -->
# Streamline BLUF Writer Prompt - Hybrid Approach

## 1. Fix `executive_summary` Misrepresentation

### In `schemas.py` (Line 153)

**Current (incorrect):**

```python
executive_summary: str = Field(..., description="1-2 concise sentences describing the high-level goal of this group's actions.")
```

**Change to:**

```python
executive_summary: str = Field(..., description="1-2 concise sentences that summarize/roll up the action_items in this group.")
```

### In `prompts.py` (Line 698)

**Current (incorrect):**

```
6.  **Synthesize Executive Summary:** After populating the `action_items` for a group, synthesize them into a single `executive_summary` string (1-2 concise sentences) that describes the high-level *goal* of that group's actions.
```

**Change to:**

```
6.  **Synthesize Executive Summary:** After populating the `action_items` for a group, synthesize them into a single `executive_summary` string (1-2 concise sentences) that summarizes/rolls up what those action items involve.
```

## 2. Remove Structural Redundancies from `prompts.py`

### Block 1: `bluf_block` Section (Lines 660-681)

**Remove these redundant processing sub-rules:**

- Line 669: "Read the content from the three 'ingredients' you have identified." (obvious)
- Lines 670-673: The three numbered questions sub-list - this is already clear from the example

**Keep:**

- CRITICAL RULE about synthesis requirement
- Source Ingredients definition (unique semantic guidance)
- The "Synthesize these ingredients to answer three questions" instruction (without the sub-list)
- Output Format Example

### Block 2: `now_what_block` Section (Lines 683-733)

**Remove:**

- Line 689: "1. **Find the Source:** Locate the `controls_table_component` in the input JSON." (obvious)
- Line 690: "This sentence will be placed in its own `intro_sentence` field" (Pydantic defines this)
- Line 696: "These will be `group_title` fields." (Pydantic defines this)
- Line 697: "These will be the `action_items` array." (Pydantic defines this)
- Lines 699-733: The entire "The JSON output for this block **MUST** be in the following format:" section - replace with simpler reference to example

**Keep:**

- CRITICAL RULE about synthesis and prioritization
- Source Ingredients definition
- Processing Rule 2 (Synthesize Advisory Intro) - semantic guidance
- Processing Rule 3 (Analyze and Group) with all heuristics - **critical strategic guidance**
- Processing Rule 4 (Create Group Titles) - tone guidance
- Processing Rule 5 (Synthesize Actions) - transformation guidance
- Processing Rule 6 (Synthesize Executive Summary) - with corrected description

**Replace the verbose "Output Format" section with:**

```
* **Output Format:**
    See the example below for the required JSON structure:
    [keep the JSON example as-is, lines 703-733]
```

### Block 3: `so_what_block` Section (Lines 735-770)

**Remove:**

- Line 743: "1. Read the content from the 'Impact' and 'Analysis' ingredients you have identified." (obvious)
- Lines 744-746: The numbered sub-steps about "First, create..." and "Second, create..." (Pydantic/example covers this)
- Lines 747-770: The verbose "The JSON output for this block **MUST** be in the following format:" section

**Keep:**

- CRITICAL RULE about distilling business implications
- Source Ingredients definition (unique semantic guidance)
- The high-level instruction to "Synthesize this text into the required JSON output structure, following the 'External Advisor' point of view"

**Replace the verbose "Output Format" section with:**

```
* **Output Format:**
    See the example below for the required JSON structure:
    [keep the JSON example as-is, lines 750-770]
```

### Block 4: `whats_next_block` Section (Lines 772-816)

**Remove:**

- Line 781: "1. Read the content from **all** the 'Source Ingredients' you have identified." (obvious)
- Lines 782-785: The bullet point examples (these are already in the Source Ingredients conceptually)
- Lines 786-792: The detailed "Structure the Output" sub-steps with field name declarations
- Lines 793-816: The verbose "The JSON output for this block **MUST** be in the following format:" section

**Keep:**

- CRITICAL RULE about forward-looking forecast
- Source Ingredients definition (all 3 points - unique semantic guidance)
- High-level instruction to "Synthesize this combined data into 2-3 logical, forward-looking indicators"

**Replace removed sections with:**

```
* **Processing Rules:**
    Synthesize the combined source data into 2-3 logical, forward-looking indicators. Each indicator should describe both the signal to monitor and the rationale for why it matters.
* **Output Format:**
    See the example below for the required JSON structure:
    [keep the JSON example as-is, lines 797-816]
```

## 3. Estimated Impact

- **Prompt length reduction:** ~15-20% (from 829 lines to ~680-700 lines)
- **Preserved semantic guidance:** All strategic heuristics, tone principles, source identification, and synthesis instructions remain intact
- **Risk level:** Low - removes only structural redundancy that Pydantic already enforces