<!--
design-ref.md — REFERENCJA STYLU (źródło: specyfikacja prezentacji UniCredit, SGH 2026-05-13), dostarczona przez Piotra 2026-10-04.
NIE jest to jeszcze spec frontu solana-escrow. Adaptacja (co bierzemy, co odrzucamy) zostanie dopisana jako osobna sekcja po decyzji Piotra.
Elementy specyficzne dla slajdów (deck, 1920x1080, progress dots, brak hover, logo UniCredit) nie przenoszą się 1:1 na aplikację webową.
-->

# DESIGN SPECIFICATION — UniCredit Presentation

---

## 1. Ton wizualny i inspiracje

### Ogólny charakter
Prezentacja opiera się na dwóch systemach estetycznych: **ciemny glassmorphizm** (tło gradienty głębokiego granatu/teal) oraz **liquid glass** (srebrno-szare elementy ramkujące, podkładki, detale). Efekt końcowy: premium, technologiczna prezentacja bankowa — nie korporacyjna nuda, ale też nie startup-flashy. Myśl: **Raport składany zarządowi w 2027 roku**.

### Inspiracje
- **Material You**: wielowarstwowe tła, organiczne kształty blur, micro-animations
- **Liquid Glass / Apple Vision Pro UI**: semi-transparent panele z frosted glass, dynamiczne refleksy
- **Canva reference slide**: podkładki pod zdjęcia jako lekko pochylone ramki z gradientem glass, tło z gradientem nieregularnym na każdym slajdzie

### Zasada nieregularności
Każdy slajd ma inne ułożenie gradientu tła — nigdy dwa slajdy z identycznym rozkładem. Gradient przesuwa się, rotuje, zmienia punkt środkowy. To kluczowy element żywości prezentacji.

### Nastrój
- Technologia, ale ludzka
- Bezpieczeństwo i precyzja (bank)
- Polskie innowacje na europejską skalę
- Pewność siebie bez przechwalania się

---

## 2. Paleta kolorów (z hex, zastosowaniem, zakazami)

### Kolory podstawowe — tło i przestrzeń

| Nazwa | HEX | Zastosowanie |
|---|---|---|
| Deep Navy | `#012132` | Punkt startowy gradientu tła |
| Midnight Teal | `#002c3c` | Środek gradientu tła |
| Ocean Teal | `#005967` | Punkt końcowy gradientu, jasne akcenty tła |
| Dark Base | `#011520` | Najciemniejsze tło, overlay na zdjęciach |

### Kolory glass i srebrne detale

| Nazwa | Wartość | Zastosowanie |
|---|---|---|
| Glass White | `#ffffff` | Start gradientu ramek, podkładek, border-top |
| Glass Silver | `#9c9b9b` | Koniec gradientu ramek i podkładek |
| Glass Fill | `rgba(255,255,255,0.09)` | Wypełnienie paneli glass |
| Glass Border | `rgba(255,255,255,0.18)` | Obramowanie komponentów glass |
| Glass Shine | `rgba(255,255,255,0.35)` | Refleks/połysk na górnej krawędzi |
| Glass Frost | `rgba(156,155,155,0.08)` | Tło frosted glass (ciemna wersja) |

### Kolor akcentowy — wyrównania i wyróżnienia

| Nazwa | HEX | Zastosowanie |
|---|---|---|
| Signal Red | `#ff323f` | Podkreślenia, overlines, aktywne nav, wybrane dane, active progress dot |

### Kolor tekstu

| Nazwa | Wartość | Zastosowanie |
|---|---|---|
| Primary Text | `#ffffff` | Główny tekst slajdów |
| Secondary Text | `rgba(255,255,255,0.75)` | Podtytuły, opisy, body text |
| Muted Text | `rgba(255,255,255,0.45)` | Captions, metadane, etykiety |
| Red Text | `#ff323f` | Tylko kluczowe liczby/wyróżnienia, max 1–2 na slajd |

### Zasady (zakazy)

- ❌ Nigdy `background: white` ani `background: #fff` — tło zawsze gradient
- ❌ Nigdy `color: black` — tekst zawsze biały lub rgba(255,255,255,x)
- ❌ `#ff323f` nie może dominować — max 1–2 elementy per slajd
- ❌ Gradient tła nie może być taki sam na dwóch slajdach
- ❌ Żadnych płaskich jednokolorowych kart bez glass/shadow efektu
- ❌ Czcionki: max 3–4 różne face'y w całej prezentacji

---

## 3. Typografia (fonty, hierarchia, rozmiary, przykłady użycia)

### Wybrane kroje (max 4)

| Rola | Font | Weights | Źródło |
|---|---|---|---|
| **Display / Hero** | `Inter` | 700, 800 | Google Fonts |
| **Body / Slide text** | `Inter` | 400, 500 | Google Fonts |
| **Data / Numbers** | `JetBrains Mono` | 400, 700 | Google Fonts |
| **Labels / Caps** | `Inter` | 600 (letter-spacing: 0.08em) | Google Fonts |

> Inter jest szeroko stosowany w fintech/banking i dobrze wygląda na ekranach. JetBrains Mono dla liczb/statystyk nadaje precyzji technologicznej.

### Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Hierarchia i skala (slajd 1920×1080px = 100vw×56.25vw)

| Poziom | Font | Size | Weight | Line-height | Letter-spacing | Kolor |
|---|---|---|---|---|---|---|
| **Slide Title (H1)** | Inter | `clamp(2.8rem, 4vw, 4.2rem)` | 800 | 1.1 | -0.02em | `#ffffff` |
| **Section Header (H2)** | Inter | `clamp(1.8rem, 2.8vw, 2.8rem)` | 700 | 1.2 | -0.01em | `#ffffff` |
| **Card Title (H3)** | Inter | `clamp(1.1rem, 1.6vw, 1.6rem)` | 600 | 1.3 | 0 | `#ffffff` |
| **Body Large** | Inter | `clamp(0.95rem, 1.2vw, 1.2rem)` | 400 | 1.6 | 0 | `rgba(255,255,255,0.8)` |
| **Body Small** | Inter | `clamp(0.8rem, 1vw, 1rem)` | 400 | 1.5 | 0 | `rgba(255,255,255,0.65)` |
| **Data / KPI** | JetBrains Mono | `clamp(2rem, 3.5vw, 4rem)` | 700 | 1.0 | -0.02em | `#ffffff` |
| **Label / Caps** | Inter | `clamp(0.65rem, 0.8vw, 0.8rem)` | 600 | 1.4 | 0.08em | `rgba(255,255,255,0.55)` |
| **Overline** | Inter | `0.7rem` | 600 | 1.4 | 0.12em | `#ff323f` |

### CSS Variables

```css
:root {
  --font-display: 'Inter', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --text-h1:      clamp(2.8rem, 4vw, 4.2rem);
  --text-h2:      clamp(1.8rem, 2.8vw, 2.8rem);
  --text-h3:      clamp(1.1rem, 1.6vw, 1.6rem);
  --text-body-lg: clamp(0.95rem, 1.2vw, 1.2rem);
  --text-body-sm: clamp(0.8rem, 1vw, 1rem);
  --text-kpi:     clamp(2rem, 3.5vw, 4rem);
  --text-label:   clamp(0.65rem, 0.8vw, 0.8rem);
}
```

---

## 4. Tło i gradienty (warianty per slajd, zasada nieregularności)

