# i18n Implementation Guide

## Overview
Added internationalization (i18n) support for French and English across the entire website using `next-intl`.

## Installation
```bash
cd frontend
npm install next-intl
```

## Configuration Files Created

### 1. `frontend/src/i18n.ts`
Core i18n configuration file that:
- Defines supported locales (`en`, `fr`)
- Loads translation messages dynamically
- Validates incoming locale parameters

### 2. `frontend/messages/en.json`
English translations containing:
- Common UI elements (buttons, labels, etc.)
- Navigation items
- Homepage content (hero, sections, features, testimonials, CTA)
- Product pages
- Cart and checkout
- Orders
- Admin dashboard
- Support pages
- Error messages

### 3. `frontend/messages/fr.json`
French translations (complete mirror of English translations)

### 4. `frontend/src/middleware.ts`
Next.js middleware for:
- Automatic locale detection
- Locale-based routing
- Default locale fallback (English)
- Always uses locale prefix in URLs

### 5. `frontend/next.config.js`
Updated with `next-intl` plugin integration

## Directory Structure Changes

### Before:
```
frontend/src/app/
├── page.tsx
├── layout.tsx
├── admin/
│   └── login/
│       └── page.tsx
└── ...
```

### After:
```
frontend/src/app/
├── [locale]/
│   ├── page.tsx (translated)
│   ├── layout.tsx (with NextIntlClientProvider)
│   ├── admin/
│   │   └── login/
│   │       └── page.tsx (translated)
│   └── ...
└── ...
```

## Components Created

### `frontend/src/components/language-switcher.tsx`
Language switcher component that:
- Displays current language with flag emoji
- Allows switching between English and French
- Preserves current page path when switching
- Gaming-themed styling matching overall design

## Updated Components

### 1. Homepage (`frontend/src/app/[locale]/page.tsx`)
Fully translated sections:
- Hero section (title, subtitle, description, CTA buttons)
- Stats section (products, countries, support, satisfaction)
- Featured products section
- Epic deals banner
- Gaming categories
- Trending products
- New arrivals
- Features (payment, delivery, quality)
- Testimonials
- Final CTA section

### 2. Admin Login (`frontend/src/app/[locale]/admin/login/page.tsx`)
Translated elements:
- Page title and subtitle
- Login method selector
- Email/phone labels and placeholders
- Password field
- Submit button and loading state
- Security badge
- Back to home link

### 3. Header (`frontend/src/components/layout/header.tsx`)
Added:
- Language switcher in desktop view
- Language switcher in mobile menu
- Positioned before country selector

## URL Structure

### English URLs:
```
/en                    - Homepage
/en/products           - Products page
/en/cart               - Shopping cart
/en/admin/login        - Admin login
```

### French URLs:
```
/fr                    - Page d'accueil
/fr/products           - Page des produits
/fr/cart               - Panier
/fr/admin/login        - Connexion admin
```

## Usage in Components

### Using translations in a component:
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <button>{tCommon('submit')}</button>
    </div>
  );
}
```

### Using translations in server components:
```typescript
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('products');
  
  return <h1>{t('title')}</h1>;
}
```

## Translation Keys Structure

```json
{
  "common": {
    "loading": "...",
    "error": "...",
    // Common UI elements
  },
  "nav": {
    "home": "...",
    "products": "...",
    // Navigation items
  },
  "home": {
    "hero": {
      "title": "...",
      "subtitle": "...",
      // Hero section
    },
    "sections": {
      // Content sections
    },
    "features": {
      // Features
    },
    "testimonials": {
      // Customer reviews
    }
  },
  "products": {
    // Product-related translations
  },
  "cart": {
    // Cart translations
  },
  "admin": {
    "login": {
      // Admin login translations
    }
  }
}
```

## Middleware Configuration

The middleware handles:
- Automatic locale detection from browser settings
- URL rewriting to include locale prefix
- Fallback to English for unsupported locales
- Preserves query parameters and hash fragments

### Matcher Pattern:
```typescript
matcher: ['/', '/(fr|en)/:path*']
```

This matches:
- Root path `/`
- All paths with `/en/` or `/fr/` prefix

## Next Steps

### To translate additional pages:

1. **Move page to locale folder:**
   ```bash
   mv src/app/products/page.tsx src/app/[locale]/products/page.tsx
   ```

2. **Add translations to JSON files:**
   ```json
   // messages/en.json
   {
     "products": {
       "title": "Products",
       "filter": "Filter"
     }
   }
   
   // messages/fr.json
   {
     "products": {
       "title": "Produits",
       "filter": "Filtrer"
     }
   }
   ```

3. **Use translations in component:**
   ```typescript
   'use client';
   import { useTranslations } from 'next-intl';
   
   export default function ProductsPage() {
     const t = useTranslations('products');
     return <h1>{t('title')}</h1>;
   }
   ```

### Pages to translate next:
- [ ] Products listing page
- [ ] Product detail page
- [ ] Cart page
- [ ] Checkout page
- [ ] Orders page
- [ ] Support page
- [ ] Admin dashboard
- [ ] Admin products management
- [ ] Admin WhatsApp pipeline

## Testing

### Test language switching:
1. Visit `http://localhost:3000` (redirects to `/en`)
2. Click language switcher
3. Select "🇫🇷 Français"
4. Verify URL changes to `/fr`
5. Verify all text is in French

