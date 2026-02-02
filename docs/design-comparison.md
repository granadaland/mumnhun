# Design Comparison: Current vs Mockup Reference

> Detailed comparison between the current `mumnhun-nextjs` implementation and the `mumnhun-design` mockup reference.

---

## Overview

| Aspect | Current Implementation | Mockup Reference | Status |
|--------|------------------------|------------------|--------|
| Font Family | `Inter`, `Geist` | `Poppins` | ⚠️ Different |
| Primary Color | `teal-600` (#0D9488) | `#466A68` (Forest Teal) | ⚠️ Different |
| Accent Color | `coral-500` | `#C48B77` (Terracotta) | ⚠️ Different |
| Background | `#FDF8F3` solid | Gradient + noise texture | ⚠️ Different |
| Border Radius | `rounded-2xl` (16px) | `rounded-[2rem]` to `rounded-[3rem]` | ⚠️ Different |
| Card Style | Solid with border | Glassmorphism (blur + opacity) | ⚠️ Different |

---

## 1. Homepage Hero Section

### File: `app/page.tsx` (Lines 22-73)

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Background** | `bg-gradient-to-br from-[#E8D5C4] via-[#D9C4B0] to-[#C9B199]` | `bg-gradient-to-r from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA]` | Change gradient direction and colors |
| **Padding Top** | `py-12 lg:py-20` | `pt-36 pb-20 md:pt-48 md:pb-32` | Increase significantly |
| **Heading Size** | `text-3xl sm:text-4xl lg:text-5xl xl:text-6xl` | `text-4xl md:text-6xl xl:text-7xl` | Increase sizes |
| **Heading Style** | Plain text | Gradient text with decorative underline | Add gradient + underline |
| **Button Style** | `rounded-full` (correct) | `rounded-full` with shadow | Add shadow effects |
| **Image Style** | `rounded-2xl` | `rounded-[3rem]` with thick border | Larger radius + border |
| **Trust Badges** | ❌ Missing | ✅ Has shield icon + customer count | Add trust indicators |
| **Floating Cards** | ❌ Missing | ✅ Rating card + Feature card | Add floating cards |
| **Pulse Badge** | ❌ Missing | ✅ "Solusi No.1 Ibu Bekerja" with ping | Add animated badge |

### Recommended Changes

```diff
// Line 26: Section background
- <section className="relative bg-gradient-to-br from-[#E8D5C4] via-[#D9C4B0] to-[#C9B199] overflow-hidden">
+ <section className="relative pt-36 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
+   <div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />

// Line 31: Heading
- <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-neutral-900 leading-tight">
+ <h1 className="text-4xl md:text-6xl xl:text-7xl font-bold text-secondary leading-[1.1] tracking-tight">

// Line 42-43: Primary Button
- className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg rounded-full"
+ className="bg-primary text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all"

// Line 62: Image container
- <div className="relative w-full aspect-[4/5] lg:aspect-square max-w-md mx-auto lg:max-w-none">
+ <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-8 border-white/40">
```

---

## 2. Benefits Section

### File: `app/page.tsx` (Lines 77-97) + `components/home/benefit-card.tsx`

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Section BG** | `bg-[#FDF8F3]` | No bg (transparent) | Remove or match body |
| **Card BG** | Flat with centered layout | Glassmorphism, left-aligned | Complete redesign |
| **Icon Container** | `rounded-full bg-teal-100` | `rounded-2xl bg-gradient-to-br from-white to-gray-50` | Change shape + gradient |
| **Hover Effect** | None | `-translate-y-2` + shadow | Add hover lift |
| **Decorative Line** | ❌ Missing | ✅ Expanding line on hover | Add bottom line |

### Current `benefit-card.tsx`:
```tsx
<div className="flex flex-col items-center text-center p-6">
  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
    <IconComponent className="h-8 w-8 text-teal-600" />
  </div>
```

### Mockup Pattern:
```tsx
<div className="group bg-white/40 hover:bg-white border border-white/60 hover:border-white p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-stone-200/50 backdrop-blur-sm flex flex-col items-start">
  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center text-accent group-hover:scale-110 group-hover:rotate-3 transition-all">
    <Icon size={28} strokeWidth={1.5} />
  </div>
  ...
  <div className="w-12 h-1 bg-gray-200 rounded-full mt-auto group-hover:w-full group-hover:bg-primary/20 transition-all duration-500" />
</div>
```

---

## 3. Pricing Section

### File: `app/page.tsx` (Lines 99-182) + `components/home/pricing-card.tsx`

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Layout** | Grid `md:grid-cols-3` | Flex with centered alignment | Switch to flex |
| **Card Shape** | `rounded-2xl` | `rounded-[2.5rem]` | Increase radius |
| **Card BG** | Solid white | Glassmorphism | Add backdrop-blur |
| **Popular Scale** | `scale-105` | `scale-110` | Increase slightly |
| **Popular Ring** | ❌ Missing | `ring-4 ring-primary/10` | Add ring |
| **Badge Position** | Top centered | Absolute `-top-5` | Adjust position |
| **Button Shape** | `rounded-lg` | `rounded-2xl` | Increase radius |

### Current vs Mockup Card Classes

**Current:**
```tsx
className="relative border-2 rounded-2xl overflow-hidden transition-all hover:shadow-lg"
```

**Mockup:**
```tsx
className="relative w-full md:w-1/3 max-w-sm rounded-[2.5rem] p-8 lg:p-10 bg-white/40 backdrop-blur-md border border-white/60 hover:border-primary/30 hover:bg-white/80 hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
```

---

## 4. Testimonials Section

### File: `app/page.tsx` (Lines 184-237)

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Section BG** | `bg-[#E8DDD4]` | Transparent with blobs | Remove solid bg, add blobs |
| **Card Style** | `bg-white rounded-2xl` | Glassmorphism `rounded-[3rem]` | Complete redesign |
| **Image Style** | `rounded-2xl` | `rounded-[2rem] rotate-3` with blur overlay | Add rotation + overlay |
| **Rating Badge** | Stars in content | Floating badge on image | Reposition |
| **Navigation** | ❌ Missing | Prev/Next buttons | Add carousel controls |
| **Quote Style** | `italic` text | Large `text-xl md:text-3xl font-medium` | Increase size |
| **Author Info** | Simple layout | `border-l-4 border-accent` | Add left border accent |

### Current Layout:
```tsx
<Card className="bg-white rounded-2xl shadow-lg overflow-hidden">
  <CardContent className="p-8 lg:p-12">
    <div className="flex flex-col lg:flex-row gap-8 items-center">
```

### Mockup Layout:
```tsx
<div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-16 shadow-soft border border-white/60 min-h-[420px] md:min-h-[350px] flex items-center">
  <div className="flex flex-col md:flex-row gap-10 lg:gap-20 items-center w-full">
```

---

## 5. FAQ + Articles Section

### File: `app/page.tsx` (Lines 239-310) + `components/home/faq-accordion.tsx`

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Section BG** | `bg-[#FDF8F3]` | `bg-white/40` | Change to semi-transparent |
| **Grid Gap** | `gap-12 lg:gap-16` | `gap-16 lg:gap-24` | Increase gap |
| **FAQ Item Border** | `border-cream-200` | `border border-white/60` on glassmorphism | Change to glassmorphism |
| **FAQ Active State** | Underline | `border-primary/50 shadow-lg shadow-primary/5` | Add shadow + border |
| **Chevron** | Plain rotate | Background circle + color change | Add circle background |
| **Article Cards** | Simple grid | Glassmorphism with hover effects | Redesign cards |

### Current FAQ Item:
```tsx
<AccordionItem className="border-b border-cream-200">
  <AccordionTrigger className="text-left font-medium hover:text-teal-600">
```

### Mockup FAQ Item:
```tsx
<div className="border rounded-2xl bg-white/50 backdrop-blur-sm border-primary/50 shadow-lg shadow-primary/5">
  <button className="w-full flex items-center justify-between p-5 text-left">
    <span className="font-semibold text-primary">{question}</span>
    <div className="p-1 rounded-full bg-primary text-white rotate-180">
      <ChevronDown size={16} />
    </div>
  </button>
```

---

## 6. Header/Navigation

### File: `components/layout/header.tsx`

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Position** | `sticky top-0` | `fixed` with morphing behavior | Change to fixed + scroll detection |
| **Background** | `bg-white shadow-sm` | Transparent → glassmorphism on scroll | Add scroll morph |
| **Shape** | Full-width bar | Full → Floating pill on scroll | Add pill container |
| **Logo Style** | Text only | Icon circle + text | Add baby bottle emoji icon |
| **Link Hover** | Color change | + `bg-primary/5` rounded | Add background hover |
| **CTA Button** | Standard | Shadow + context-aware colors | Add shadows |

### Current:
```tsx
<header className="sticky top-0 z-50 w-full bg-white shadow-sm">
  <div className="container mx-auto px-4">
    <div className="flex h-16 items-center justify-between">
```

### Mockup:
```tsx
<nav className="fixed z-[60] w-full flex justify-center pt-6 transition-all">
  <div className={`flex items-center justify-between transition-all ${
    isScrolled
      ? 'w-[92%] md:w-[85%] max-w-5xl bg-white/80 backdrop-blur-md border border-white/50 shadow-soft rounded-full px-6 py-3'
      : 'w-full container px-6 py-2 bg-transparent'
  }`}>
```

---

## 7. Footer

### File: `components/layout/footer.tsx`

| Element | Current | Mockup | Changes Needed |
|---------|---------|--------|----------------|
| **Background** | `bg-brown-900` solid | Gradient `from-[#D4BCAA] to-[#F4EEE7]` | Change to warm gradient |
| **Text Color** | `text-brown-100` | `text-[#382821]` with opacity variants | Darker text on light bg |
| **Grid Columns** | `md:grid-cols-3` | `lg:grid-cols-12` (4+3+5 split) | More sophisticated grid |
| **Social Icons** | `bg-brown-800` | `bg-[#382821]` full | Match mockup colors |
| **Contact Cards** | List format | Boxed cards with backgrounds | Add card wrappers |
| **Link Bullets** | None | Small colored dots | Add dot indicators |

### Current:
```tsx
<footer className="bg-brown-900 border-t border-brown-800 text-brown-100">
```

### Mockup:
```tsx
<footer className="bg-gradient-to-r from-[#D4BCAA] to-[#F4EEE7] border-t border-[#382821]/10 pt-20 pb-10">
```

---

## Priority Order for Migration

### Phase 1: Foundation (Critical)
1. ✅ Add Poppins font to project
2. ✅ Update color palette in CSS variables
3. ✅ Add glassmorphism utility classes
4. ✅ Add noise texture overlay

### Phase 2: Components (High Priority)
1. ⬜ Redesign Hero section
2. ⬜ Redesign Benefit cards
3. ⬜ Redesign Pricing cards
4. ⬜ Redesign Testimonials
5. ⬜ Redesign FAQ accordion

### Phase 3: Layout (Medium Priority)
1. ⬜ Implement morphing header
2. ⬜ Redesign footer with gradient
3. ⬜ Update article cards

### Phase 4: Polish (Lower Priority)
1. ⬜ Add floating cards to hero
2. ⬜ Add custom scrollbar
3. ⬜ Fine-tune animations
4. ⬜ Add micro-interactions

---

## Quick Reference: Color Mapping

| Current Class | Mockup Equivalent |
|--------------|-------------------|
| `text-neutral-900` | `text-secondary` (#382821) |
| `text-neutral-700` | `text-secondary/70` |
| `text-teal-600` | `text-primary` (#466A68) |
| `text-teal-700` | `text-primaryDark` (#2F4A48) |
| `bg-teal-600` | `bg-primary` |
| `bg-teal-100` | `bg-primary/10` |
| `text-coral-500` | `text-accent` (#C48B77) |
| `bg-[#FDF8F3]` | `bg-white/40` or remove |
| `bg-[#E8DDD4]` | Remove, use transparent with blobs |