### Zasada nieregularności
Każdy slajd dostaje inny wariant gradientu. Kombinacja: inne `background-position`, `angle`, `radial center`, lub dodatkowe `radial-gradient` overlay. Nigdy dwa slajdy identyczne.

### Bazowe tokeny gradientu

```css
:root {
  --c-deep:  #012132;
  --c-mid:   #002c3c;
  --c-teal:  #005967;
  --c-dark:  #011520;
}
```

### Warianty gradientu tła (13 slajdów)

```css
/* SLIDE 1 — Wstęp: gradient z lewego-dolnego rogu */
.slide-bg-1 {
  background:
    radial-gradient(ellipse 80% 60% at 15% 85%, #005967 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 85% 20%, #012132 0%, transparent 50%),
    linear-gradient(135deg, #011520 0%, #002c3c 50%, #005967 100%);
}

/* SLIDE 2 — Wyzwanie: gradient centralny, ciemny obwód */
.slide-bg-2 {
  background:
    radial-gradient(ellipse 70% 70% at 50% 40%, #002c3c 0%, #011520 70%),
    radial-gradient(ellipse 40% 30% at 80% 80%, #005967 0%, transparent 60%),
    linear-gradient(180deg, #012132 0%, #011520 100%);
}

/* SLIDE 3 — Luka technologiczna: gradient z prawej */
.slide-bg-3 {
  background:
    radial-gradient(ellipse 65% 80% at 90% 50%, #005967 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 10% 10%, #012132 0%, transparent 60%),
    linear-gradient(120deg, #011520 0%, #002c3c 60%, #003d4d 100%);
}

/* SLIDE 4 — Status quo: ciemny, napięty */
.slide-bg-4 {
  background:
    radial-gradient(ellipse 90% 50% at 50% 0%, #002c3c 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 20% 90%, #005967 0%, transparent 50%),
    linear-gradient(200deg, #012132 0%, #011520 80%, #002c3c 100%);
}

/* SLIDE 5 — Straty wizerunkowe: ciemny z minimalnym czerwonym podtonem */
.slide-bg-5 {
  background:
    radial-gradient(ellipse 60% 60% at 70% 30%, #002c3c 0%, transparent 60%),
    radial-gradient(ellipse 30% 30% at 5% 95%, rgba(255,50,63,0.06) 0%, transparent 50%),
    linear-gradient(160deg, #011520 0%, #002c3c 55%, #003540 100%);
}

/* SLIDE 6 — Rozwiązanie: optymistyczny, teal dominuje */
.slide-bg-6 {
  background:
    radial-gradient(ellipse 75% 65% at 30% 60%, #005967 0%, transparent 60%),
    radial-gradient(ellipse 50% 50% at 80% 10%, #002c3c 0%, transparent 55%),
    linear-gradient(145deg, #002c3c 0%, #005967 70%, #003d4d 100%);
}

/* SLIDE 7 — Dane: techniczny, precyzyjny */
.slide-bg-7 {
  background:
    radial-gradient(ellipse 45% 70% at 50% 50%, #002c3c 0%, #011520 80%),
    radial-gradient(ellipse 60% 30% at 95% 5%, #005967 0%, transparent 55%),
    linear-gradient(170deg, #011520 0%, #012132 40%, #002c3c 100%);
}

/* SLIDE 8 — Profilowanie: przestrzenny, wielowarstwowy */
.slide-bg-8 {
  background:
    radial-gradient(ellipse 80% 40% at 50% 100%, #005967 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 0% 0%, #002c3c 0%, transparent 55%),
    linear-gradient(110deg, #012132 0%, #002c3c 50%, #011520 100%);
}

/* SLIDE 9 — Segmentacja: analityczny */
.slide-bg-9 {
  background:
    radial-gradient(ellipse 55% 55% at 15% 50%, #005967 0%, transparent 60%),
    radial-gradient(ellipse 55% 35% at 85% 80%, #012132 0%, transparent 55%),
    linear-gradient(190deg, #002c3c 0%, #011520 60%, #005967 100%);
}

/* SLIDE 10 — Przykład Pana Marka: narracyjny, spokojny */
.slide-bg-10 {
  background:
    radial-gradient(ellipse 70% 50% at 60% 20%, #002c3c 0%, transparent 55%),
    radial-gradient(ellipse 45% 65% at 10% 80%, #005967 0%, transparent 55%),
    linear-gradient(155deg, #011520 0%, #002c3c 45%, #003d4d 100%);
}

/* SLIDE 11 — Opłacalność: pewny, mocny */
.slide-bg-11 {
  background:
    radial-gradient(ellipse 85% 45% at 50% 110%, #005967 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 90% 10%, #002c3c 0%, transparent 55%),
    linear-gradient(130deg, #012132 0%, #005967 60%, #002c3c 100%);
}

/* SLIDE 12 — Made in Poland: dumny, energiczny */
.slide-bg-12 {
  background:
    radial-gradient(ellipse 60% 60% at 80% 50%, #005967 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 20% 20%, rgba(255,50,63,0.05) 0%, transparent 50%),
    linear-gradient(115deg, #011520 0%, #002c3c 50%, #005967 100%);
}

/* SLIDE 13 — Podsumowanie: pełny krąg, powrót ale jaśniej */
.slide-bg-13 {
  background:
    radial-gradient(ellipse 90% 90% at 50% 50%, #002c3c 0%, #011520 70%),
    radial-gradient(ellipse 55% 40% at 95% 95%, #005967 0%, transparent 60%),
    linear-gradient(135deg, #012132 0%, #002c3c 40%, #005967 100%);
}
```

### Dekoracyjne blury ambient (nakładane na tło)

```css
.slide-ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.18;
}

.blob-teal  { background: #005967; width: 500px; height: 500px; }
.blob-navy  { background: #012132; width: 400px; height: 300px; }
.blob-glass { background: rgba(255,255,255,0.08); width: 350px; height: 350px; }
```

---

## 5. Komponenty — Glass Elements (ramki, podkładki pod zdjęcia, liquid glass)

### Filozofia Glass
Glass elementy to "srebrno-szare" podkładki i ramki — gradient od `#ffffff` do `#9c9b9b`, ze zmiennym opacity naprzemiennie. Dają efekt metalu/szkła na ciemnym tle. Używamy ich jako: podkładki pod zdjęcia, obramowania kart, panele z treścią.

### CSS Variables dla Glass

```css
:root {
  --glass-fill:       rgba(255, 255, 255, 0.09);
  --glass-border-top: rgba(255, 255, 255, 0.40);
  --glass-border:     rgba(255, 255, 255, 0.18);
  --glass-border-dim: rgba(255, 255, 255, 0.08);
  --glass-blur:       blur(16px) saturate(180%);

  /* Gradient srebrny dla ramek / podkładek — naprzemiennie */
  --silver-grad-a: linear-gradient(135deg, #ffffff 0%, #9c9b9b 100%);
  --silver-grad-b: linear-gradient(135deg, #9c9b9b 0%, #ffffff 100%);
  --silver-grad-h: linear-gradient(90deg,  #ffffff 0%, #9c9b9b 100%);
  --silver-grad-v: linear-gradient(180deg, #ffffff 0%, #9c9b9b 100%);
}
```

### Panel Glass (treść na slajdzie)

```html
<div class="glass-panel">
  <!-- content -->
</div>
```

```css
.glass-panel {
  background: var(--glass-fill);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-top-color: var(--glass-border-top);
  border-radius: 14px;
  padding: 2rem 2.4rem;
  position: relative;
  overflow: hidden;
}

/* Refleks na górnej krawędzi */
.glass-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  pointer-events: none;
}
```

