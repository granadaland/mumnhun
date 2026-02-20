# Design Patterns Documentation

> Extracted from `mumnhun-design` mockup repository  
> Reference for implementing premium UI/UX in `mumnhun-nextjs`

---

## Table of Contents

1. [Hero Section](#1-hero-section)
2. [Navigation/Header](#2-navigationheader)
3. [Features/Benefits Section](#3-featuresbenefits-section)
4. [Pricing Cards](#4-pricing-cards)
5. [About Section](#5-about-section)
6. [Testimonials](#6-testimonials)
7. [FAQ Accordion](#7-faq-accordion)
8. [Articles/Blog Cards](#8-articlesblog-cards)
9. [Footer](#9-footer)
10. [Global Effects & Animations](#10-global-effects--animations)

---

## 1. Hero Section

### Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HERO SECTION                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────┐   ┌──────────────────────────────┐   │
│  │  BADGE: "Solusi No.1..."     │   │                              │   │
│  │  (pulse animation)            │   │  ┌────────────────────────┐ │   │
│  │                               │   │  │ RATING FLOATING CARD  │ │   │
│  │  H1: Kualitas ASI Terjaga,    │   │  └────────────────────────┘ │   │
│  │      Hati Ibu Tenang          │   │                              │   │
│  │  (gradient text + underline)  │   │     ╭───────────────────╮    │   │
│  │                               │   │     │    MAIN IMAGE     │    │   │
│  │  PARAGRAPH: Description...    │   │     │    (Carousel)     │    │   │
│  │                               │   │     ╰───────────────────╯    │   │
│  │  ┌──────────┐ ┌──────────┐   │   │                              │   │
│  │  │ CTA Btn  │ │ Alt Btn  │   │   │  ┌────────────────────────┐ │   │
│  │  └──────────┘ └──────────┘   │   │  │ FEATURE FLOATING CARD │ │   │
│  │                               │   │  └────────────────────────┘ │   │
│  │  TRUST: 🛡️ Garansi | 700+   │   │                              │   │
│  └──────────────────────────────┘   └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Styling Classes

```tsx
// Section container
<section className="pt-36 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden relative">

// Background gradient (LEFT to RIGHT warm transition)
<div className="absolute inset-0 bg-gradient-to-r from-[#FFFBF7] via-[#F3E7DB] to-[#E2CDBA] -z-20" />

// Badge with pulse animation
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-white/50 backdrop-blur-sm shadow-sm">
  <span className="animate-ping absolute ... bg-primary opacity-75" />
</div>

// Hero heading
<h1 className="text-4xl md:text-6xl xl:text-7xl font-bold text-secondary leading-[1.1] tracking-tight">

// Gradient text
<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primaryDark">

// Primary CTA Button
<button className="bg-primary text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1">

// Secondary Button
<button className="bg-white/50 border border-white hover:bg-white text-secondary px-8 py-4 rounded-full font-semibold backdrop-blur-sm">

// Main image container
<div className="rounded-[3rem] overflow-hidden shadow-2xl shadow-stone-900/10 border-8 border-white/40">

// Floating cards
<div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-xl shadow-stone-200/50 border border-white animate-bounce-slow">
```

---

## 2. Navigation/Header

### Behavior

- **Sticky** fixed to top with z-60
- **Morphs** on scroll: Full-width → Floating pill with blur

### Key Styling Classes

```tsx
// Nav container
<nav className="fixed z-[60] w-full flex justify-center pt-6">

// Pill container (when scrolled)
<div className="w-[92%] md:w-[85%] max-w-5xl bg-white/80 backdrop-blur-md border border-white/50 shadow-soft rounded-full px-6 py-3">

// Logo icon
<div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/10">

// Nav links
<a className="px-4 py-2 text-sm font-medium text-secondary/80 hover:text-primary rounded-full hover:bg-primary/5">

// CTA Button (scrolled state)
<button className="bg-primary text-white hover:bg-primaryDark px-6 py-2.5 rounded-full shadow-lg shadow-primary/25">

// Mobile menu dropdown
<div className="bg-white/95 backdrop-blur-2xl border border-white/60 p-4 shadow-2xl rounded-[2rem]">
```

---

## 3. Features/Benefits Section

### Structure

- 6 cards in 3x2 grid (lg) / 2 columns (md) / 1 column (mobile)
- Each card has: Icon box, Title, Description, Decorative line

### Key Styling Classes

```tsx
// Section
<section className="py-24 px-6 relative">

// Section heading
<h2 className="text-3xl md:text-5xl font-bold text-secondary tracking-tight">
  Kenapa Harus <span className="text-primary relative inline-block">
    Mum 'n Hun?
    <span className="absolute bottom-2 left-0 w-full h-2 bg-accent/20 -z-10 rounded-full" />
  </span>
</h2>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

// Feature card
<div className="group bg-white/40 hover:bg-white border border-white/60 hover:border-white p-8 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:shadow-stone-200/50 backdrop-blur-sm">

// Icon box
<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-white shadow-sm flex items-center justify-center text-accent group-hover:scale-110 group-hover:rotate-3 transition-all">

// Decorative line (bottom)
<div className="w-12 h-1 bg-gray-200 rounded-full mt-auto group-hover:w-full group-hover:bg-primary/20 transition-all duration-500">
```

---

## 4. Pricing Cards

### Structure

- 3 cards in horizontal row (md) / stacked (mobile)
- Middle card (Popular) is scaled up and highlighted

### Key Styling Classes

```tsx
// Section
<section className="py-24 px-6 relative bg-white/40 overflow-hidden">

// Background decor
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/5 blur-[120px] rounded-full -z-10">

// Tag/Badge
<div className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent font-semibold text-sm">

// Card container
<div className="flex flex-col md:flex-row gap-8 lg:gap-12 justify-center items-center md:items-stretch">

// Regular card
<div className="w-full md:w-1/3 max-w-sm rounded-[2.5rem] p-8 lg:p-10 bg-white/40 backdrop-blur-md border border-white/60 hover:border-primary/30 hover:bg-white/80 hover:shadow-xl hover:-translate-y-2">

// Popular card (scaled)
<div className="... bg-white/90 backdrop-blur-xl ring-4 ring-primary/10 shadow-2xl shadow-primary/10 scale-100 md:scale-110 z-10">

// Popular badge
<div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primaryDark text-white px-6 py-2 rounded-full shadow-lg shadow-primary/30">

// Duration label
<h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">

// Price
<div className="text-4xl lg:text-5xl font-bold tracking-tight">

// Feature list item
<li className="flex items-start gap-3 text-sm text-gray-700">
  <div className="rounded-full p-0.5 bg-primary/10 text-primary">
    <CheckCircle2 size={14} strokeWidth={3} />
  </div>
  <span className="leading-tight font-medium text-secondary/80">{feature}</span>
</li>

// CTA Button (Popular)
<button className="w-full py-4 rounded-2xl font-bold bg-primary hover:bg-primaryDark text-white shadow-lg shadow-primary/25 uppercase tracking-wide">
```

---

## 5. About Section

### Structure

- Two-column layout: Video on left, Text content on right
- Video has play button overlay with ripple animation
- Stats section at bottom of text

### Key Styling Classes

```tsx
// Section
<section className="py-20 px-6 bg-white/40">

// Video container
<div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border-4 border-white aspect-video">

// Play button
<div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover/btn:scale-110">
  <Play className="w-6 h-6 text-primary fill-primary translate-x-0.5" />
</div>

// Section tag
<div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm">

// Stats grid
<div className="grid grid-cols-3 gap-4 border-t border-secondary/10 pt-8">
  <div className="flex flex-col">
    <span className="text-3xl font-bold text-primary">2010</span>
    <span className="text-sm text-gray-500 mt-1">Berdiri Sejak</span>
  </div>
</div>
```

---

## 6. Testimonials

### Structure

- Large glass card with image and quote
- Carousel navigation (prev/next)
- Floating rating badge on image

### Key Styling Classes

```tsx
// Section
<section className="py-24 px-6 relative overflow-hidden">

// Background blobs
<div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2">
<div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl translate-y-1/3">

// Navigation buttons
<button className="w-14 h-14 rounded-full border border-secondary/10 hover:bg-primary hover:text-white hover:border-primary">

// Main card
<div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-8 md:p-16 shadow-soft border border-white/60 min-h-[420px] md:min-h-[350px]">

// Image with gradient overlay
<div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-[2rem] blur-lg opacity-40">
<img className="w-40 h-40 md:w-56 md:h-56 rounded-[2rem] object-cover shadow-lg border-4 border-white rotate-3 group-hover:rotate-0">

// Rating badge
<div className="absolute -bottom-5 right-0 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-gray-100">

// Quote
<p className="text-xl md:text-3xl text-secondary font-medium leading-relaxed tracking-tight">

// Author info
<div className="border-l-4 border-accent pl-5">
  <h4 className="text-xl font-bold text-secondary">{name}</h4>
  <p className="text-secondary/50 text-sm font-medium uppercase tracking-wider mt-1">{role}</p>
</div>
```

---

## 7. FAQ Accordion

### Key Styling Classes

```tsx
// Container
<div className="space-y-4">

// Accordion item
<div className={`border rounded-2xl bg-white/50 backdrop-blur-sm ${
  openFaq === idx 
    ? 'border-primary/50 shadow-lg shadow-primary/5' 
    : 'border-white/60 hover:border-primary/30'
}`}>

// Question trigger
<button className="w-full flex items-center justify-between p-5 text-left">
  <span className={`font-semibold ${openFaq === idx ? 'text-primary' : 'text-secondary'}`}>

// Chevron icon
<div className={`p-1 rounded-full ${openFaq === idx ? 'bg-primary text-white rotate-180' : 'bg-gray-100 text-gray-500'}`}>
  <ChevronDown size={16} />
</div>

// Answer (animated height)
<div className={`grid transition-[grid-template-rows] duration-300 ${
  openFaq === idx ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
}`}>
  <div className="overflow-hidden">
    <div className="p-5 pt-0 text-gray-600 leading-relaxed">
```

---

## 8. Articles/Blog Cards

### Key Styling Classes

```tsx
// Card container
<div className="group flex gap-5 p-4 rounded-3xl bg-white/40 hover:bg-white/80 border border-white/60 hover:shadow-xl hover:shadow-stone-200/50 backdrop-blur-sm cursor-pointer">

// Image
<div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm">
  <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
</div>

// Date badge
<div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/5 w-fit px-2 py-1 rounded-md">

// Title
<h4 className="font-bold text-secondary text-lg leading-tight group-hover:text-primary transition-colors">

// Read more link
<span className="text-sm text-gray-400 flex items-center gap-1 group-hover:translate-x-2 transition-transform duration-300">
  Baca selengkapnya <ArrowRight size={14} />
</span>
```

---

## 9. Footer

### Structure

- Warm gradient background
- 3 columns: Brand + Socials | Links | Contact info

### Key Styling Classes

```tsx
// Footer container
<footer className="bg-gradient-to-r from-[#D4BCAA] to-[#F4EEE7] border-t border-[#382821]/10 pt-20 pb-10">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
  <div className="lg:col-span-4"> // Brand section
  <div className="lg:col-span-3"> // Links section
  <div className="lg:col-span-5"> // Contact section

// Social icon button
<a className="w-10 h-10 rounded-full bg-[#382821] text-[#D4BCAA] flex items-center justify-center hover:bg-[#466A68] hover:-translate-y-1 shadow-lg">

// Link item
<a className="text-[#382821]/70 hover:text-[#466A68] hover:font-medium hover:translate-x-1 inline-flex items-center gap-2">
  <span className="w-1.5 h-1.5 rounded-full bg-[#466A68]/50" />
  {linkText}
</a>

// Contact card
<div className="bg-[#382821]/5 p-4 rounded-2xl hover:bg-[#382821]/10">

// Bottom bar
<div className="border-t border-[#382821]/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-[#382821]/50">
```

---

## 10. Global Effects & Animations

### Paper Texture (Noise overlay)

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* Noise SVG */
  pointer-events: none;
  z-index: 50;
  opacity: 0.03;
}
```

### Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: rgba(240, 229, 216, 0.5);
}
::-webkit-scrollbar-thumb {
  background: #C48B77; /* accent */
  border-radius: 5px;
  border: 2px solid #F0E5D8;
}
::-webkit-scrollbar-thumb:hover {
  background: #466A68; /* primary */
}
```

### Common Transitions

```tsx
// Hover lift
hover:-translate-y-1 transition-transform // or hover:-translate-y-2

// Scale on hover
hover:scale-110 transition-transform
group-hover:scale-105 transition-transform

// Color transitions
transition-colors duration-300
transition-all duration-500

// Shadow transitions
shadow-lg hover:shadow-xl transition-shadow
```

### Glassmorphism Pattern

```tsx
// Glass card
bg-white/40 backdrop-blur-md // or backdrop-blur-sm
bg-white/60 backdrop-blur-2xl // Stronger blur
bg-white/90 backdrop-blur-xl // Near-opaque with blur

// Glass border
border border-white/50
border border-white/60
```

### Animation Classes (Custom)

```tsx
animate-bounce-slow   // Slow bounce for floating cards
animate-float         // Floating animation
animate-ping          // Pulse/ping animation (Tailwind built-in)
animate-fade-in-up    // Fade in from below
```

---

## Summary: Design Philosophy

1. **Glassmorphism** - Frosted glass cards with backdrop blur
2. **Warm Earth Tones** - Beige, cream, forest teal, terracotta
3. **Large Border Radius** - `rounded-[2rem]` to `rounded-[3rem]` for main elements
4. **Subtle Shadows** - `shadow-soft`, `shadow-stone-200/50` for depth
5. **Micro-interactions** - Hover lifts, scale transforms, color transitions
6. **Responsive Typography** - Mobile-first with responsive sizing
7. **Premium Feel** - Noise texture, custom scrollbar, floating elements
