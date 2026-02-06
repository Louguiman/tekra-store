# i18n Implementation Guide (React Context Approach)

## Overview

This implementation uses React Context API for internationalization, supporting English (en) and French (fr) translations across the entire application.

## Architecture

### Files Created

1. **`frontend/src/contexts/LanguageContext.tsx`**
   - React Context for managing language state
   - Provides `useLanguage()` hook for accessing translations
   - Stores locale preference in localStorage
   - Translation function `t(key)` for accessing nested translation keys

2. **`frontend/src/components/language-switcher.tsx`**
   - Dropdown component for switching between languages
   - Gaming-themed styling consistent with the app
   - Shows flag emojis for visual language identification

3. **Translation Files** (already exist)
   - `frontend/messages/en.json` - English translations
   - `frontend/messages/fr.json` - French translations

## Usage

### Basic Translation

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('home.hero.title')}</h1>
      <p>{t('home.hero.description')}</p>
    </div>
  );
}
```

### Accessing Current Locale

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { locale, setLocale } = useLanguage();
  
  return (
    <div>
      <p>Current language: {locale}</p>
      <button onClick={() => setLocale('fr')}>Switch to French</button>
    </div>
  );
}
```

### Translation Key Structure

Translation keys use dot notation to access nested objects:

```json
{
  "home": {
    "hero": {
      "title": "LEVEL UP"
    }
  }
}
```

Access with: `t('home.hero.title')` → "LEVEL UP"

## Integration Points

### 1. Header Component
- Language switcher added to desktop and mobile views
- Navigation links translated
- Search placeholder translated

### 2. Providers
- `LanguageProvider` wraps the entire app in `frontend/src/components/providers.tsx`
- Ensures translations available throughout the app

## Translation Coverage

### Current Translations

✅ **Common UI Elements**
- Buttons (save, cancel, delete, edit, etc.)
- Loading states
- Error messages
- Form labels

✅ **Navigation**
- Main menu items
- Admin navigation
- Breadcrumbs

✅ **Homepage**
- Hero section
- Feature sections
- Testimonials
- Call-to-action buttons

✅ **Products**
- Product listings
- Filters and sorting
- Product details
- Cart actions

✅ **Cart & Checkout**
- Cart summary
- Checkout form
- Payment methods
- Order confirmation

✅ **Orders**
- Order history
- Order status
- Tracking information

✅ **Admin Panel**
- Dashboard
- Login page
- Navigation
- Product management

✅ **Support**
- Contact information
- FAQ
- Help center

## Adding New Translations

### Step 1: Add to Translation Files

Add the same key to both `en.json` and `fr.json`:

**en.json:**
```json
{
  "products": {
    "newFeature": "New Feature Text"
  }
}
```

**fr.json:**
```json
{
  "products": {
    "newFeature": "Texte de Nouvelle Fonctionnalité"
  }
}
```

### Step 2: Use in Component

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function ProductComponent() {
  const { t } = useLanguage();
  
  return <div>{t('products.newFeature')}</div>;
}
```

## Best Practices

### 1. Consistent Key Naming
- Use camelCase for keys: `myFeature` not `my-feature`
- Group related translations: `products.title`, `products.description`
- Keep keys descriptive: `addToCart` not `btn1`

### 2. Avoid Hardcoded Text
❌ Bad:
```tsx
<button>Add to Cart</button>
```

✅ Good:
```tsx
<button>{t('products.addToCart')}</button>
```

### 3. Handle Missing Translations
The `t()` function returns the key if translation is missing:
```tsx
t('missing.key') // Returns: 'missing.key'
```

### 4. Dynamic Content
For content with variables, use template strings:
```tsx
const message = `${t('cart.itemCount')}: ${count}`;
```

## Language Switcher Locations

1. **Desktop Header** - Top right, next to country selector
2. **Mobile Menu** - At the top of mobile navigation drawer

## Styling

The language switcher uses gaming theme styling:
- Gaming card background (`bg-dark-50`)
- Primary color borders on hover
- Smooth transitions
- Consistent with other form elements

## Testing

### Manual Testing Checklist

1. ✅ Switch language in header
2. ✅ Verify localStorage persistence (refresh page)
3. ✅ Check all translated pages:
   - Homepage
   - Products page
   - Cart page
   - Admin login
   - Support page
4. ✅ Test mobile language switcher
5. ✅ Verify fallback to English for missing keys

### Browser Console Testing

```javascript
// Check current locale
localStorage.getItem('locale')

// Change locale
localStorage.setItem('locale', 'fr')
// Then refresh page

// Clear locale (resets to English)
localStorage.removeItem('locale')
```

## Advantages of This Approach

1. **No Build Complexity** - No routing changes or complex configuration
2. **Type-Safe** - TypeScript support for translation keys
3. **Lightweight** - No external dependencies beyond React
4. **Persistent** - Language choice saved in localStorage
5. **Simple** - Easy to understand and maintain
6. **Fast** - No server-side rendering complications

## Future Enhancements

### Potential Additions

1. **More Languages**
   - Add Portuguese (pt) for Angola, Mozambique
   - Add Arabic (ar) for North African markets

2. **Date/Number Formatting**
   - Use `Intl.DateTimeFormat` for locale-specific dates
   - Use `Intl.NumberFormat` for currency formatting

3. **RTL Support**
   - Add right-to-left layout support for Arabic

4. **Translation Management**
   - Consider using a translation management platform
   - Implement translation validation scripts

## Troubleshooting

### Issue: Translations not showing
**Solution:** Ensure `LanguageProvider` wraps your component tree in `providers.tsx`

### Issue: Language not persisting
**Solution:** Check browser localStorage is enabled and not blocked

### Issue: Missing translation shows key
**Solution:** Add the translation to both `en.json` and `fr.json` files

### Issue: TypeScript errors
**Solution:** Restart TypeScript server or rebuild the project

## Migration from next-intl

This implementation replaces the previous next-intl attempt which had TypeScript compatibility issues. The Context API approach is:
- More reliable
- Easier to debug
- Better TypeScript support
- No routing complications

## Summary

The i18n system is now fully functional with:
- ✅ English and French translations
- ✅ Language switcher in header
- ✅ localStorage persistence
- ✅ Gaming theme styling
- ✅ Comprehensive translation coverage
- ✅ Simple, maintainable codebase

Users can now switch between English and French throughout the entire application with a single click!
