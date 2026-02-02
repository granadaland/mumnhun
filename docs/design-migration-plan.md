# Design Migration Plan

> Step-by-step file-by-file changes to align `mumnhun-nextjs` with the `mumnhun-design` mockup reference.

---

## Migration Phases

| Phase | Focus | Files | Estimated Changes |
|-------|-------|-------|-------------------|
| 1 | Foundation | `globals.css`, fonts | Core styling setup |
| 2 | Hero Section | `app/page.tsx` | Major redesign |
| 3 | Benefits | `benefit-card.tsx` | Component overhaul |
| 4 | Pricing | `app/page.tsx`, `pricing-card.tsx` | Card redesign |
| 5 | Testimonials | `app/page.tsx` | Full section redesign |
| 6 | FAQ | `faq-accordion.tsx` | Accordion restyling |
| 7 | Header | `header.tsx` | Morphing navigation |
| 8 | Footer | `footer.tsx` | Gradient + layout |

---

## Phase 1: Foundation (globals.css + fonts)

### File: `app/globals.css`

#### 1.1 Add Poppins Font Import

**Current Classes (Line 1-2):**
```css
@import "tailwindcss";
@import "tw-animate-css";
```

**Add After (Line 3):**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
```

#### 1.2 Update Font Variables

**Current (Line 101):**
```css
--font-sans: 'Inter', var(--font-geist-sans), sans-serif;
```

**Change To:**
```css
--font-sans: 'Poppins', var(--font-geist-sans), sans-serif;
```

#### 1.3 Add Mockup Color Palette

**Add to `@theme inline` block (After Line 99):**
```css
/* Mockup Design System Colors */
--color-primary: #466A68;
--color-primary-dark: #2F4A48;
--color-secondary: #382821;
--color-accent: #C48B77;
--color-beige: #DBC4B0;
--color-body-bg: #F0E5D8;
--color-hero-start: #FFFBF7;
--color-hero-mid: #F3E7DB;
--color-hero-end: #E2CDBA;
```

#### 1.4 Add Noise Texture Overlay

**Add to `@layer base` block (After Line 183):**
```css
/* Premium Paper Noise Texture */
body::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 50;
}
```

#### 1.5 Add Custom Scrollbar

**Add to `@layer base` block:**
```css
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: rgba(240, 229, 216, 0.5);
}
::-webkit-scrollbar-thumb {
  background: #C48B77;
  border-radius: 5px;
  border: 2px solid #F0E5D8;
}
::-webkit-scrollbar-thumb:hover {
  background: #466A68;
}
```

#### 1.6 Add Glassmorphism Utility Classes

**Add to `@layer base` block:**
```css
/* Glassmorphism Utilities */
.glass {
  @apply bg-white/40 backdrop-blur-md border border-white/60;
}
.glass-strong {
  @apply bg-white/60 backdrop-blur-2xl border border-white/60;
}
.glass-card {
  @apply bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem];
}
.shadow-soft {
  box-shadow: 0 10px 40px -10px rgba(56, 40, 33, 0.08);
}
.shadow-glow {
  box-shadow: 0 0 20px rgba(196, 139, 119, 0.3);
}
```

---

## Phase 2: Hero Section

### File: `app/page.tsx` (Lines 22-73)

#### 2.1 Section Container

**Current (Line 26):**
```tsx
<section className="relative bg-gradient-to-br from-[#E8D5C4] via-[#D9C4B0] to-[#C9B199] overflow-hidden">
```

**Change To:**
```tsx
<section className="relative pt-36 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
  {/* Background Gradient */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />
```

#### 2.2 Remove Container Wrapper Padding

**Current (Line 27):**
```tsx
<Container className="py-12 lg:py-20">
```

**Change To:**
```tsx
<Container className="relative z-10">
```

#### 2.3 Update Heading

**Current (Lines 31-33):**
```tsx
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 leading-tight">
  Solusi Penyimpanan ASI Aman untuk Ibu Bekerja
</h1>
```

**Change To:**
```tsx
<h1 className="text-4xl md:text-6xl xl:text-7xl font-bold text-secondary leading-[1.1] tracking-tight mb-6">
  Kualitas ASI Terjaga, <br/>
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primaryDark relative">
    Hati Ibu Tenang
    <svg className="absolute w-full h-3 -bottom-1 left-0 text-accent/30 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
    </svg>
  </span>
</h1>
```

#### 2.4 Update Paragraph

**Current (Lines 35-38):**
```tsx
<p className="text-base sm:text-lg lg:text-xl text-neutral-700 leading-relaxed max-w-xl">
```

**Change To:**
```tsx
<p className="text-secondary/70 text-lg md:text-xl mb-10 leading-relaxed max-w-xl font-light">
```

#### 2.5 Update Primary Button

**Current (Lines 41-46):**
```tsx
<Button
  size="lg"
  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg rounded-full"
  asChild
>
```

**Change To:**
```tsx
<Button
  size="lg"
  className="group bg-primary text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 flex items-center gap-3"
  asChild
>
```

#### 2.6 Update Secondary Button

**Current (Lines 48-54):**
```tsx
<Button
  size="lg"
  variant="outline"
  className="border-2 border-neutral-800 text-neutral-800 hover:bg-neutral-800 hover:text-white px-8 py-6 text-lg rounded-full"
```

**Change To:**
```tsx
<Button
  size="lg"
  variant="outline"
  className="bg-white/50 border border-white hover:bg-white text-secondary px-8 py-4 rounded-full font-semibold transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
```

#### 2.7 Update Image Container

**Current (Lines 60-68):**
```tsx
<div className="relative w-full aspect-[4/5] lg:aspect-square max-w-md mx-auto lg:max-w-none">
  <Image
    src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80"
    alt="Ibu menyusui dan bayi"
    fill
    className="object-cover rounded-2xl"
    priority
  />
</div>
```

**Change To:**
```tsx
<div className="relative">
  {/* Soft Glow Effect */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 rounded-full blur-3xl -z-10" />
  
  {/* Main Image */}
  <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-8 border-white/40 aspect-[4/3]">
    <Image
      src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1000&q=80"
      alt="Layanan Sewa Freezer ASI Jakarta Terpercaya"
      fill
      className="object-cover"
      priority
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
  </div>
</div>
```

#### 2.8 Add Trust Indicators

**Add after buttons (after Line 56):**
```tsx
{/* Trust Indicators */}
<div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-secondary/60">
  <div className="flex items-center gap-2">
    <ShieldCheck size={18} className="text-primary" />
    <span>Garansi Unit</span>
  </div>
  <div className="w-1 h-1 bg-secondary/20 rounded-full" />
  <div>700+ Pelanggan Happy</div>
</div>
```

---

## Phase 3: Benefit Cards

### File: `components/home/benefit-card.tsx`

#### Complete Redesign

**Replace entire component (Lines 29-59):**
```tsx
export function BenefitCard({
  icon,
  title,
  description,
  className,
}: BenefitCardProps) {
  const IconComponent = iconMap[icon] || Star

  return (
    <div
      className={cn(
        "group relative bg-white/40 hover:bg-white border border-white/60 hover:border-white p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-stone-200/50 flex flex-col items-start backdrop-blur-sm",
        className
      )}
    >
      {/* Icon Box */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center text-accent mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
        <IconComponent
          size={28}
          strokeWidth={1.5}
          className="group-hover:text-primary transition-colors"
        />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-secondary mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {/* Description */}
      <p className="text-secondary/70 leading-relaxed text-sm mb-4">
        {description}
      </p>

      {/* Decorative line */}
      <div className="w-12 h-1 bg-gray-200 rounded-full mt-auto group-hover:w-full group-hover:bg-primary/20 transition-all duration-500" />
    </div>
  )
}
```

---

## Phase 4: Pricing Section

### File: `app/page.tsx` (Lines 99-182)

#### 4.1 Update Section Background

**Current (Line 102):**
```tsx
<section className="py-16 lg:py-24 bg-[#FDF8F3]">
```

**Change To:**
```tsx
<section className="py-24 px-6 relative bg-white/40 overflow-hidden">
  {/* Background Decor */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 blur-[120px] rounded-full -z-10" />
```

#### 4.2 Update Section Tag

**Add before h2 (Line 104):**
```tsx
<div className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-4">
  Harga Transparan
</div>
```

#### 4.3 Update Card Container

**Current (Line 111):**
```tsx
<div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
```

**Change To:**
```tsx
<div className="flex flex-col md:flex-row gap-8 lg:gap-12 justify-center items-center md:items-stretch">
```

#### 4.4 Update Card Styling

For each card, update the className to match mockup (see Phase 4 detailed changes in pricing-card.tsx below).

### File: `components/home/pricing-card.tsx`

#### Complete Card Styling Update

**Current Card wrapper (Lines 27-35):**
```tsx
<Card
  className={cn(
    "relative overflow-hidden transition-all duration-300 h-full flex flex-col",
    isPopular
      ? "border-coral-400 border-2 shadow-lg scale-105 z-10"
      : "border-border hover:shadow-md",
    className
  )}
>
```

**Change To:**
```tsx
<div
  className={cn(
    "relative flex flex-col w-full md:w-1/3 max-w-sm rounded-[2.5rem] p-8 lg:p-10 transition-all duration-500 group",
    isPopular
      ? "bg-white/90 backdrop-blur-xl ring-4 ring-primary/10 shadow-2xl shadow-primary/10 scale-100 md:scale-110 z-10"
      : "bg-white/40 backdrop-blur-md border border-white/60 hover:border-primary/30 hover:bg-white/80 hover:shadow-xl hover:-translate-y-2",
    className
  )}
>
```

---

## Phase 5: Testimonials Section

### File: `app/page.tsx` (Lines 184-237)

#### 5.1 Update Section Container

**Current (Line 187):**
```tsx
<section className="py-16 lg:py-24 bg-[#E8DDD4]">
```

**Change To:**
```tsx
<section className="py-24 px-6 relative overflow-hidden">
  {/* Background blobs */}
  <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2" />
  <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/3" />
```

#### 5.2 Update Card Container

**Current (Lines 197-198):**
```tsx
<Card className="bg-white rounded-2xl shadow-lg overflow-hidden">
  <CardContent className="p-8 lg:p-12">
```

**Change To:**
```tsx
<div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-16 shadow-soft border border-white/60 relative z-10 min-h-[420px] md:min-h-[350px] flex items-center">
```

#### 5.3 Update Image Styling

**Current (Lines 201-208):**
```tsx
<div className="relative w-48 h-48 lg:w-64 lg:h-64 flex-shrink-0 rounded-2xl overflow-hidden">
  <Image ... className="object-cover" />
</div>
```

**Change To:**
```tsx
<div className="shrink-0 relative group">
  <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[2rem] blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
  <Image
    src={...}
    alt={...}
    width={224}
    height={224}
    className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] object-cover shadow-lg border-4 border-white relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500"
  />
  {/* Floating rating badge */}
  <div className="absolute -bottom-5 right-0 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 z-20 whitespace-nowrap border border-gray-100">
    <div className="flex text-yellow-400">
      {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
    </div>
  </div>
</div>
```

#### 5.4 Update Author Info

**Current (Lines 215-217):**
```tsx
<p className="font-semibold text-neutral-900 mb-4">
  {TESTIMONIALS[0]?.name || "Forum Moonitawall"}
</p>
```

**Change To:**
```tsx
<div className="border-l-4 border-accent pl-5 text-left inline-block">
  <h4 className="text-xl font-bold text-secondary">{TESTIMONIALS[0]?.name}</h4>
  <p className="text-secondary/50 text-sm font-medium uppercase tracking-wider mt-1">
    {TESTIMONIALS[0]?.role || "Ibu Menyusui"}
  </p>
</div>
```

---

## Phase 6: FAQ Accordion

### File: `components/home/faq-accordion.tsx`

#### Update Accordion Item Styling

**Current (Lines 26-38):**
```tsx
<AccordionItem
  key={index}
  value={`item-${index}`}
  className="border-b border-cream-200"
>
  <AccordionTrigger className="text-left font-medium hover:text-teal-600 hover:no-underline py-4">
```

**Change To:**
```tsx
<div
  key={index}
  className={cn(
    "border rounded-2xl transition-all duration-300 bg-white/50 backdrop-blur-sm",
    openFaq === index
      ? "border-primary/50 shadow-lg shadow-primary/5"
      : "border-white/60 hover:border-primary/30"
  )}
>
  <button
    onClick={() => toggleFaq(index)}
    className="w-full flex items-center justify-between p-5 text-left"
  >
    <span className={cn(
      "font-semibold transition-colors",
      openFaq === index ? "text-primary" : "text-secondary"
    )}>
      {faq.question}
    </span>
    <div className={cn(
      "p-1 rounded-full transition-all duration-300",
      openFaq === index ? "bg-primary text-white rotate-180" : "bg-gray-100 text-gray-500"
    )}>
      <ChevronDown size={16} />
    </div>
  </button>
</div>
```

> **Note:** This requires converting from Radix Accordion to custom implementation for full control.

---

## Phase 7: Header

### File: `components/layout/header.tsx`

#### Complete Restructure for Morphing Navigation

This requires significant changes to add scroll detection and morphing behavior.

**Key Changes:**
1. Change from `sticky` to `fixed`
2. Add `isScrolled` state with scroll listener
3. Update container classes based on scroll state
4. Add logo icon (baby bottle emoji)
5. Update nav link hover states
6. Add pill container on scroll

*Full implementation details in design-patterns.md under Navigation/Header section.*

---

## Phase 8: Footer

### File: `components/layout/footer.tsx`

#### 8.1 Update Container Background

**Current (Line 8):**
```tsx
<footer className="bg-brown-900 border-t border-brown-800 text-brown-100">
```

**Change To:**
```tsx
<footer className="relative bg-gradient-to-r from-[#D4BCAA] to-[#F4EEE7] border-t border-[#382821]/10 pt-20 pb-10">
```

#### 8.2 Update Text Colors

Throughout the file, change:
- `text-brown-100` → `text-[#382821]` or `text-[#382821]/80`
- `text-white` → `text-[#382821]`
- `bg-brown-800` → `bg-[#382821]/5` or `bg-[#382821]`

#### 8.3 Update Grid Layout

**Current (Line 11):**
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
```

**Change To:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
  <div className="lg:col-span-4"> {/* Brand */}
  <div className="lg:col-span-3"> {/* Links */}
  <div className="lg:col-span-5"> {/* Contact */}
```

---

## Verification Checklist

After applying all changes, verify:

- [ ] Poppins font loads correctly
- [ ] Primary color (#466A68) applied consistently
- [ ] Accent color (#C48B77) used for highlights
- [ ] Glassmorphism cards have proper blur effect
- [ ] Hero gradient flows left-to-right with correct colors
- [ ] Noise texture visible (subtle) on body
- [ ] Custom scrollbar styled
- [ ] Cards have large border radius (2rem+)
- [ ] Hover effects include lift (-translate-y) animations
- [ ] Shadows use design token colors (stone, primary)
- [ ] All components responsive (mobile/tablet/desktop)
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] All database connections unchanged
- [ ] All API routes unchanged

---

## Notes

> **FORBIDDEN Changes:**
> - ❌ Database schema
> - ❌ Prisma files
> - ❌ API route logic
> - ❌ Business logic in components
> - ❌ Component props/interfaces (except styling)
> - ❌ External package dependencies

> **ALLOWED Changes:**
> - ✅ Tailwind CSS classes
> - ✅ CSS variables and globals.css
> - ✅ Component styling and layout
> - ✅ Design token files
> - ✅ JSX structure for styling purposes
