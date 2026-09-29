# Aevo Query AST v1

The query contract is a JSON-serializable, versioned object. It is shared by list pages, search bars, filter builders, saved queries, reports, exports, imports, and future natural-language adapters.

## Query shape

```json
{
  "version": 1,
  "model": "product.product",
  "where": {
    "type": "and",
    "children": [
      { "type": "text", "value": "สกรู" },
      { "type": "condition", "field": "base_price_minor", "operator": "gt", "value": 10000 }
    ]
  },
  "fields": ["name", "sku", "category.name", "base_price_minor"],
  "order_by": [{ "field": "name", "direction": "asc" }],
  "group_by": ["category.name"],
  "aggregates": [
    { "function": "count", "alias": "rows" },
    { "function": "sum", "field": "base_price_minor", "alias": "total_price" }
  ],
  "pagination": { "limit": 80, "offset": 0 }
}
```

`context` is server-owned and must not be trusted when it arrives from a browser. The gateway resolves `organization_id`, optional `store_id`, user, role, permissions, entitlements, and quota separately.

## Node types

- `text`: searches the model's declared `default_search_fields`. One node is one term; whitespace is tokenized before parsing.
- `condition`: applies a declared operator to one declared field.
- `and` / `or`: contain one or more child nodes. Empty groups are invalid.
- `not`: contains exactly one child node.

Supported operators are `contains`, `not_contains`, `starts_with`, `ends_with`, `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`, `is_empty`, `is_not_empty`, `before`, `after`, `on`, `today`, `yesterday`, `this_week`, and `this_month`. The field metadata chooses the allowed subset and value type.

## Text syntax

The parser accepts both natural terms and explicit field expressions:

```text
สกรู AND (ขาว OR ดำ)
name:"สกรู" AND base_price_minor:>10000
stock:<10
```

Bare text becomes a `text` node. `AND`, `OR`, and `NOT` are case-insensitive; parentheses control precedence. A field expression is `field:value`, with optional `>`, `>=`, `<`, `<=`, `=`, or `!=` prefixes. Quoted values may contain spaces. The slash command menu is a UI affordance only; it produces the same AST and is not a separate protocol.

## Validation rules

- `version` must be `1`; `model` must be registered and active.
- Every field, relation path, sort field, group field, and selected output field must exist in metadata and have the corresponding capability.
- Every operator must be supported by the field type and field metadata. Reject type mismatches, unknown operators, empty `in` lists, invalid ranges, and more than 64 nodes.
- `limit` is clamped/rejected outside `1..200`; `offset` must be an integer between `0` and the server's maximum offset.
- Aggregates are limited to declared numeric fields with `aggregate` capability; supported functions are `count`, `sum`, `avg`, `min`, and `max`.
- Select only safe, permission-readable fields. Sensitive fields such as cost, supplier price, and internal notes need an explicit permission code.
- Validate values by declared type before compilation. Values are parameters, never identifier fragments.
- The compiler adds the resolved tenant predicate even if the model query already contains a tenant condition. Store scope is added when the principal is store-scoped.

## Canonical consumers

The same normalized AST is used for:

```text
Search bar / Filter builder / Saved query / Report / Dashboard
                                  │
                                  ▼
                              Query AST
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
               List API        Export job     Import validation
```

Do not store the original search string as the source of truth. It may be retained as display text, but the normalized AST and its version are authoritative.