### Ramka Silver-Glass (gradient #fff → #9c9b9b przez pseudo-element)

```css
/* Wariant A — gradient od lewej do prawej */
.silver-frame {
  position: relative;
  border-radius: 14px;
}
.silver-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  padding: 1.5px;
  background: linear-gradient(135deg, #ffffff 0%, #9c9b9b 50%, rgba(156,155,155,0.2) 100%);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Wariant B — odwrócony gradient (naprzemiennie na slajdach) */
.silver-frame-b::before {
  background: linear-gradient(135deg, #9c9b9b 0%, #ffffff 60%, rgba(255,255,255,0.15) 100%);
}

/* Wariant C — pionowy */
.silver-frame-v::before {
  background: linear-gradient(180deg, #ffffff 0%, #9c9b9b 100%);
}
```

### Podkładka pod zdjęcie (image-frame — lekka, bez ciężkiego paddingu)

```html
<div class="image-frame silver-frame">
  <img src="photo.jpg" alt="..." class="image-frame__img">
</div>
```

```css
.image-frame {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}

.image-frame__img {
  display: block;
  width: 100%;
  border-radius: 10px;
  object-fit: cover;
}
```

### Separator glass (linia z gradientem)

```css
.glass-separator {
  height: 1px;
  border: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.35) 20%,
    rgba(156,155,155,0.5) 50%,
    rgba(255,255,255,0.20) 80%,
    transparent 100%
  );
  margin: 1.5rem 0;
}
```

---

## 6. Glow efekty — delikatna poświata (bez neumorphizmu)

### Filozofia
Nie stosujemy neumorphizmu (chiseled edges, inset-well, extruded shadows). Zamiast niego — wyłącznie delikatna zewnętrzna poświata (`box-shadow` z dużym blur i niskim alpha) na elementach, które chcemy wyróżnić lub podświetlić przy wejściu na slajd. Poświata aktywuje się tylko przy wejściu slajdu (klasa `.is-glowing` dodawana przez JS), nigdy on-hover.

### Tokeny poświaty

```css
:root {
  --glow-white-sm: 0 0 14px rgba(255,255,255,0.12);
  --glow-white-md: 0 0 28px rgba(255,255,255,0.16);
  --glow-red-sm:   0 0 14px rgba(255,50,63,0.22);
  --glow-red-md:   0 0 28px rgba(255,50,63,0.28);
}
```

### Klasa poświaty (aktywowana przy wejściu slajdu)

```css
/* Delikatna biała poświata — np. ramka zdjęcia lub karta którą chcemy wyróżnić */
.glow-on-enter {
  box-shadow: var(--glow-white-sm);
  transition: box-shadow 600ms cubic-bezier(0.2, 0, 0, 1);
}

.is-glowing .glow-on-enter {
  box-shadow: var(--glow-white-md);
}

/* Czerwona poświata — np. aktywny tech-tag lub kluczowy KPI */
.glow-red-on-enter {
  box-shadow: var(--glow-red-sm);
  transition: box-shadow 600ms cubic-bezier(0.2, 0, 0, 1);
}

.is-glowing .glow-red-on-enter {
  box-shadow: var(--glow-red-md);
}
```

### JS — aktywacja przy wejściu slajdu

```js
// Dodawane w _triggerEntrances() klasy Deck
slide.querySelectorAll('.glow-on-enter, .glow-red-on-enter').forEach(el => {
  el.classList.remove('is-glowing');
  void el.offsetHeight; // reflow
  el.classList.add('is-glowing');
});
```

---

## 7. Komponenty — Karty i kontenery

### Karta bazowa (glass)

```html
<div class="card-base">
  <p class="card-overline">KATEGORIA</p>
  <h3 class="card-title">Tytuł karty</h3>
  <p class="card-body">Treść karty...</p>
</div>
```

```css
.card-base {
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.14);
  border-top-color: rgba(255,255,255,0.30);
  border-radius: 14px;
  padding: 1.8rem 2rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  position: relative;
  overflow: hidden;
}

.card-base::before {
  content: '';
  position: absolute;
  top: 0; left: 10%; right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  pointer-events: none;
}

.card-overline {
  font-size: var(--text-label);
  font-weight: 600;
  letter-spacing: 0.10em;
  color: #ff323f;
  text-transform: uppercase;
  margin-bottom: 0.4rem;
  display: block;
}
.card-title {
  font-size: var(--text-h3);
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.6rem;
}
.card-body {
  font-size: var(--text-body-sm);
  color: rgba(255,255,255,0.70);
  line-height: 1.6;
}
```

### Karta KPI / Statystyka

```html
<div class="card-kpi">
  <span class="kpi-label">KOSZT WDROŻENIA</span>
  <div class="kpi-number" data-counter="25">25</div>
  <span class="kpi-unit">×</span>
  <span class="kpi-sub">niższy od odszkodowań</span>
</div>
```

```css
.card-kpi {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.12);
  border-top-color: rgba(255,255,255,0.28);
  border-radius: 14px;
  padding: 1.6rem 2rem;
  text-align: center;
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
}

.kpi-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  margin-bottom: 0.4rem;
}
.kpi-number {
  font-family: var(--font-mono);
  font-size: var(--text-kpi);
  font-weight: 700;
  color: #ff323f;
  line-height: 1;
  display: inline;
}
.kpi-unit {
  font-family: var(--font-mono);
  font-size: calc(var(--text-kpi) * 0.6);
  font-weight: 700;
  color: rgba(255,50,63,0.7);
  vertical-align: super;
}
.kpi-sub {
  display: block;
  margin-top: 0.4rem;
  font-size: var(--text-body-sm);
  color: rgba(255,255,255,0.55);
}
```

### Kontener główny slajdu

```html
<section class="slide slide-bg-1" data-slide="1">
  <!-- Ambient blobs -->
  <div class="slide-ambient-blob blob-teal blob-flow" style="top:-100px; left:-60px;"></div>
  <div class="slide-ambient-blob blob-glass blob-flow-slow" style="bottom:-40px; right:8%;"></div>

  <div class="slide__inner">
    <!-- content -->
  </div>
  <footer class="slide-footer"><!-- ... --></footer>
</section>
```

```css
.slide {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.slide__inner {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto 1fr;
  gap: 24px;
  padding: 56px 80px 24px;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}
```

---

## 8. Komponenty — Zdjęcia i grafiki (perspektywa, kąt, ramki)

### Filozofia
Zdjęcia i grafiki są w ramkach silver-glass, lekko przekształconych perspektywicznie — rotateY ±7–9° nadaje głębi "wyjścia z ekranu". Perspektywa jest statyczna — ustawiona przy wejściu slajdu. Brak interakcji on-hover. Podkładka zawsze: gradient silver.

### Zdjęcie z perspektywą — lewe i prawe

```html
<!-- Wariant prawy (grafika po prawej stronie slajdu) -->
<div class="img-perspective img-perspective--right">
  <div class="image-frame silver-frame">
    <img src="photo.jpg" alt="Opis">
  </div>
</div>

<!-- Wariant lewy -->
<div class="img-perspective img-perspective--left">
  <div class="image-frame silver-frame-b">
    <img src="photo.jpg" alt="Opis">
  </div>
</div>
```

```css
.img-perspective {
  perspective: 1200px;
  perspective-origin: center center;
}

.img-perspective--right .image-frame {
  transform: rotateY(-8deg) rotateX(1.5deg);
  transform-origin: center center;
  will-change: transform;
}

.img-perspective--left .image-frame {
  transform: rotateY(8deg) rotateX(1.5deg);
  transform-origin: center center;
  will-change: transform;
}
```

