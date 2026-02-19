# Analysis: Infinite Loop When Adding `tagsForSelectedApp$` to combineLatestWith

## The Code That Causes Infinite Loop

```typescript
if (this.isEditMode) {
  this.productsFacade.selectedProduct$
    .pipe(
      takeUntil(this.destroy$),
      filter(product => product !== null),
      combineLatestWith(
        this.templatesFacade.selectedTemplate$,
        this.tagsFacade.tagsForSelectedApp$  // ← THIS CAUSES THE LOOP
      )
    )
    .subscribe(([product, template, tags]) => {
      this.availableTags = tags;
      if (product && template) {
        this.populateFormWithProduct(product);  // ← THIS CALLS loadTags()
      } else if (product && !template && product.template_id) {
        this.templatesFacade.loadTemplate(product.template_id);
      }
    });
}
```

## The Infinite Loop Flow

```
1. combineLatestWith emits initial values
   ↓
2. subscribe() runs
   ↓
3. this.availableTags = tags  (set tags)
   ↓
4. populateFormWithProduct(product) called
   ↓
5. Inside populateFormWithProduct (line 269):
   this.loadTags(product.verification_app_id)
   ↓
6a. IF using TagService directly (current code):
    - HTTP call made
    - Response updates this.availableTags
    - NO state change, NO loop
    ✅ Works fine

6b. IF using TagsFacade (what you tried):
    - this.tagsFacade.loadTags(appId) dispatched
    ↓
7. loadTags action dispatched
   ↓
8. Reducer updates state (tags.reducer.ts:17-22):
   {
     ...state,
     loading: true,
     error: null,
     selectedAppId: appId  // ← STATE CHANGED
   }
   ↓
9. tagsForSelectedApp$ selector emits
   (because state changed - new state object created)
   ↓
10. combineLatestWith triggers again
    ↓
11. subscribe() runs again
    ↓
12. populateFormWithProduct() called again
    ↓
13. loadTags() called again
    ↓
14. Loop repeats → INFINITE LOOP ♾️
```

## Why It Loops - Technical Details

### Cause 1: State Recreation in Reducer

**File:** `tags.reducer.ts:17-22`

```typescript
on(TagsActions.loadTags, (state, { appId }) => ({
  ...state,          // ← Creates NEW state object
  loading: true,
  error: null,
  selectedAppId: appId  // ← Even if same value, new object created
}))
```

**Every time `loadTags` action is dispatched:**
- A **NEW state object** is created (spread operator)
- Even if `selectedAppId` is the same value
- NgRx selectors detect state change
- **`tagsForSelectedApp$` emits**

### Cause 2: Multiple State Updates Per HTTP Call

For a single `loadTags()` call, the state updates **3 times**:

1. **loadTags action** → State changes (loading: true, selectedAppId set)
2. **loadTagsSuccess action** → State changes (tags updated, loading: false)
3. **(Optional) HTTP error** → State changes (error set, loading: false)

Each state change triggers `tagsForSelectedApp$` to emit, causing the subscription to run.

### Cause 3: combineLatestWith Behavior

`combineLatestWith` emits **whenever ANY** of its sources emit:

```typescript
combineLatestWith(template$, tags$)
```

If `tags$` emits → subscription runs → loadTags() called → tags$ emits → **loop**

## Why Subdomain Calls Happen

You mentioned "infinite subdomain calls". This happens because:

### 1. selectedAppId Changes Trigger App Context Updates

**File:** `tags.reducer.ts:21`

```typescript
selectedAppId: appId
```

When `selectedAppId` changes in tags state, if there's any code watching this (like app context service or subdomain middleware), it might trigger subdomain-related logic.

### 2. Possible Connection to AppContextService

If your code has something like this:

```typescript
this.tagsFacade.selectedAppId$.subscribe(appId => {
  this.appContextService.selectApp(appId);  // ← This might trigger subdomain logic
});
```

Then:
- loadTags() → selectedAppId changes → appContext updated → subdomain checked → HTTP calls

### 3. Subdomain Middleware

If you have HTTP interceptors or middleware that check subdomain based on selected app:

```typescript
// In some interceptor
const appId = this.tagsFacade.getSelectedAppId();
const subdomain = getSubdomainForApp(appId);  // ← HTTP call?
```

This could cause additional HTTP requests every time selectedAppId changes.

## Why It Works WITHOUT tagsForSelectedApp$

### Current Working Code:

```typescript
combineLatestWith(this.templatesFacade.selectedTemplate$)  // Only 2 observables
```

**Flow:**
1. product$ and template$ emit
2. subscribe runs
3. populateFormWithProduct() called
4. loadTags() makes HTTP call directly via TagService
5. Response sets `this.availableTags` (component property, NOT state)
6. NO state change → NO selector emission → NO loop ✅

## The Core Problem

**The problem is mixing two approaches:**

1. **Reactive approach**: Using `tagsForSelectedApp$` observable from store
2. **Imperative approach**: Calling `loadTags()` inside subscription

**These two approaches conflict:**

```typescript
// Reactive: "Give me tags whenever they change"
combineLatestWith(tagsForSelectedApp$)

// Imperative: "Load tags now"
.subscribe(() => {
  this.loadTags(appId);  // ← This causes tags to change
})
```

**Result:** The reactive observable triggers when tags change, but the subscription causes tags to change, creating a circular dependency.

## Solutions (Conceptual - NOT Implementing)

