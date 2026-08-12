# Pilly identity

The approved production mark is a dot-free, softly frosted capsule with a warm peach upper half, deep berry lower half, and one translucent seam. It deliberately avoids a wordmark, check, mascot, medical cross, heart, clock, and decorative dose indicator.

## Masters

- `icon-master-1254.png` is the high-resolution square light master.
- `capsule-foreground.png` is the isolated capsule used for the native splash and Android adaptive foreground.
- `production-preview.png` documents the approved light, dark, splash, adaptive, themed, and small-size applications.

Shipping exports live in `assets/` and are wired through `app.json`. The iOS icon source is 1024×1024 without transparency; splash and Android foreground artwork retain transparency.

The master artwork was refined with the built-in image-generation workflow from the approved direction: C's softly frosted dimensional construction, F's peach and deep-berry palette, and no circular detail. Platform exports were derived locally from that approved master to prevent style drift.