### Photo Card z podpisem (pełna karta)

```html
<div class="photo-card img-perspective--right">
  <div class="image-frame silver-frame">
    <img src="photo.jpg" alt="..." class="photo-card__img">
    <div class="photo-card__caption">Opis zdjęcia</div>
  </div>
</div>
```

```css
.photo-card__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.photo-card__caption {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 0.8rem 1rem;
  background: linear-gradient(to top, rgba(1,21,32,0.85), transparent);
  font-size: var(--text-body-sm);
  color: rgba(255,255,255,0.75);
  border-radius: 0 0 8px 8px;
}
```

---

## 9. Animacje i micro-interactions

### Zasada — BRAK on-hover
**Żadne efekty wizualne nie są wywoływane przez zdarzenia `hover`, `focus` ani inne interakcje kursora/dotyku.** Wszystkie animacje, przejścia i efekty świetlne uruchamiają się wyłącznie przy przejściu na kolejny slajd (wejście slajdu). Slajdy przełączane są wyłącznie przez przyciski Previous / Next.

```css
/* Globalne wyłączenie hover na elementach interaktywnych prezentacji */
.slide * { pointer-events: none; }
.slide .progress-dot,
.slide .btn-prev,
.slide .btn-next { pointer-events: auto; }
```

### Easing functions

```css
:root {
  --ease-material:  cubic-bezier(0.2, 0, 0, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
}
```

