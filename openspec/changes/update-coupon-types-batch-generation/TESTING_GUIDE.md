# Quick Test Guide

## Prerequisites
1. Database migration applied
2. Backend server running
3. Frontend running
4. You have sufficient credits in your account

## Test 1: Percentage Off Coupon with Min Purchase

1. Navigate to coupon creation page
2. Fill in the form:
   - **Verification App**: Select any app
   - **Description**: "20% Off Orders Over $50"
   - **Generation Type**: "Single Coupon (Reusable)" (default)
   - **Discount Type**: "Percentage Off"
   - **Discount Percentage**: 20
   - **Minimum Purchase Amount**: 50 (REQUIRED - will show error if empty)
   - **Max Number of Users**: 100
   - **Expiry Date**: Any future date
3. Check estimated cost
4. Submit
5. **Expected**: Single coupon created, redirects to coupon list

**Verify**:
```sql
SELECT coupon_code, discount_type, discount_value, min_purchase_amount, 
       is_single_use_code, batch_id 
FROM coupons 
WHERE description LIKE '%20% Off%';
```

Expected: `is_single_use_code = false`, `batch_id = null`

## Test 2: Batch Fixed Amount Coupons

1. Navigate to coupon creation page
2. Fill in the form:
   - **Verification App**: Select any app
   - **Description**: "$10 Gift Cards"
   - **Generation Type**: Select "Generate Multiple Coupons (Single-use each)"
   - **Number of Coupons**: 10
   - **Discount Type**: "Fixed Amount Off" (auto-selected, disabled)
   - **Amount per Coupon**: 10
   - **Expiry Date**: Any future date
3. Check estimated cost (should show "Total cost for 10 coupons")
4. Submit
5. **Expected**: Batch results page shows 10 unique coupon codes

**On Batch Results Page**:
- [ ] All 10 codes displayed in a grid
- [ ] "Download CSV" button visible
- [ ] "View All Coupons" button visible
- [ ] Each code has a "Copy" button
- [ ] Click "Download CSV" → CSV file downloads
- [ ] Click a "Copy" button → Code copied to clipboard

**Verify in Database**:
```sql
SELECT coupon_code, is_single_use_code, batch_id, batch_quantity 
FROM coupons 
WHERE description = '$10 Gift Cards'
ORDER BY id;
```

Expected: 
- 10 rows
- All have same `batch_id` (UUID)
- All have `is_single_use_code = true`
- First row has `batch_quantity = 10`
- Other rows have `batch_quantity = null`

## Test 3: Edge Cases

### Test 3a: Batch Quantity Limit
1. Try to create 501 coupons
2. **Expected**: Error message "Batch quantity cannot exceed 500 coupons per request"

### Test 3b: Insufficient Credits
1. Note your current balance
2. Try to create a batch that costs more than your balance
3. **Expected**: Error message showing required vs available credits

### Test 3c: Percentage Without Min Purchase
1. Select "Percentage Off"
2. Leave "Minimum Purchase Amount" empty
3. Try to submit
4. **Expected**: Validation error "This field is required"

### Test 3d: Backward Compatibility
1. Create a regular single coupon (non-batch)
2. **Expected**: Works exactly as before
3. Verify in database: `is_single_use_code = false`, `batch_id = null`

## Test 4: CSV Export Format

Download a CSV and verify it contains:
```csv
"Coupon Code","Discount Value","Currency","Expiry Date","QR Code URL"
"ABC123XYZ","10","USD","12/31/2025","https://..."
"DEF456UVW","10","USD","12/31/2025","https://..."
```

## Test 5: UI Behavior

### Generation Type Toggle
1. Select "Generate Multiple Coupons"
2. **Expected**: 
   - "Number of Coupons" input appears
   - Discount type changes to "Fixed Amount Off"
   - Discount type dropdown becomes disabled
   - "Buy X Get Y" option disappears
3. Switch back to "Single Coupon"
4. **Expected**:
   - "Number of Coupons" input disappears
   - Discount type dropdown enabled again
   - All three discount types available

### Discount Type Toggle
1. With "Single Coupon" selected, choose "Percentage Off"
2. **Expected**: "Minimum Purchase Amount" becomes required (red asterisk)
3. Change to "Fixed Amount Off"
4. **Expected**: "Minimum Purchase Amount" becomes optional

### Cost Estimation
1. Fill all required fields
2. **Expected**: Cost updates in real-time
3. For batch: Shows "Total cost for X coupons"
4. For single: Shows "Actual cost may vary..."

## Test 6: Credit Deduction

1. Note current balance before creation
2. Create batch of 5 coupons at $10 each
3. Check new balance
4. **Expected**: Deducted amount matches estimated cost
5. Verify transaction record:
```sql
SELECT * FROM credit_transactions 
WHERE description LIKE '%Batch coupon creation%'
ORDER BY created_at DESC LIMIT 1;
```

## Test 7: QR Codes Generated

1. Create batch of 3 coupons
2. Check that each coupon has a unique QR code URL
3. Visit one of the QR code URLs
4. **Expected**: QR code image displays

## Quick SQL Verification Queries

```sql
-- Check migration applied
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'coupons' AND column_name = 'is_single_use_code';

-- View all batch coupons
SELECT batch_id, COUNT(*) as coupon_count, 
       MAX(batch_quantity) as total_in_batch
FROM coupons 
WHERE batch_id IS NOT NULL 
GROUP BY batch_id;

-- View single-use coupons
SELECT coupon_code, discount_value, is_single_use_code 
FROM coupons 
WHERE is_single_use_code = true;

-- Check credit transactions for batch creation
SELECT description, amount, created_at 
FROM credit_transactions 
WHERE reference_type = 'COUPON_CREATION' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Troubleshooting

### Frontend Not Showing New Options
- Clear browser cache
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
- Check browser console for errors

### Backend Errors
- Check if migration applied: Run first SQL query above
- Restart backend server
- Check server logs for detailed error messages

### CSV Not Downloading
- Check browser's download settings
- Try different browser
- Check console for JavaScript errors

### Cost Showing as 0
- Ensure discount_value and expiry_date are filled
- For batch: Ensure batch_quantity is set
- Check browser console for calculation errors

## Success Criteria

✅ Can create percentage coupon with required min purchase  
✅ Can create batch of fixed amount coupons  
✅ Batch results page displays all generated codes  
✅ CSV export works and contains all codes  
✅ Copy-to-clipboard works for individual codes  
✅ Credits deducted correctly for batch  
✅ Database shows correct batch_id grouping  
✅ Single-use flag set correctly for batch coupons  
✅ Backward compatibility: old single coupons still work  
✅ Validation prevents invalid input  

## Report Issues

If you encounter any issues, provide:
1. Browser console errors (F12 → Console tab)
2. Network tab showing API request/response
3. Steps to reproduce
4. Expected vs actual behavior