### Test direct URL access:
1. Visit `http://localhost:3000/fr`
2. Verify French content loads
3. Visit `http://localhost:3000/en`
4. Verify English content loads

### Test invalid locale:
1. Visit `http://localhost:3000/es`
2. Should show 404 page

## Build Status

⚠️ **Current Status**: i18n temporarily disabled due to TypeScript compatibility issues with next-intl v4.8.2

**Issue**: The `getRequestConfig` return type in next-intl v4.8.2 requires specific type signatures that conflict with the current setup.

**Temporary Solution**: i18n has been disabled to allow the build to proceed. The translation files (`messages/en.json`, `messages/fr.json`) are preserved for future implementation.

**Next Steps**: 
1. Research next-intl v3.x compatibility or alternative i18n solutions
2. Consider using next-intl v3.x which has simpler configuration
3. Or wait for next-intl v5.x which may have better TypeScript support
4. Alternative: Use react-i18next which has more mature TypeScript support

## Files Removed (Temporarily)

- `frontend/src/i18n.ts` - Configuration file
- `frontend/src/navigation.ts` - Localized navigation
- `frontend/src/middleware.ts` - Locale routing middleware
- `frontend/src/app/[locale]/` - Locale-based pages
- `frontend/src/components/language-switcher.tsx` - Language switcher component

## Files Preserved

✅ `frontend/messages/en.json` - English translations (ready for future use)
✅ `frontend/messages/fr.json` - French translations (ready for future use)
✅ `frontend/next.config.js` - Reverted to standard config

## Troubleshooting

### Issue: Translations not loading
**Solution**: Check that JSON files are in `frontend/messages/` directory and properly formatted.

### Issue: Language switcher not working
**Solution**: Verify middleware is configured correctly and locale parameter is in the URL.

### Issue: 404 on locale routes
**Solution**: Ensure `[locale]` folder structure is correct and `generateStaticParams` is defined in layout.

## Performance Considerations

- Translation messages are loaded dynamically per locale
- Only the active locale's messages are loaded (code splitting)
- Messages are cached after first load
- No impact on bundle size for unused locales

## SEO Considerations

- Each locale has its own URL (`/en/`, `/fr/`)
- Search engines can index each language separately
- `lang` attribute is set correctly in HTML tag
- Consider adding `hreflang` tags for better SEO

## Future Enhancements

1. **Add more languages**: Easily add more West African languages
2. **RTL support**: Add support for right-to-left languages if needed
3. **Dynamic locale switching**: Store user preference in cookies/localStorage
4. **Translation management**: Consider using a translation management system
5. **Pluralization**: Add support for plural forms
6. **Date/time formatting**: Use next-intl's formatting utilities
7. **Number formatting**: Format numbers according to locale
8. **Currency formatting**: Already handled by country selector, but can be enhanced

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)

---

**Implementation Date**: February 5, 2026  
**Status**: ⚠️ In Progress (Build issues to resolve)  
**Languages Supported**: English (en), French (fr)
