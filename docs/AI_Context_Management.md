# AI Context & Tool Execution Management

## 1. Principles of Context Management

When connecting LLMs like Claude Desktop to external APIs through the Model Context Protocol, proper context management is critical to maintain fast reasoning, low token overhead, and safe execution.

1. **Structured Data over Unbounded Dumps**:
   The BAKEBERRY MCP tools never dump unparsed database JSON. Responses are parsed, filtered, and formatted as concise, human-readable markdown blocks.

2. **Data vs Instruction Separation**:
   API responses are returned purely as text content blocks. User prompts cannot tamper with tool responses, and backend errors are returned as explicit error objects rather than unhandled tracebacks.

3. **No Phantom State**:
   The MCP server acts as an adapter, not an independent state store. All live stock counts, reserved booking slots, and active cake status come directly from the underlying Express API and MongoDB database.

4. **Preserving Deterministic Business Rules**:
   - Timezone calculations are handled deterministically in the MCP layer using `Intl.DateTimeFormat` with `Asia/Kolkata`.
   - The 3-day minimum advance notice rule is explicitly calculated so that the LLM is informed of the earliest permissible booking date upfront.

## 2. Token Optimization Strategies

- **Catalog Pagination**: `get_available_cakes` defaults to 12 items and accepts a `limit` argument to prevent huge payloads from overwhelming the LLM context window.
- **Variant Filtering**: Only active variants are returned; inactive or discontinued variants are excluded at the API layer.
- **Selective Order Serialization**: Only customer-facing order information (status, fulfillment date/slot, line items, delivery address) is returned in `get_order_status`, omitting internal hashes or tokens.