### Keyframes

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeSlideLeft {
  from { opacity: 0; transform: translateX(-32px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fadeInPerspective {
  from { opacity: 0; transform: rotateY(12deg) rotateX(3deg) scale(0.96); }
  to   { opacity: 1; transform: rotateY(8deg) rotateX(1.5deg) scale(1); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1.0; }
}

/* Flow — tło pozornie stoi w miejscu, elementy powoli dryfują nad nim */
@keyframes flowDrift {
  0%   { transform: translate(0px, 0px); }
  25%  { transform: translate(-5px, -3px); }
  60%  { transform: translate(4px, 3px); }
  100% { transform: translate(0px, 0px); }
}

/* Ruch cząsteczek po slajdzie */
@keyframes particleMove {
  0%   { transform: translate(0px, 0px); opacity: 0.15; }
  20%  { opacity: 0.35; }
  50%  { transform: translate(var(--px, 18px), var(--py, -12px)); opacity: 0.25; }
  80%  { opacity: 0.35; }
  100% { transform: translate(0px, 0px); opacity: 0.15; }
}

@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Klasy animacji + stagger

```css
.anim-in      { animation: fadeSlideUp 0.5s var(--ease-material) both; }
.anim-in-left { animation: fadeSlideLeft 0.5s var(--ease-material) both; }
.anim-scale   { animation: scaleIn 0.4s var(--ease-spring) both; }

.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.15s; }
.delay-3 { animation-delay: 0.25s; }
.delay-4 { animation-delay: 0.35s; }
.delay-5 { animation-delay: 0.45s; }
.delay-6 { animation-delay: 0.55s; }

/* Blobs dryf — bardzo subtelny, tło "żyje" */
.blob-flow      { animation: flowDrift 10s ease-in-out infinite; }
.blob-flow-slow { animation: flowDrift 16s ease-in-out infinite reverse; }
```

### Counter animation (JS)

```js
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const isFloat = String(target).includes('.');
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = target * eased;
    el.textContent = isFloat
      ? current.toFixed(1)
      : Math.round(current).toLocaleString('pl-PL');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Uruchom counter gdy slajd staje się aktywny
document.querySelectorAll('[data-counter]').forEach(el => {
  const target = parseFloat(el.dataset.counter);
  // wywołaj animateCounter(el, target) przy wejściu slajdu
});
```

### Transition slajdów (deck.js)

```js
// Crossfade + subtelny scale
function transitionSlides(prevSlide, nextSlide, cb) {
  const DURATION = 420;
  prevSlide.style.cssText = `
    transition: opacity ${DURATION}ms cubic-bezier(0.2,0,0,1),
                transform ${DURATION}ms cubic-bezier(0.2,0,0,1);
    opacity: 0;
    transform: scale(1.025);
  `;
  nextSlide.style.cssText = `
    opacity: 0;
    transform: scale(0.975);
    z-index: 2;
    pointer-events: auto;
  `;
  requestAnimationFrame(() => {
    nextSlide.style.transition = `
      opacity ${DURATION}ms cubic-bezier(0.2,0,0,1),
      transform ${DURATION}ms cubic-bezier(0.2,0,0,1)`;
    nextSlide.style.opacity = '1';
    nextSlide.style.transform = 'scale(1)';
  });
  setTimeout(cb, DURATION + 50);
}
```

---

## 10. Progress bar (dots na dole slajdu)

### Filozofia
Bardzo subtelny progress indicator. Aktywna kropka rozszerza się w pill (szerokość 18px), nieaktywne: małe kółka 6px. Kolor aktywny: `rgba(255,255,255,0.9)`. Pozycja: bottom center, nad footerowym paskiem.

### HTML

```html
<nav class="progress-dots" aria-label="Postęp prezentacji">
  <button class="progress-dot progress-dot--active" aria-label="Slajd 1" aria-current="step"></button>
  <button class="progress-dot" aria-label="Slajd 2"></button>
  <button class="progress-dot" aria-label="Slajd 3"></button>
  <!-- repeat for all slides -->
</nav>
```

### CSS

```css
.progress-dots {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 10;
}

.progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.22);
  transition:
    background 300ms var(--ease-material),
    width 300ms var(--ease-material);
  outline: none;
  flex-shrink: 0;
}

/* Aktywna — pill biały */
.progress-dot--active {
  background: rgba(255, 255, 255, 0.88);
  width: 18px;
  border-radius: 3px;
}

/* Wariant z czerwoną aktywną */
.progress-dots--accent .progress-dot--active {
  background: #ff323f;
}
```

### JS

```js
function updateDots(index) {
  document.querySelectorAll('.progress-dot').forEach((dot, i) => {
    const active = i === index;
    dot.classList.toggle('progress-dot--active', active);
    dot.setAttribute('aria-current', active ? 'step' : 'false');
  });
}
```

---

## 11. Zaokrąglenia (zasady, wartości, hierarchia)

### Zasada
Zaokrąglenia są **subtelne i jednakowe** w całej prezentacji. Profesjonalny, bankowy ton — nie playful. Maksimum ~16px dla głównych kontenerów.

### Tokeny

```css
:root {
  --radius-xs:   4px;    /* separatory, mikro-elementy */
  --radius-sm:   8px;    /* etykiety, tech-tags, tagi */
  --radius-md:   12px;   /* zdjęcia w ramkach */
  --radius-lg:   14px;   /* karty, glass-panele — STANDARD */
  --radius-xl:   16px;   /* duże kontenery, główne panele */
  --radius-pill: 999px;  /* tylko progress-dot aktywna, badge */
}
```

### Tabela zastosowań

| Element | Radius token | px |
|---|---|---|
| Slajd (cały ekran) | brak | 0 |
| Główny panel treści | `--radius-xl` | 16px |
| Karta glass-panel | `--radius-lg` | 14px |
| Karta card-base | `--radius-lg` | 14px |
| Zdjęcie w ramce (image-frame) | `--radius-md` | 12px |
| Zdjęcie wewnątrz image-frame | `--radius-md` − 2 = 10px | ~10px |
| Tech tag / badge | `--radius-sm` | 8px |
| Progress dot aktywna | `--radius-xs` | 4px |
| KPI box | `--radius-lg` | 14px |
| Separator | `--radius-xs` | 4px |

### Zakaz
- ❌ `border-radius: 50%` dla kart
- ❌ `border-radius > 16px` dla głównych kontenerów
- ❌ `border-radius: 0` dla elementów glass
- ❌ Różne wartości zaokrągleń dla elementów tego samego typu na różnych slajdach

---

## 12. Slajd bazowy — layout i siatka

### Wymiary kanoniczne
Każdy slajd: `1920 × 1080px` (16:9). Skalowanie do viewportu przez JS (sekcja 13).

### Strefy slajdu

```
┌─────────────────────────────────────────────────────────────┐  height: 1080px
│  HEADER ZONE — overline + tytuł slajdu          (row 1)    │
├─────────────────────────────┬───────────────────────────────┤
│  CONTENT ZONE (row 2)       │  VISUAL ZONE (row 2)          │
│  cols 1–7 (~58%)            │  cols 8–12 (~42%)             │
│  tekst, karty, dane, lista  │  zdjęcie, wykres, grafika     │
├─────────────────────────────┴───────────────────────────────┤
│  FOOTER — logo | [·····●···] progress dots | numer (row 3) │
└─────────────────────────────────────────────────────────────┘
  padding: 56px top · 80px sides · 64px bottom (dla footera)
```

### CSS siatka

```css
.slide__inner {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto 1fr;
  gap: 24px;
  padding: 56px 80px 24px;
  height: calc(1080px - 64px); /* minus footer */
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}
```

### Layout variants

```css
/* Layout A — tekst (lewo) + grafika (prawo) */
.layout-a .l-header  { grid-column: 1 / 13; grid-row: 1; }
.layout-a .l-content { grid-column: 1 / 8;  grid-row: 2; }
.layout-a .l-visual  { grid-column: 8 / 13; grid-row: 2; }

/* Layout B — pełny tekst z dekoracją */
.layout-b .l-header  { grid-column: 1 / 10; grid-row: 1; }
.layout-b .l-content { grid-column: 1 / 10; grid-row: 2; }
.layout-b .l-deco    { grid-column: 10 / 13; grid-row: 1 / 3; }

/* Layout C — karty KPI w rzędzie */
.layout-c .l-header   { grid-column: 1 / 13; grid-row: 1; }
.layout-c .l-kpi-grid { grid-column: 1 / 13; grid-row: 2; }

/* Layout D — hero centered */
.layout-d .l-hero  { grid-column: 1 / 13; grid-row: 1 / 3; }

/* Layout E — grafika (lewo) + tekst (prawo) */
.layout-e .l-header  { grid-column: 1 / 13; grid-row: 1; }
.layout-e .l-visual  { grid-column: 1 / 6;  grid-row: 2; }
.layout-e .l-content { grid-column: 6 / 13; grid-row: 2; }
```

### Footer

```html
<footer class="slide-footer">
  <div class="slide-footer__logo">
    <img src="assets/images/unicredit-logo.svg" alt="UniCredit" height="22">
  </div>
  <nav class="progress-dots"><!-- dots --></nav>
  <div class="slide-footer__meta">
    <span class="slide-number">01 / 13</span>
  </div>
</footer>
```

```css
.slide-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 80px;
  z-index: 10;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.slide-footer__logo img {
  filter: brightness(0) invert(1);
  opacity: 0.5;
}

.slide-number {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: rgba(255,255,255,0.32);
  letter-spacing: 0.08em;
}
```

---

## 13. Skalowanie 16:9 (letterbox, CSS+JS snippet)

### CSS

```css
/* Wrapper — viewport level */
.presentation-viewport {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

/* Stage — kanoniczny 1920×1080, skalowany przez JS */
.presentation-stage {
  width: 1920px;
  height: 1080px;
  position: relative;
  overflow: hidden;
  transform-origin: top left;
  /* transform ustawiane przez JS */
}

/* Slajdy — absolutne wewnątrz stage */
.slide {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.slide.is-active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}
```

### Przyciski nawigacji Previous / Next

```html
<!-- Poza .presentation-stage, wewnątrz .presentation-viewport -->
<button class="nav-btn nav-btn--prev" id="btn-prev" aria-label="Poprzedni slajd">
  <i class="fa-solid fa-chevron-left"></i>
</button>
<button class="nav-btn nav-btn--next" id="btn-next" aria-label="Następny slajd">
  <i class="fa-solid fa-chevron-right"></i>
</button>
```

```css
.nav-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 50%;
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,0.7);
  font-size: 1rem;
  backdrop-filter: blur(8px);
}

.nav-btn--prev { left: 16px; }
.nav-btn--next { right: 16px; }
```

### JS — skalowanie (deck.js)

```js
function scalePresentation() {
  const stage = document.querySelector('.presentation-stage');
  if (!stage) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scaleX = vw / 1920;
  const scaleY = vh / 1080;
  const scale  = Math.min(scaleX, scaleY);
  const offsetX = Math.round((vw - 1920 * scale) / 2);
  const offsetY = Math.round((vh - 1080 * scale) / 2);
  stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

window.addEventListener('resize', scalePresentation);
document.addEventListener('DOMContentLoaded', scalePresentation);
```

### JS — pełna klasa Deck (deck.js)

```js
class Deck {
  constructor() {
    this.slides      = Array.from(document.querySelectorAll('.slide'));
    this.current     = 0;
    this.total       = this.slides.length;
    this.isAnimating = false;
    this._init();
  }

  _init() {
    this.slides.forEach(s => {
      s.style.opacity       = '0';
      s.style.pointerEvents = 'none';
      s.style.zIndex        = '0';
    });
    this._show(this.slides[0], true);

    // Klawiatura
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); this.next(); }
      if (e.key === 'ArrowLeft'  || e.key === 'PageUp')  { e.preventDefault(); this.prev(); }
    });

    // Przyciski Previous / Next
    document.getElementById('btn-prev')?.addEventListener('click', () => this.prev());
    document.getElementById('btn-next')?.addEventListener('click', () => this.next());

    // Progress dots (click)
    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
      dot.addEventListener('click', () => this.goTo(i));
    });

    updateDots(0);
    scalePresentation();
  }

  _show(slide, instant = false) {
    slide.style.zIndex        = '2';
    slide.style.pointerEvents = 'auto';
    if (instant) {
      slide.style.opacity   = '1';
      slide.style.transform = 'scale(1)';
    }
  }

  goTo(index) {
    if (this.isAnimating || index === this.current) return;
    if (index < 0 || index >= this.total) return;
    this.isAnimating = true;

    const prev = this.slides[this.current];
    const next = this.slides[index];
    const DUR  = 420;

    prev.style.transition = `opacity ${DUR}ms cubic-bezier(0.2,0,0,1), transform ${DUR}ms cubic-bezier(0.2,0,0,1)`;
    prev.style.opacity    = '0';
    prev.style.transform  = 'scale(1.025)';

    next.style.opacity   = '0';
    next.style.transform = 'scale(0.975)';
    this._show(next);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      next.style.transition = `opacity ${DUR}ms cubic-bezier(0.2,0,0,1), transform ${DUR}ms cubic-bezier(0.2,0,0,1)`;
      next.style.opacity    = '1';
      next.style.transform  = 'scale(1)';
    }));

    setTimeout(() => {
      prev.style.zIndex        = '0';
      prev.style.pointerEvents = 'none';
      prev.style.transition    = '';
      prev.style.transform     = '';
      this.current     = index;
      this.isAnimating = false;
      updateDots(index);
      this._triggerEntrances(next);
      this._updateSlideNumber(index);
    }, DUR + 60);
  }

  next() { this.goTo(this.current + 1); }
  prev() { this.goTo(this.current - 1); }

  _triggerEntrances(slide) {
    // Entrance animations
    slide.querySelectorAll('.anim-in, .anim-in-left, .anim-scale').forEach(el => {
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = '';
    });
    // Counter animations
    slide.querySelectorAll('[data-counter]').forEach(el => {
      animateCounter(el, parseFloat(el.dataset.counter));
    });
    // Glow effects
    slide.querySelectorAll('.glow-on-enter, .glow-red-on-enter').forEach(el => {
      el.classList.remove('is-glowing');
      void el.offsetHeight;
      el.classList.add('is-glowing');
    });
  }

  _updateSlideNumber(index) {
    document.querySelectorAll('.slide-number').forEach(el => {
      el.textContent = `${String(index + 1).padStart(2,'0')} / ${String(this.total).padStart(2,'0')}`;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  scalePresentation();
  window.deck = new Deck();
});
```

---

## 14. Ikony

### Zasada
Nie stosujemy emoji. Używamy wyłącznie ikon wektorowych:

- **Font Awesome 6** (solid/regular/brands) — ładowane przez CDN lub lokalnie; odwołania przez `<i class="fa-solid fa-...">` bezpośrednio w HTML
- **Itshoover / animowane SVG** — dla ikon wymagających animacji przy wejściu slajdu; przechowywane w folderze `icons/` jako pliki `.svg`, wczytywane przez `<img src="icons/nazwa.svg">` lub inline

### Import Font Awesome (CDN)

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
```

### Użycie

```html
<!-- Ikona Font Awesome inline -->
<i class="fa-solid fa-shield-halved"></i>

<!-- Animowane SVG z folderu icons/ -->
<img src="icons/lock-animated.svg" alt="" width="32" height="32">
```

### Styl ikon w kontekście glass UI

```css
.slide-icon {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.75);
  font-size: 1.4rem;
  /* Delikatna poświata na ikonie przy wejściu slajdu — używaj .glow-on-enter */
}

.slide-icon--accent {
  color: #ff323f;
}
```

### Zakaz
- ❌ Emoji w jakiejkolwiek formie (ani w treści, ani jako dekoracja)
- ❌ Mieszanie Font Awesome i innych zestawów ikon w obrębie jednego slajdu

---

## 15. Building blocks — gotowe snippety CSS/HTML dla każdego elementu

---

### BB-01: Tło slajdu z blobami

```html
<section class="slide slide-bg-1" data-slide="1">
  <div class="slide-ambient-blob blob-teal blob-flow"
       style="top:-120px; left:-80px;"></div>
  <div class="slide-ambient-blob blob-glass blob-flow-slow"
       style="bottom:-60px; right:10%;"></div>
  <div class="slide__inner layout-a">
    <!-- content zones -->
  </div>
  <footer class="slide-footer">...</footer>
</section>
```

---

### BB-02: Nagłówek slajdu (overline + tytuł + linia)

```html
<header class="slide-header anim-in delay-1">
  <p class="overline">CYBERBEZPIECZEŃSTWO · UNICREDIT</p>
  <h1 class="slide-title">Profilowanie klientów</h1>
  <div class="title-accent-line"></div>
</header>
```

```css
.slide-header { margin-bottom: 2.4rem; }

.overline {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ff323f;
  margin: 0 0 0.5rem;
}

.slide-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 800;
  color: #ffffff;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
}

.title-accent-line {
  margin-top: 1rem;
  height: 2px;
  width: 60px;
  background: linear-gradient(90deg, #ff323f 0%, rgba(255,50,63,0.15) 100%);
  border-radius: 2px;
}
```

---

### BB-03: Paragraph / Body text

```html
<div class="slide-body anim-in delay-2">
  <p>Od razu zabraliśmy się za poszukiwania luki technologicznej...</p>
  <p>Potrzebowaliśmy czegoś <strong>nowego</strong>.</p>
</div>
```

```css
.slide-body p {
  font-size: var(--text-body-lg);
  font-weight: 400;
  color: rgba(255,255,255,0.78);
  line-height: 1.65;
  max-width: 58ch;
  margin: 0 0 1rem;
}
.slide-body p:last-child { margin-bottom: 0; }
.slide-body strong { color: #ffffff; font-weight: 600; }
.slide-body em {
  font-style: normal;
  background: rgba(255,255,255,0.08);
  padding: 0.05em 0.3em;
  border-radius: 4px;
  color: rgba(255,255,255,0.92);
}
```

---

### BB-04: Lista punktów (bullet list)

```html
<ul class="slide-list anim-in delay-3">
  <li class="slide-list__item">Koniec z alertami, które straszą zamiast chronić</li>
  <li class="slide-list__item">Redukcja kosztów wizerunkowych o <span class="data-inline">75%</span></li>
  <li class="slide-list__item">Model licencyjny — z wydatku robi przychód</li>
  <li class="slide-list__item">Innowacja Made in Poland – na europejską skalę</li>
</ul>
```

```css
.slide-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 0.8rem;
}

.slide-list__item {
  display: flex; align-items: flex-start; gap: 0.75rem;
  font-size: var(--text-body-lg);
  color: rgba(255,255,255,0.78);
  line-height: 1.5;
}

.slide-list__item::before {
  content: '';
  flex-shrink: 0;
  width: 6px; height: 6px;
  margin-top: 0.48em;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff, #9c9b9b);
  box-shadow: 0 0 5px rgba(255,255,255,0.3);
}
```

---

### BB-05: KPI / Liczba z podpisem

```html
<div class="kpi-group anim-scale delay-2">
  <div class="card-kpi">
    <span class="kpi-label">OSZCZĘDNOŚĆ</span>
    <div class="kpi-number" data-counter="75">75</div>
    <span class="kpi-unit">%</span>
    <span class="kpi-sub">redukcja kosztów wizerunkowych</span>
  </div>
</div>
```

---

### BB-06: Zdjęcie z perspektywą (prawe + ramka silver)

```html
<div class="img-perspective img-perspective--right anim-in delay-3">
  <div class="image-frame silver-frame">
    <img src="assets/images/photo.jpg" alt="Opis zdjęcia" class="image-frame__img">
  </div>
</div>
```

---

### BB-07: Panel glass z nagłówkiem i separatorem

```html
<div class="glass-panel anim-in delay-2">
  <h3 class="card-title">Segmentacja HDBSCAN</h3>
  <div class="glass-separator"></div>
  <p class="card-body">
    Algorytm dynamicznie wyodrębnia podgrupy klientów, nie zakładając z góry
    liczby klastrów — szuka balansu między różnorodnością a liczebnością.
  </p>
</div>
```

---

### BB-08: Siatka kart (2 lub 3 kolumny)

```html
<div class="card-grid-3 anim-in delay-2">
  <div class="card-base">
    <p class="card-overline">WARSTWA 1</p>
    <h3 class="card-title">Dane własne</h3>
    <p class="card-body">Osobowe, finansowe, behawioralne</p>
  </div>
  <div class="card-base">
    <p class="card-overline">WARSTWA 2</p>
    <h3 class="card-title">Dane PSD-2</h3>
    <p class="card-body">Od innych instytucji finansowych</p>
  </div>
  <div class="card-base">
    <p class="card-overline">WARSTWA 3</p>
    <h3 class="card-title">Anonimizacja</h3>
    <p class="card-body">ID urządzenia, nie dane osobowe</p>
  </div>
</div>
```

```css
.card-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.card-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
```

---

### BB-09: Big statement / cytat

```html
<div class="big-statement anim-in delay-2">
  <span class="big-statement__pre">WIZJA UNICREDIT</span>
  <p class="big-statement__text">
    "Przyjechaliśmy do Polski, żeby stworzyć tu ogólno-europejskie centrum innowacji."
  </p>
  <span class="big-statement__attr">— Andrea Orcel, CEO UniCredit</span>
</div>
```

```css
.big-statement {
  padding: 1.8rem 2.2rem;
  border-left: 2px solid #ff323f;
  background: rgba(255,50,63,0.04);
  border-radius: 0 14px 14px 0;
}
.big-statement__pre {
  font-size: 0.65rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: #ff323f;
  font-weight: 600; display: block; margin-bottom: 0.7rem;
}
.big-statement__text {
  font-size: var(--text-h3); font-weight: 500;
  color: #ffffff; line-height: 1.5;
  font-style: italic; margin: 0 0 0.6rem;
}
.big-statement__attr {
  font-size: var(--text-body-sm);
  color: rgba(255,255,255,0.45);
}
```

---

### BB-10: Tech tags (model/technologia)

```html
<div class="tech-tags anim-in delay-4">
  <span class="tech-tag">FT-Transformer</span>
  <span class="tech-tag">UMAP</span>
  <span class="tech-tag">HDBSCAN</span>
  <span class="tech-tag tech-tag--accent">Hawkes Process</span>
  <span class="tech-tag">PSD-2</span>
</div>
```

```css
.tech-tags {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 1rem;
}
.tech-tag {
  padding: 0.28rem 0.8rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.73rem; font-weight: 400;
  color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  letter-spacing: 0.02em;
}

/* Accent: biały tekst + czerwona ramka + delikatna czerwona poświata */
.tech-tag--accent {
  color: #ffffff;
  border-color: rgba(255,50,63,0.55);
  background: rgba(255,50,63,0.06);
  box-shadow: 0 0 10px rgba(255,50,63,0.2);
}
```

---

### BB-11: Diagram architektury systemu

Diagramy muszą przypominać nowoczesne diagramy techniczne architektury systemów informatycznych — nie proste flowcharty. Węzły to oznaczone prostokąty z glass-fill, połączenia to linie ze strzałkami, grupy logiczne obrysowane są przerywaną ramką. Kolory: moduły własne — teal, zewnętrzne — silver-gray, warstwa decyzyjna — red-accent.

```html
<div class="arch-diagram anim-in delay-2">

  <!-- Warstwa danych -->
  <div class="arch-layer arch-layer--data">
    <span class="arch-layer__label">Warstwa danych</span>
    <div class="arch-nodes">
      <div class="arch-node">
        <i class="fa-solid fa-database arch-node__icon"></i>
        <span class="arch-node__name">Bank DB</span>
        <span class="arch-node__sub">własne</span>
      </div>
      <div class="arch-node arch-node--external">
        <i class="fa-solid fa-building-columns arch-node__icon"></i>
        <span class="arch-node__name">PSD-2 API</span>
        <span class="arch-node__sub">zewnętrzne</span>
      </div>
    </div>
  </div>

  <div class="arch-connector arch-connector--v">
    <span class="arch-connector__label">ETL / normalize</span>
  </div>

  <!-- Warstwa ML -->
  <div class="arch-layer arch-layer--ml">
    <span class="arch-layer__label">Warstwa ML</span>
    <div class="arch-nodes">
      <div class="arch-node">
        <i class="fa-solid fa-microchip arch-node__icon"></i>
        <span class="arch-node__name">FT-Transformer</span>
        <span class="arch-node__sub">embedding</span>
      </div>
      <div class="arch-node">
        <i class="fa-solid fa-diagram-project arch-node__icon"></i>
        <span class="arch-node__name">HDBSCAN</span>
        <span class="arch-node__sub">klastry</span>
      </div>
    </div>
  </div>

  <div class="arch-connector arch-connector--v">
    <span class="arch-connector__label">score / alert</span>
  </div>

  <!-- Warstwa wyjściowa -->
  <div class="arch-layer arch-layer--output">
    <span class="arch-layer__label">Wyjście</span>
    <div class="arch-nodes">
      <div class="arch-node arch-node--accent">
        <i class="fa-solid fa-bell arch-node__icon"></i>
        <span class="arch-node__name">Alert Engine</span>
        <span class="arch-node__sub">celowane</span>
      </div>
    </div>
  </div>

</div>
```

```css
.arch-diagram {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.arch-layer {
  position: relative;
  border: 1px dashed rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 1rem 1.2rem 1rem;
  background: rgba(255,255,255,0.03);
}

.arch-layer__label {
  position: absolute;
  top: -0.55rem; left: 1rem;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  background: inherit;
  padding: 0 0.4rem;
  background: #012132; /* match slide bg */
}

.arch-nodes {
  display: flex;
  gap: 16px;
  align-items: stretch;
  flex-wrap: wrap;
}

.arch-node {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.8rem 1rem;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-top-color: rgba(255,255,255,0.25);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.arch-node--external {
  background: rgba(156,155,155,0.07);
  border-color: rgba(156,155,155,0.18);
}

.arch-node--accent {
  background: rgba(255,50,63,0.07);
  border-color: rgba(255,50,63,0.35);
  box-shadow: 0 0 16px rgba(255,50,63,0.15);
}

.arch-node__icon {
  font-size: 1.1rem;
  color: rgba(255,255,255,0.6);
}

.arch-node--accent .arch-node__icon { color: #ff323f; }

.arch-node__name {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
}

.arch-node__sub {
  font-size: 0.6rem;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.06em;
  text-align: center;
}

/* Konektor pionowy między warstwami */
.arch-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto;
  padding: 4px 0;
  position: relative;
}

.arch-connector--v::before {
  content: '';
  display: block;
  width: 1px;
  height: 24px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
}

.arch-connector--v::after {
  content: '';
  width: 0; height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid rgba(255,255,255,0.2);
}

.arch-connector__label {
  font-size: 0.58rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.06em;
  position: absolute;
  left: calc(50% + 10px);
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
}
```

---

### BB-12: Slide Hero (tytuł + podtytuł, layout D)

```html
<div class="hero-content anim-in">
  <p class="hero-eyebrow">WARSAW SCHOOL OF ECONOMICS · 2026</p>
  <h1 class="hero-title">Bank Przyszłości</h1>
  <p class="hero-sub">Personalizowany system cyberochrony dla UniCredit</p>
  <div class="hero-divider"></div>
  <p class="hero-authors">Maks Kozieł &amp; Karolina</p>
</div>
```

```css
.hero-content {
  display: flex; flex-direction: column;
  align-items: flex-start; justify-content: center;
  height: 100%; max-width: 960px;
}
.hero-eyebrow {
  font-size: 0.7rem; font-weight: 600;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255,255,255,0.35); margin-bottom: 1.2rem;
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(3.5rem, 5.5vw, 6.5rem);
  font-weight: 800; color: #ffffff;
  line-height: 1.0; letter-spacing: -0.03em;
  margin-bottom: 1.2rem;
}
.hero-sub {
  font-size: var(--text-h3); font-weight: 400;
  color: rgba(255,255,255,0.62); line-height: 1.4;
  margin-bottom: 2.2rem;
}
.hero-divider {
  width: 80px; height: 2px;
  background: linear-gradient(90deg, #ff323f, rgba(255,50,63,0.1));
  border-radius: 2px; margin-bottom: 1.5rem;
}
.hero-authors {
  font-size: var(--text-body-sm);
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
}
```

---

### BB-13: Inline data highlight

```html
<p>Koszt wdrożenia jest <span class="data-inline">25×</span> niższy
od odszkodowań wypłacanych klientom.</p>
```

```css
.data-inline {
  font-family: var(--font-mono);
  font-weight: 700; font-size: 1.05em;
  color: #ff323f;
  padding: 0 0.1em;
  background: rgba(255,50,63,0.09);
  border-radius: 4px;
}
```

---

### BB-14: Particle (ambient dot)

Cząsteczki powinny być liczne (min. 20–30 na slajd), małe (2–3px), półprzezroczyste (opacity 0.15–0.35), z płynnym ruchem. Pozycje startowe rozmieszczone równomiernie. Ruch płynny — animacja `particleMove` z indywidualnymi `--px` i `--py` per cząsteczka.

```html
<!-- Generowane przez JS — przykład ręczny -->
<div class="particle" style="top:12%;left:8%;--px:14px;--py:-9px;animation-delay:0s;"></div>
<div class="particle" style="top:28%;left:22%;--px:-11px;--py:7px;animation-delay:0.8s;"></div>
<div class="particle" style="top:55%;left:45%;--px:9px;--py:13px;animation-delay:1.6s;"></div>
<div class="particle" style="top:72%;left:68%;--px:-8px;--py:-11px;animation-delay:2.4s;"></div>
<div class="particle" style="top:38%;left:83%;--px:12px;--py:-6px;animation-delay:3.2s;"></div>
<!-- ...kontynuuj do 25–30 cząsteczek -->
```

```css
.particle {
  position: absolute;
  width: 2px; height: 2px;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  pointer-events: none;
  z-index: 0;
  animation: particleMove 7s ease-in-out infinite;
}
```

```js
// Generator cząsteczek (wywoływany dla każdego slajdu)
function spawnParticles(slideEl, count = 26) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random(); // 2–3px
    p.style.cssText = `
      top: ${5 + Math.random() * 90}%;
      left: ${2 + Math.random() * 96}%;
      width: ${size}px;
      height: ${size}px;
      --px: ${(Math.random() - 0.5) * 30}px;
      --py: ${(Math.random() - 0.5) * 22}px;
      animation-duration: ${5 + Math.random() * 5}s;
      animation-delay: ${Math.random() * 4}s;
      opacity: ${0.15 + Math.random() * 0.20};
    `;
    slideEl.appendChild(p);
  }
}
```

---

### BB-15: Two-column text split

```html
<div class="text-split anim-in delay-2">
  <div class="text-split__left">
    <p>Zbieramy dane na dwóch poziomach. Pierwszy to dane własne klientów banku.</p>
  </div>
  <div class="text-split__right">
    <p>Drugie to dane od innych instytucji finansowych — zgodnie z dyrektywą PSD-2.</p>
  </div>
</div>
```

```css
.text-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4rem;
}
.text-split__left, .text-split__right {
  font-size: var(--text-body-lg);
  color: rgba(255,255,255,0.75);
  line-height: 1.65;
}
.text-split__left { padding-right: 1.2rem; border-right: 1px solid rgba(255,255,255,0.08); }
.text-split__right { padding-left: 1.2rem; }
```

---

## 16. Czego UNIKAĆ (anti-patterns)

### Kolor i tło
- ❌ `background: #ffffff` lub `background: white` — nigdy
- ❌ `color: #000000` lub `color: black` — tekst zawsze biały/rgba
- ❌ Jednolite płaskie tło bez gradientu
- ❌ Dwa slajdy z identycznym ułożeniem gradientu
- ❌ `#ff323f` jako kolor tła elementu — tylko jako linia, tekst, detail
- ❌ Więcej niż 2 elementy `#ff323f` per slajd — nadmiar gubi uwagę
- ❌ `rgba(255,50,63,0.X)` jako tło kart — zbyt krzykliwe

### Typografia
- ❌ Więcej niż 4 różne kroje pisma w całej prezentacji
- ❌ `font-weight: 300` — zbyt cienkie na ciemnym tle
- ❌ Font-size poniżej `0.65rem` dla widocznego tekstu
- ❌ `letter-spacing` ujemny na body text (tylko headings)
- ❌ Tekst bez jawnie zdefiniowanego `color`
- ❌ Emoji — tylko ikony Font Awesome lub SVG z folderu `icons/`

### Zaokrąglenia
- ❌ `border-radius: 50%` dla kart i kontenerów (playful)
- ❌ `border-radius > 16px` dla głównych kart — zbyt miękkie
- ❌ `border-radius: 0` dla elementów glass
- ❌ Różne wartości zaokrągleń dla elementów tego samego typu na różnych slajdach
- ❌ Brak konsekwencji — np. 12px na jednym slajdzie i 20px na innym

### Glass i shadows
- ❌ `box-shadow` bez blur (za ostry, łamie glass estetykę)
- ❌ `backdrop-filter` bez fallback background
- ❌ Brak `border-top` refleksu na elementach glass
- ❌ Więcej niż 3 warstwy `backdrop-filter` na jednym slajdzie (perf kill)
- ❌ `blur` > 20px na elementach foreground (tło ok)
- ❌ Neumorphism — chiseled, inset-well, extruded shadows — nie stosujemy
- ❌ Zanikające ramki z gradientem do transparent (np. `accent-frame`)
- ❌ Gruba podkładka pod zdjęcie z padding > 3px i ciężkim inset glow

### Interakcje i animacje
- ❌ **Jakiekolwiek efekty `on-hover`** — żadnych `:hover`, `:focus-visible` na elementach slajdu poza przyciskami nawigacji
- ❌ Animacje `float` z dużymi translateY/X (>8px) — zamiast nich `flowDrift`
- ❌ Animacje zanikania elementów graficznych między slajdami (`mask-image` gradient)
- ❌ `transition-duration > 600ms` dla UI elementów
- ❌ `animation-fill-mode` nie ustawiony — elementy migają
- ❌ Brak `will-change: transform` na elementach z perspektywą
- ❌ Counter animations bez `requestAnimationFrame`
- ❌ Równoczesna animacja `opacity` + `filter: blur` na >5 elementach

### Layout i skala
- ❌ Centered layout na każdym slajdzie — monotonia
- ❌ Overflow treści poza granicę slajdu
- ❌ Brak `z-index` na blobbach — mogą przykryć treść
- ❌ Fonty bez `clamp()` — nieczytelne przy innym resolution
- ❌ Padding < 56px od krawędzi slajdu

### Diagramy i schematy
- ❌ Proste flowcharty z okrągłymi węzłami w stylu Mermaid/draw.io — tylko nowoczesne diagramy architektury systemowej
- ❌ Strzałki bez etykiet — każde połączenie powinno opisywać typ relacji (np. ETL, API call, score)
- ❌ Brak warstw logicznych (data / ML / output) — grupuj węzły w warstwy z przerywaną ramką

---

*Specyfikacja: 2026-05-13 | Projekt: UniCredit Presentation — Bank Przyszłości | SGH Warsaw*
