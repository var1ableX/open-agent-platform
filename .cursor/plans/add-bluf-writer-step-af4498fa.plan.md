<!-- af4498fa-5ea4-47f9-a41e-1e2130044de9 a69c7ea1-5a8a-4114-b688-6666a1d6e666 -->
# Add BLUF Writer Step to Deep Research Pipeline

## Overview

Implement a new BLUF writer node that processes the MDX-structured report and generates an executive-focused summary. The pipeline will save both the detailed MDX report and the BLUF summary to a consolidated JSON file.

## Implementation Steps

### 1. Create BLUF Pydantic Schemas in `schemas.py`

Add the following schema classes to `/Users/observed/development/open_deep_research/src/open_deep_research/schemas.py`:

- `BlufBlock` - Bottom line summary (2-3 sentences)
- `ActionGroup` - Grouped action items with title and executive summary
- `NowWhatBlock` - Prioritized action groups with intro
- `Implication` - Business-level risk/implication with title and description
- `SoWhatBlock` - Business implications with intro
- `Indicator` - Forward-looking indicator with title and description
- `WhatsNextBlock` - Key indicators to watch
- `BlufDocument` - Top-level schema containing all four blocks

All schemas should use Literal types for the `type` field and include proper Field descriptions.

### 2. Update BLUF Prompt in `prompts.py`

Modify `bluf_writer_base_prompt` in `/Users/observed/development/open_deep_research/src/open_deep_research/prompts.py`:

- Change line 43-44 from `Your *only* input is a JSON object (\`DetailedReport\`)` to reference the actual input structure
- Add input formatting at the beginning to accept the MDX JSON structure as `{mdx_json}`
- Update references throughout the prompt from `DetailedReport` to `MdxDocument` for clarity

### 3. Implement BLUF Writer Node in `bluf_writer.py`

Update `/Users/observed/development/open_deep_research/src/open_deep_research/bluf_writer.py`:

- Import BlufDocument schema and bluf_writer_base_prompt
- Implement `async def bluf_writer(state: AgentState, config: RunnableConfig)` function:
  - Extract `json_report` (MDX output) from state
  - Configure model using `configurable_model.with_structured_output(BlufDocument)`
  - Use `final_report_model` and `final_report_model_max_tokens` from config
  - Format the prompt with the MDX JSON input
  - Handle errors gracefully with try/except
  - Return `{"bluf_report": bluf_json}` to update state

### 4. Create Output Saving Function

Add a new function to `/Users/observed/development/open_deep_research/src/open_deep_research/utils.py`:

- `async def save_consolidated_report(state: AgentState, config: RunnableConfig)`
- Create `output/` directory if it doesn't exist (relative to project root)
- Generate timestamp filename: `{ddmmyyyy_hhmmss}.json`
- Create consolidated structure: `{"detailed_report": json_report, "summary_page": bluf_report}`
- Save to file with proper JSON formatting (indent=2)
- Return empty dict (no state updates needed)

### 5. Update State Definition in `state.py`

Add to `AgentState` in `/Users/observed/development/open_deep_research/src/open_deep_research/state.py`:

```python
bluf_report: Optional[Dict[str, Any]] = None
```

### 6. Integrate BLUF Writer into Graph in `deep_researcher.py`

Update `/Users/observed/development/open_deep_research/src/open_deep_research/deep_researcher.py`:

- Import `bluf_writer` function from `bluf_writer.py`
- Import `save_consolidated_report` from `utils.py`
- Import `BlufDocument` from `schemas.py`
- Add node: `deep_researcher_builder.add_node("bluf_writer", bluf_writer)`
- Add node: `deep_researcher_builder.add_node("save_output", save_consolidated_report)`
- Update edges:
  - Remove: `deep_researcher_builder.add_edge("structure_report_mdx", END)`
  - Add: `deep_researcher_builder.add_edge("structure_report_mdx", "bluf_writer")`
  - Add: `deep_researcher_builder.add_edge("bluf_writer", "save_output")`
  - Add: `deep_researcher_builder.add_edge("save_output", END)`

## Key Implementation Notes

- Use the same model configuration as MDX writer (`final_report_model`)
- Add retry logic using `with_retry(stop_after_attempt=configurable.max_structured_output_retries)`
- Ensure graceful error handling at each step
- Use `state.get("json_report")` to safely access MDX output
- Convert Pydantic models to dicts using `.dict()` or `.model_dump()` for state serialization
- The output folder should be created at the project root level

### To-dos

- [ ] Create BLUF Pydantic schemas (BlufBlock, NowWhatBlock, SoWhatBlock, WhatsNextBlock, BlufDocument) in schemas.py
- [ ] Update bluf_writer_base_prompt in prompts.py to accept MDX JSON input via {mdx_json} placeholder
- [ ] Implement bluf_writer node function in bluf_writer.py with structured output and error handling
- [ ] Create save_consolidated_report function in utils.py to save combined JSON output to output/ folder
- [ ] Add bluf_report field to AgentState in state.py
- [ ] Add bluf_writer and save_output nodes to the LangGraph in deep_researcher.py and update edges