# Playwright Selector Reference

Common techniques for finding elements on web pages to monitor.

## Finding Elements

### By Test ID (Recommended)
```javascript
await page.locator('[data-testid="button-name"]')
```

### By Text Content
```javascript
await page.locator('text=Add to Cart')
await page.locator('button:has-text("Buy Now")')
```

### By CSS Selector
```javascript
await page.locator('.availability-calendar')
await page.locator('#product-status')
```

### By Role (Accessible)
```javascript
await page.getByRole('button', { name: 'Submit' })
await page.getByRole('link', { name: 'Sign up' })
```

### By Placeholder
```javascript
await page.getByPlaceholder('Enter email')
```

## Checking Element State

### Check if Element Exists
```javascript
const count = await page.locator('.item').count();
if (count > 0) {
  // Element exists
}
```

### Check if Element is Visible
```javascript
const isVisible = await page.locator('.modal').isVisible();
```

### Get Text Content
```javascript
const text = await page.locator('.price').textContent();
```

### Check if Disabled
```javascript
const isDisabled = await page.locator('button').isDisabled();
```

## Common Monitoring Patterns

### Pattern 1: Check for "In Stock" Status
```javascript
const stockStatus = await page.locator('.stock-status').textContent();
if (stockStatus.includes('In Stock')) {
  await log('✅ Product is available!');
}
```

### Pattern 2: Check for Available Dates
```javascript
const availableDates = await page.$$('.calendar-day.available');
if (availableDates.length > 0) {
  await log(`📅 Found ${availableDates.length} available dates`);
}
```

### Pattern 3: Monitor Price Changes
```javascript
const currentPrice = await page.locator('.price').textContent();
const priceNumber = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
// Compare with saved price
```

### Pattern 4: Check Button State
```javascript
const buyButton = page.locator('button:has-text("Add to Cart")');
const isEnabled = await buyButton.isEnabled();
if (isEnabled) {
  await log('🛒 Buy button is now enabled!');
}
```

## Tips

1. **Use specific selectors**: Prefer `data-testid` or unique classes over generic selectors
2. **Handle timeouts**: Use `{ timeout: 10000 }` to wait for slow-loading elements
3. **Check multiple conditions**: Verify both existence and visibility
4. **Extract data**: Use `.textContent()`, `.getAttribute()`, etc. to get values
5. **Use screenshots**: Save screenshots when important changes are detected
