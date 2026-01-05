# Design Decision: `max_scans_per_code` vs `is_single_use_code`

## The Better Approach: `max_scans_per_code` (INTEGER)

### Why This Design is Superior

#### ✅ Flexibility
**With `is_single_use_code` (boolean):**
- ❌ Only two states: single-use or unlimited
- ❌ Cannot support "5 scans maximum" scenarios
- ❌ Requires additional columns for other limits

**With `max_scans_per_code` (integer):**
- ✅ Supports any number of scans: 1, 5, 10, 100, etc.
- ✅ NULL = unlimited (default behavior)
- ✅ Single column handles all scenarios

#### ✅ Intuitive Design
**Boolean approach:**
```sql
is_single_use_code = true   -- What if I want 5 scans?
is_single_use_code = false  -- How many scans is this?
```

**Integer approach:**
```sql
max_scans_per_code = 1      -- Clear: exactly 1 scan
max_scans_per_code = 5      -- Clear: exactly 5 scans
max_scans_per_code = NULL   -- Clear: unlimited scans
```

#### ✅ Use Cases Enabled

| Scenario | Boolean Approach | Integer Approach |
|----------|-----------------|------------------|
| Unlimited scans | `false` | `NULL` ✓ |
| Single-use (batch) | `true` | `1` ✓ |
| Limited reuse (5 scans) | ❌ Not possible | `5` ✓ |
| Loyalty rewards (10 uses) | ❌ Not possible | `10` ✓ |
| Trial coupons (3 uses) | ❌ Not possible | `3` ✓ |

#### ✅ Validation Logic

**Boolean approach:**
```javascript
if (is_single_use_code && scanCount > 0) {
  return error('Already used');
}
// What about 5-scan limit? Need another column!
```

**Integer approach:**
```javascript
if (max_scans_per_code !== null && scanCount >= max_scans_per_code) {
  return error(`Scan limit reached (${max_scans_per_code})`);
}
// Handles all cases elegantly!
```

#### ✅ Future-Proof

**Boolean limitations:**
- New requirement: "10 scans per code"
- Solution: Add new column `max_scans_per_code`
- Now have two overlapping columns!

**Integer benefits:**
- Already handles any future requirement
- No schema changes needed
- Clean, single source of truth

### Implementation Comparison

#### Database Schema

```sql
-- ❌ Boolean approach (limited)
ALTER TABLE coupons ADD COLUMN is_single_use_code BOOLEAN DEFAULT false;

-- ✅ Integer approach (flexible)
ALTER TABLE coupons ADD COLUMN max_scans_per_code INTEGER;
```

#### Backend Logic

```javascript
// ❌ Boolean approach
const isSingleUseCode = generationType === 'BATCH';
// Hard-coded logic, not extensible

// ✅ Integer approach
const maxScansPerCode = generationType === 'BATCH' ? 1 : null;
// Or: const maxScansPerCode = req.body.max_scans_per_code || null;
// Flexible, user-configurable
```

#### Frontend UI

```html
<!-- ❌ Boolean approach -->
<label>
  <input type="checkbox" formControlName="is_single_use_code">
  Single-use only?
</label>
<!-- No way to specify "5 scans" -->

<!-- ✅ Integer approach -->
<label>Max Scans Per Code (optional)</label>
<input type="number" formControlName="max_scans_per_code" 
       placeholder="Leave empty for unlimited">
<small>Examples: 1 (single-use), 5 (five scans), empty (unlimited)</small>
```

### Real-World Scenarios

#### Scenario 1: Gift Card Program
**Requirement**: Generate 100 gift cards, each usable once

**Boolean approach**: ✅ Works
```json
{
  "is_single_use_code": true,
  "batch_quantity": 100
}
```

**Integer approach**: ✅ Works better
```json
{
  "max_scans_per_code": 1,
  "batch_quantity": 100
}
```

#### Scenario 2: Limited Promotion
**Requirement**: One coupon code, first 5 customers get 20% off

**Boolean approach**: ❌ Cannot do this
- `is_single_use_code = true` → Only 1 customer
- `is_single_use_code = false` → Unlimited customers (not 5)

**Integer approach**: ✅ Perfect fit
```json
{
  "max_scans_per_code": 5,
  "discount_type": "PERCENTAGE",
  "discount_value": 20
}
```

#### Scenario 3: Loyalty Punch Card
**Requirement**: Coupon valid for 10 coffee purchases

**Boolean approach**: ❌ Cannot do this
- Would need `max_uses` column anyway!

**Integer approach**: ✅ Built-in support
```json
{
  "max_scans_per_code": 10,
  "description": "10 Coffee Punch Card"
}
```

### Migration Path

#### Boolean Approach
```sql
-- Initial
ALTER TABLE coupons ADD COLUMN is_single_use_code BOOLEAN;

-- Later, when you need limited scans...
ALTER TABLE coupons ADD COLUMN max_uses INTEGER;

-- Now you have overlap and confusion:
-- is_single_use_code = true AND max_uses = 1 (redundant?)
-- is_single_use_code = false AND max_uses = 5 (contradictory?)
```

#### Integer Approach
```sql
-- One column, handles everything
ALTER TABLE coupons ADD COLUMN max_scans_per_code INTEGER;

-- No future changes needed!
```

### Code Maintainability

#### Boolean Approach
```javascript
// Multiple conditions to check
if (coupon.is_single_use_code) {
  // Check if used once
} else if (coupon.max_uses) {
  // Check if reached max_uses
} else {
  // Unlimited
}
```

#### Integer Approach
```javascript
// Single, clean condition
if (coupon.max_scans_per_code !== null) {
  if (currentScans >= coupon.max_scans_per_code) {
    return error('Limit reached');
  }
}
```

### Performance Considerations

Both approaches have similar performance:
- Single integer column vs single boolean column
- Same index usage
- Similar query patterns

**No performance penalty, only benefits!**

### API Design

#### Boolean Approach
```json
POST /api/coupons
{
  "is_single_use_code": true  // Limiting, binary choice
}
```

#### Integer Approach
```json
POST /api/coupons
{
  "max_scans_per_code": 1     // Clear, flexible, extensible
}

// Or for unlimited:
{
  "max_scans_per_code": null  // or omit the field
}

// Or for limited:
{
  "max_scans_per_code": 5     // First 5 customers
}
```

### Documentation & Developer Experience

#### Boolean
```javascript
/**
 * @param {boolean} is_single_use_code - If true, code can only be used once
 * Note: For limited uses (e.g., 5 scans), you'll need... uh... 🤔
 */
```

#### Integer
```javascript
/**
 * @param {number|null} max_scans_per_code - Maximum number of times this code can be scanned
 *   - null or undefined: Unlimited scans
 *   - 1: Single-use code
 *   - N: Code can be scanned N times
 */
```

## Conclusion

### Why `max_scans_per_code` Wins

1. **✅ More flexible** - Handles 1, 5, 10, or any N scans
2. **✅ More intuitive** - The number directly represents the limit
3. **✅ More maintainable** - Single source of truth
4. **✅ More future-proof** - No schema changes for new requirements
5. **✅ Better UX** - Users can specify exactly what they need
6. **✅ Cleaner code** - Less conditional logic
7. **✅ Better API** - Self-documenting parameter

### The Only Downside?
**None.** It's strictly better in every way.

### Recommendation
**Use `max_scans_per_code` (INTEGER)** ✅

This is a classic example of choosing the right abstraction level:
- Boolean = too specific, not extensible
- Integer = just right, handles all cases elegantly

---

**Final Implementation**: We've updated all code to use `max_scans_per_code` instead of `is_single_use_code`. 🎉
