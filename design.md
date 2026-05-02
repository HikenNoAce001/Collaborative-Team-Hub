# 🚀 Next.js Animation & Theme Guide

This document provides a complete setup reference for animation libraries and design system choices for a modern Next.js application.

---

# 🧩 Animation Libraries

## 🥇 Core Stack (Primary)

### 1. Framer Motion
- Docs: https://www.framer.com/motion/
- NPM: https://www.npmjs.com/package/framer-motion
- Install:
```bash
npm install framer-motion
```
- Usage: UI animations, page transitions, gestures

---

### 2. GSAP (GreenSock)
- Docs: https://greensock.com/docs/
- NPM: https://www.npmjs.com/package/gsap
- Install:
```bash
npm install gsap
```
- Usage: complex timelines, scroll animations (ScrollTrigger), hero sections

---

### 3. React Spring
- Docs: https://react-spring.dev/
- NPM: https://www.npmjs.com/package/@react-spring/web
- Install:
```bash
npm install @react-spring/web
```
- Usage: physics-based animations

---

## ⚡ Utility Libraries

### AutoAnimate
- Docs: https://auto-animate.formkit.com/
- NPM: https://www.npmjs.com/package/@formkit/auto-animate
- Install:
```bash
npm install @formkit/auto-animate
```
- Usage: zero-config animations for lists/layouts

---

### React Transition Group
- Docs: https://reactcommunity.org/react-transition-group/
- NPM: https://www.npmjs.com/package/react-transition-group
- Install:
```bash
npm install react-transition-group
```

---

## 🎨 Creative / Advanced

### Anime.js
- Docs: https://animejs.com/
- NPM: https://www.npmjs.com/package/animejs
- Install:
```bash
npm install animejs
```

---

### Three.js
- Docs: https://threejs.org/docs/
- NPM: https://www.npmjs.com/package/three
- Install:
```bash
npm install three
```
- Usage: 3D/WebGL experiences

---

### Lottie (React)
- Docs: https://lottiereact.com/
- NPM: https://www.npmjs.com/package/lottie-react
- Install:
```bash
npm install lottie-react
```
- Usage: designer-provided JSON animations

---

## 🌊 Scroll / UX Enhancements

### Lenis
- Docs: https://lenis.studiofreight.com/
- NPM: https://www.npmjs.com/package/@studio-freight/lenis
- Install:
```bash
npm install @studio-freight/lenis
```

---

### Locomotive Scroll
- Docs: https://locomotivemtl.github.io/locomotive-scroll/
- NPM: https://www.npmjs.com/package/locomotive-scroll
- Install:
```bash
npm install locomotive-scroll
```

---

# 🔥 Recommended Stack

## Default Combination
- framer-motion → UI + transitions
- gsap (+ ScrollTrigger) → advanced + scroll
- auto-animate → quick UI polish

## Optional Add-ons
- lenis → smooth scrolling
- lottie-react → animation assets
- three → 3D only when required

---

# 🎨 Design System (Dark & Light Theme)

## 🌙 Dark Theme

### Base Colors
```
Background: #0B0F19
Surface: #111827
Border: #1F2937
```

### Text
```
Primary: #E5E7EB
Secondary: #9CA3AF
```

### Accent Options (choose one)
```
Indigo: #6366F1
Purple: #8B5CF6
Blue: #3B82F6
Cyan: #06B6D4
Emerald: #10B981
```

### Gradients
```
linear-gradient(135deg, #6366F1, #8B5CF6)
linear-gradient(135deg, #06B6D4, #3B82F6)
```

---

## ☀️ Light Theme

### Base Colors
```
Background: #F9FAFB
Surface: #FFFFFF
Border: #E5E7EB
```

### Text
```
Primary: #111827
Secondary: #6B7280
```

### Gradients
```
linear-gradient(135deg, #EEF2FF, #E0F2FE)
linear-gradient(135deg, #F0FDF4, #ECFEFF)
```

---

# 🎯 Design Rules

- Use ONE primary gradient across the app
- Avoid pure black (#000) and pure white (#FFF)
- Keep border radius consistent (e.g., rounded-2xl)
- Limit to 1–2 accent colors
- Prefer soft shadows over hard borders
- Combine motion + color on hover

---

# ⚡ Performance Guidelines

- Use transform and opacity for animations
- Avoid layout thrashing (width/height animations)
- Lazy load heavy libraries (gsap, three)
- Use dynamic imports in Next.js

Example:
```ts
const Component = dynamic(() => import('./HeavyComponent'), { ssr: false })
```

---

# 🎨 Color Resources

- https://tailwindcss.com/docs/customizing-colors
- https://coolors.co/
- https://uigradients.com/
- https://gradienthunt.com/
- https://www.happyhues.co/

---

# 🧠 Final Notes

- Start simple: framer-motion + Tailwind
- Add GSAP only when needed
- Maintain consistency in motion + color
- Avoid over-animation

---

End of document.