### Solution 1: Don't Load Tags Inside Subscription

```typescript
combineLatestWith(template$, tags$)
  .subscribe(([product, template, tags]) => {
    this.availableTags = tags;  // ✅ Just use the tags
    if (product && template) {
      // DON'T call loadTags here
      this.populateFormWithProduct(product);
    }
  });

// Load tags BEFORE or OUTSIDE the subscription
ngOnInit() {
  this.route.params.subscribe(params => {
    if (params['id']) {
      this.productsFacade.loadProduct(params['id']);
    }
  });

  // Load tags based on selected app ONCE
  this.appContextService.appContext$.pipe(take(1)).subscribe(context => {
    this.tagsFacade.loadTags(context.selectedAppId);
  });
}
```

### Solution 2: Use distinctUntilChanged

```typescript
tagsForSelectedApp$.pipe(
  distinctUntilChanged((prev, curr) =>
    JSON.stringify(prev) === JSON.stringify(curr)
  )
)
```

This prevents emission if tags array content hasn't actually changed.

### Solution 3: Conditional Loading with Flag

```typescript
private tagsLoaded = false;

combineLatestWith(template$, tags$)
  .subscribe(([product, template, tags]) => {
    this.availableTags = tags;
    if (product && template) {
      // Only load tags if not already loaded
      if (!this.tagsLoaded) {
        this.loadTags(product.verification_app_id);
        this.tagsLoaded = true;
      }
      this.populateFormWithProduct(product);
    }
  });
```

### Solution 4: Remove loadTags from populateFormWithProduct

```typescript
populateFormWithProduct(product: any): void {
  // ... populate form fields ...

  // DON'T call loadTags here
  // this.loadTags(product.verification_app_id);  // ← REMOVE THIS

  this.cdr.detectChanges();
}
```

And load tags separately, BEFORE setting up the combineLatestWith.

### Solution 5: Use getTagsByAppId Instead

Instead of `tagsForSelectedApp$` which depends on state.selectedAppId, use:

```typescript
// Inside populateFormWithProduct, AFTER getting product:
this.tagsFacade.getTagsByAppId(product.verification_app_id)
  .pipe(take(1))
  .subscribe(tags => {
    this.availableTags = tags;
  });
```

This gives you tags for a specific app without affecting the selectedAppId state.

## Why Current Code Works (Without Facade)

```typescript
// Current loadTags implementation (line 207-218):
loadTags(appId: string): void {
  this.tagService.getAllTags({ app_id: appId })  // ← Direct HTTP, no state change
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.availableTags = response.data.filter(tag => tag.is_active);
        // Sets component property, NOT store state
        // No selector emission, no loop ✅
      }
    });
}
```

**This works because:**
1. HTTP call goes directly through TagService
2. Response updates `this.availableTags` (component property)
3. NO store state is updated
4. NO selectors emit
5. NO loop

## What Happens When You Add tagsForSelectedApp$

### Scenario A: Using TagsFacade.loadTags in populateFormWithProduct

```typescript
populateFormWithProduct(product: any): void {
  // ... other code ...

  // Changed to use facade:
  this.tagsFacade.loadTags(product.verification_app_id);  // ← LOOPS
}
```

**Result:** Infinite loop as described above.

### Scenario B: Just Reading from tagsForSelectedApp$

```typescript
combineLatestWith(template$, tags$)
  .subscribe(([product, template, tags]) => {
    this.availableTags = tags;  // ← Just use the value

    // DON'T call loadTags

    if (product && template) {
      this.populateFormWithProduct(product);
    }
  });
```

But if `populateFormWithProduct` still has `this.loadTags()` call (even with TagService), you'd have:
- Tags loaded via facade → tagsForSelectedApp$ emits → availableTags set
- populateFormWithProduct → loadTags via service → availableTags set again (duplicate)

Not a loop, but redundant calls.

### Scenario C: Tags Not Pre-loaded

If tags aren't loaded before the combineLatestWith:

```typescript
// tagsForSelectedApp$ emits empty array []
combineLatestWith(template$, tags$)
  .subscribe(([product, template, tags]) => {
    this.availableTags = tags;  // ← Empty!
    // Tags section won't show because availableTags.length === 0
  });
```

You'd need to ensure tags are loaded BEFORE editing, which might not happen if you navigate directly to edit page.

## Summary

**Why infinite loop occurs:**

1. `combineLatestWith(tagsForSelectedApp$)` subscribes to tags state
2. Subscription calls `populateFormWithProduct()`
3. `populateFormWithProduct()` calls `loadTags()`
4. `loadTags()` dispatches action that updates tags state
5. Tags state change causes `tagsForSelectedApp$` to emit
6. Emission triggers subscription again → **loop**

**Why subdomain calls happen:**

- `selectedAppId` in tags state might be connected to app context
- App context might trigger subdomain checks
- Each loop iteration causes new subdomain-related HTTP calls

**Why it works without the facade:**

- Direct HTTP call via TagService doesn't update store state
- Component property update doesn't trigger observables
- No circular dependency

**The fundamental issue:**

Mixing reactive (observable) and imperative (method call) patterns in a way that creates circular dependency:
- Observable says: "React when tags change"
- Method says: "Change the tags"
- Result: Infinite loop

**Best fix:**

Separate concerns - either:
1. Load tags BEFORE/OUTSIDE the subscription, OR
2. Use tags from the observable WITHOUT loading them inside subscription
