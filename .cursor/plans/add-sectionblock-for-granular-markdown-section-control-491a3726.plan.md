<!-- 491a3726-b9d6-41ff-af24-66390494e8ad ebb23e70-ba1b-46c1-8719-7753590d6087 -->
# Add SectionBlock for Granular Markdown Section Control

## Problem

Currently, content from the title through "Blockchain-Based Command and Control" gets grouped into a single `MarkdownBlock`, preventing granular formatting control over intermediate section headers like "## Technical Investigation" or "### Attacker Background and Profile".

## Solution

Introduce a `SectionBlock` component that explicitly separates section headings from their content, following the pattern of existing specialized components (`DefinitionListComponent`, `MitreAttackChainComponent`, `SourcesComponent`).

## Implementation Steps

### 1. Add SectionBlock Schema (`src/open_deep_research/schemas.py`)

Insert new `SectionBlock` class after `MarkdownBlock` (around line 13) and before `DefinitionListItem`:

```python
# Block Type 1.5: Semantic Section with Explicit Heading

class SectionBlock(BaseModel):
    """
    Represents a document section with an explicit heading and content.
    This allows granular control over section-level formatting and styling.
    Use this for any content section that has a markdown heading (# through ######).
    """
    type: Literal["section_block"] = "section_block"
    level: int = Field(..., description="Heading level (1-6, corresponding to h1-h6). Count the number of # symbols in the original markdown.")
    title: str = Field(..., description="The section heading text WITHOUT the markdown # symbols.")
    content: str = Field(..., description="The markdown content under this heading (excluding the heading itself). If a heading has no content before the next heading, use an empty string.")
```

Update `MdxDocument.blocks` union type (line 94) to include `SectionBlock`:

```python
blocks: List[Union[MarkdownBlock, SectionBlock, DefinitionListComponent, MitreAttackChainComponent, SourcesComponent]] = Field(
```

### 2. Update Prompt Instructions (`src/open_deep_research/prompts.py`)

Insert `SectionBlock` as item 2 in the block types list (after `MarkdownBlock`, around line 388), pushing `DefinitionListComponent` to item 3, `MitreAttackChainComponent` to item 4, and `SourcesComponent` to item 5.

Add the following block type description:

````python
2.  **`SectionBlock`**:
    *   This is a **semantic** tool for representing document structure.
    *   You MUST use this block for ANY section that has a markdown heading (# through ######).
    *   **CRITICAL RULE**: Every heading at ANY level (##, ###, ####, etc.) creates a NEW `SectionBlock`.
    *   Extract the heading level by counting the number of # symbols (1-6).
    *   Extract the heading text WITHOUT the # symbols or any trailing #.
    *   The `content` field contains ONLY the text/paragraphs/lists that follow the heading, EXCLUDING any subsequent headings.
    *   The `content` field should NEVER contain markdown headings (no #, ##, ###, etc.) - those become separate blocks.
    *   If a heading has no content before the next heading, use an empty string for `content`.
    
    **Complete Example:** For this markdown input:
    ```markdown
    ## Background
    
    The incident began in early 2025.
    
    ### Attack Vector
    
    Malicious code was injected.
    
    ### Impact Assessment
    
    Over 10,000 systems affected.
    
    ## Recommendations
    
    Implement controls.
    ```
    
    You would create FOUR separate `SectionBlock` entries:
    ```json
    [
      {{
        "type": "section_block",
        "level": 2,
        "title": "Background",
        "content": "The incident began in early 2025."
      }},
      {{
        "type": "section_block",
        "level": 3,
        "title": "Attack Vector",
        "content": "Malicious code was injected."
      }},
      {{
        "type": "section_block",
        "level": 3,
        "title": "Impact Assessment",
        "content": "Over 10,000 systems affected."
      }},
      {{
        "type": "section_block",
        "level": 2,
        "title": "Recommendations",
        "content": "Implement controls."
      }}
    ]
    ```
    
    **Key Points:**
    - Each heading becomes its own block, regardless of level
    - Content NEVER includes headings - only text, lists, images, tables
    - This provides maximum granularity for frontend section-level styling
````

Update instruction #4 (line 463) to prioritize `SectionBlock`:

```python
4.  Use `SectionBlock` for ANY content with a heading. Use `MarkdownBlock` only for content without any headings (e.g., standalone paragraphs between specialized components).
```

### 3. Update Example Documentation (`examples/jsonReportWriterMDXSchema.md`)

Add `SectionBlock` documentation to maintain consistency with the schema documentation, following the same pattern as other block types.

## Design Decisions

- **Granularity**: Split on ALL heading levels (##, ###, ####, etc.) to provide maximum flexibility. The frontend renderer can choose to apply consistent styling if desired, but cannot retroactively split blocks.
- **Priority**: `SectionBlock` takes precedence over `MarkdownBlock` when headings are present, ensuring sections are always explicitly captured.
- **Content nesting**: Lower-level headings are included as raw markdown within parent section content, but can be split into separate blocks if independent formatting is needed.

## Testing

After implementation, test with `examples/sleepyduck.md` to verify:

- Sections are properly split (title → "Incident Overview" → "Technical Investigation" → subsections)
- Heading levels are correctly extracted (1-6)
- Content is preserved without duplication
- Specialized components (DefinitionListComponent, SourcesComponent) still work correctly

### To-dos

- [ ] Add SectionBlock class to schemas.py after MarkdownBlock with level, title, and content fields
- [ ] Update MdxDocument.blocks union type to include SectionBlock in the type list
- [ ] Insert SectionBlock as item 2 in structure_report_mdx_prompt with JSON examples showing level, title, and content extraction
- [ ] Modify instruction #4 to prioritize SectionBlock over MarkdownBlock when headings are present
- [ ] Update examples/jsonReportWriterMDXSchema.md to include SectionBlock documentation