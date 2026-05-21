# DESIGN.md — LuminaMD Design System

> Fuente de verdad de diseño. Spec completa en `docs/superpowers/specs/2026-05-18-frontend-design-system.md`.

---

## Estética general

**Estilo:** Minimalismo clínico-premium  
**Modo:** Light mode únicamente  
**Fuente:** Inter (Google Fonts)  
**Iconos:** Phosphor Icons (`@phosphor-icons/react`) — Regular por defecto, Fill para énfasis

---

## Paleta de color

### Marca

| Token | Valor | Uso |
|-------|-------|-----|
| `gradient-primary` | `linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)` | Heroes, navbar, badges, sliders activos |
| `blue-400` | `#4FACFE` | Acentos, labels, iconos activos |
| `indigo-400` | `#667EEA` | Botón primario, focus rings |
| `indigo-700` | `#4338CA` | Hover de botón primario |
| `indigo-100` | `#E0E7FF` | Botón secundario background |
| `indigo-50` | `#EEF2FF` | Badge background, chip background |

### Regla del gradiente (crítica)

- ✅ Fondos de secciones hero / navbar / banners
- ✅ Badges de estado (pequeños elementos gráficos)
- ✅ Barras de progreso y sliders activos
- ❌ **Nunca en texto** (siempre color sólido)
- ❌ **Nunca en botones** (siempre color sólido)
- ❌ **Nunca en logos con texto**

### Neutrales

| Token | Valor | Uso |
|-------|-------|-----|
| `text-primary` | `#1E1B4B` | Títulos, texto principal |
| `text-secondary` | `#374151` | Cuerpo de texto |
| `text-muted` | `#6B7280` | Subtítulos, descripciones |
| `text-placeholder` | `#94A3B8` | Placeholders, captions |
| `border` | `#E9D5FF` | Bordes de cards, divisores |
| `bg-page` | `#F5F3FF` | Fondo general de la app |
| `bg-surface` | `#FFFFFF` | Cards, modales, navbar blanca |
| `bg-surface-alt` | `#FAFAF9` | Secciones alternas landing |

### Semánticos

| Token | Valor | Light bg |
|-------|-------|----------|
| `success` | `#22C55E` | `#DCFCE7` |
| `error` | `#EF4444` | `#FEE2E2` |
| `warning` | `#F59E0B` | `#FEF9C3` |

---

## Tipografía

| Nombre | Tamaño | Peso | Uso |
|--------|--------|------|-----|
| `display` | 56px | 800 | Hero principal landing |
| `h1` | 44px | 800 | Títulos de sección hero |
| `h2` | 32px | 800 | Títulos de sección |
| `h3` | 22px | 700 | Subtítulos de sección |
| `h4` | 17px | 700 | Títulos de card |
| `body-lg` | 16px | 400 | Cuerpo principal landing |
| `body-md` | 14px | 400 | Cuerpo general app |
| `body-sm` | 13px | 400 | Texto secundario |
| `label` | 11px | 700 | Section labels uppercase |
| `caption` | 11px | 400 | Metadata, timestamps |

---

## Espaciado

Base: **4px**. Escala multiplicativa. Contenedor máximo: **1100px** con padding horizontal **48px** (colapsado a 16px en mobile).

---

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `xs` | 4px | Tags inline |
| `sm` | 6px | Badges / pills |
| `md` | 8px | Botones small |
| `lg` | 10px | Botones medium |
| `xl` | 12px | Inputs, botones large |
| `2xl` | 14px | Cards |
| `3xl` | 16px | Modales, panels |
| `4xl` | 20px | Hero visual, imágenes grandes |
| `full` | 9999px | Pills de badge, avatares |

---

## Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 2px 8px rgba(0,0,0,0.08)` | Cards en reposo |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Cards estándar |
| `shadow-lg` | `0 8px 28px rgba(0,0,0,0.10)` | Cards en hover |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.12)` | Modales, drawers |
| `shadow-brand` | `0 8px 40px rgba(102,126,234,0.20)` | CTAs, hero visual |

---

## Componentes

### Botones

| Variante | Background | Texto | Uso |
|----------|------------|-------|-----|
| `primary` | `#667EEA` | white | Acción principal |
| `secondary` | `#E0E7FF` | `#4338CA` | Acción secundaria |
| `outline` | transparent | `#667EEA` | Acción alternativa |
| `ghost` | transparent | `#667EEA` | Navegación |
| `danger` | `#FEE2E2` | `#DC2626` | Destructivas |
| `white` | white | `#667EEA` | Sobre fondos de gradiente |

### Inputs

- Border: `1.5px solid #E9D5FF`
- Focus: `1.5px solid #667EEA` + `box-shadow: 0 0 0 3px rgba(102,126,234,0.12)`
- Error: `1.5px solid #EF4444`
- Border radius: `xl` (12px) · Font size: 14px

### Navbar

- **Landing:** Gradient bg, logo blanco, botón CTA blanco sólido
- **App:** Sidebar `#1E1B4B`, logo blanco con acento `#4FACFE`, nav activo `rgba(79,172,254,0.15)` + texto `#4FACFE`

### Badges de estado

| Estado | Background | Texto |
|--------|------------|-------|
| Activo | `gradient-primary` | white |
| Pendiente | `#EEF2FF` | `#4338CA` |
| Completado | `#DCFCE7` | `#16A34A` |
| En revisión | `#FEF9C3` | `#CA8A04` |
| Cancelado | `#FEE2E2` | `#DC2626` |

---

## Estilo visual landing

- Secciones numeradas con label `01 —` en azul (estilo Palladio Group)
- CTAs con flecha `→`
- Fondo alterno entre `bg-surface` (white) y `bg-surface-alt` (#FAFAF9)
- Máximo contraste: texto siempre color sólido, nunca degradado
