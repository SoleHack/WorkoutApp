// Renders The Forge brand assets (app icon, adaptive icon foreground, splash)
// using CoreGraphics + CoreText with the bundled Bebas Neue font.
// Run from repo root: swift ppl-app/scripts/render-brand-assets.swift

import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers
import AppKit

// MARK: - Color palette (The Forge)
let bgColor      = CGColor(red: 0x0A/255.0, green: 0x0A/255.0, blue: 0x09/255.0, alpha: 1.0)
let accentOrange = CGColor(red: 0xF9/255.0, green: 0x73/255.0, blue: 0x16/255.0, alpha: 1.0)
let glowOrange   = CGColor(red: 0xF9/255.0, green: 0x73/255.0, blue: 0x16/255.0, alpha: 0.18)
let ember        = CGColor(red: 0xEF/255.0, green: 0x44/255.0, blue: 0x44/255.0, alpha: 1.0)

// MARK: - Asset paths (script lives in ppl-app/scripts/, assets in ppl-app/assets/)
let scriptURL  = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath()
let appRoot    = scriptURL.deletingLastPathComponent().deletingLastPathComponent()
let assetsDir  = appRoot.appendingPathComponent("assets")
let fontPath   = assetsDir.appendingPathComponent("fonts/bebas-neue.ttf").path

// MARK: - Font loader
func loadBebas(size: CGFloat) -> CTFont {
    let url = URL(fileURLWithPath: fontPath) as CFURL
    guard let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor],
          let desc = descriptors.first else {
        fputs("ERROR: could not load Bebas Neue at \(fontPath)\n", stderr)
        exit(1)
    }
    return CTFontCreateWithFontDescriptor(desc, size, nil)
}

// MARK: - Context helper
func makeContext(size: CGSize, transparent: Bool = false) -> CGContext {
    let cs = CGColorSpaceCreateDeviceRGB()
    // Premultiplied first for non-transparent (RGB-skip-alpha equivalent in CG)
    // gives smaller PNGs than RGBA when alpha is uniform.
    let bitmapInfo = transparent
        ? CGImageAlphaInfo.premultipliedLast.rawValue
        : CGImageAlphaInfo.noneSkipFirst.rawValue
    let bytesPerRow = Int(size.width) * 4
    let ctx = CGContext(
        data: nil,
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: cs,
        bitmapInfo: bitmapInfo
    )!
    if !transparent {
        ctx.setFillColor(bgColor)
        ctx.fill(CGRect(origin: .zero, size: size))
    }
    return ctx
}

// MARK: - PNG writer
func writePNG(_ ctx: CGContext, to path: String) {
    guard let img = ctx.makeImage() else { fatalError("makeImage failed for \(path)") }
    let url = URL(fileURLWithPath: path) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else {
        fatalError("destination failed for \(path)")
    }
    CGImageDestinationAddImage(dest, img, nil)
    if !CGImageDestinationFinalize(dest) { fatalError("finalize failed for \(path)") }
    print("wrote \(path)")
}

// MARK: - Draw "F" monogram centered in given rect
// Mirrors a chunky condensed Bebas-style F: thick vertical stem, full top arm, shorter middle arm.
func drawForgeMonogram(in ctx: CGContext, rect: CGRect, color: CGColor, withSpark: Bool = true) {
    let unit = rect.width / 10.0          // 10-unit grid
    let stemW = unit * 2.4                // vertical stem thickness
    let armH  = unit * 2.0                // arm thickness
    let topArmW = unit * 7.2
    let midArmW = unit * 5.2
    let midGap  = unit * 1.2              // gap between top and mid arm

    // Anchor the F slightly left of center so the negative space on the right reads as letterform.
    let totalW = topArmW
    let totalH = unit * 10
    let originX = rect.minX + (rect.width - totalW) / 2
    let originY = rect.minY + (rect.height - totalH) / 2

    ctx.setFillColor(color)

    // Vertical stem (full height)
    let stem = CGRect(x: originX, y: originY, width: stemW, height: totalH)
    ctx.fill(stem)

    // Top arm (full width across top)
    let topArm = CGRect(x: originX, y: originY + totalH - armH, width: topArmW, height: armH)
    ctx.fill(topArm)

    // Middle arm (shorter, sits below top arm with a gap)
    let midArmY = originY + totalH - armH - midGap - armH
    let midArm = CGRect(x: originX, y: midArmY, width: midArmW, height: armH)
    ctx.fill(midArm)

    // Spark/ember dot near the top-right of the F — small touch of "forge"
    if withSpark {
        let sparkR = unit * 0.55
        let sparkX = originX + topArmW + unit * 0.4
        let sparkY = originY + totalH - armH/2 - sparkR
        ctx.setFillColor(ember)
        ctx.fillEllipse(in: CGRect(x: sparkX, y: sparkY, width: sparkR * 2, height: sparkR * 2))
    }
}

// MARK: - Radial glow in a corner
func drawCornerGlow(in ctx: CGContext, size: CGSize, corner: CGPoint, radius: CGFloat, color: CGColor) {
    let cs = CGColorSpaceCreateDeviceRGB()
    let colors = [color, color.copy(alpha: 0)!] as CFArray
    let locations: [CGFloat] = [0.0, 1.0]
    guard let gradient = CGGradient(colorsSpace: cs, colors: colors, locations: locations) else { return }
    ctx.saveGState()
    ctx.drawRadialGradient(gradient,
                           startCenter: corner, startRadius: 0,
                           endCenter: corner, endRadius: radius,
                           options: [])
    ctx.restoreGState()
}

// MARK: - 1) App icon (1024x1024, solid background)
func renderAppIcon() {
    let size = CGSize(width: 1024, height: 1024)
    let ctx = makeContext(size: size)

    // Subtle warm glow in top-right (matches the JSX header treatment)
    // Reduced radius to limit gradient extent → fewer unique pixel values → smaller PNG.
    drawCornerGlow(in: ctx, size: size,
                   corner: CGPoint(x: size.width + 80, y: size.height + 80),
                   radius: 600,
                   color: glowOrange)

    // F monogram fills central ~62% of the canvas
    let inset: CGFloat = 195
    let monoRect = CGRect(x: inset, y: inset, width: size.width - inset * 2, height: size.height - inset * 2)
    drawForgeMonogram(in: ctx, rect: monoRect, color: accentOrange)

    writePNG(ctx, to: assetsDir.appendingPathComponent("icon.png").path)
}

// MARK: - 2) Android adaptive icon foreground (1024x1024, transparent BG)
// Android trims/masks adaptive icons — keep the mark inside the 66% safe zone.
func renderAdaptiveIconForeground() {
    let size = CGSize(width: 1024, height: 1024)
    let ctx = makeContext(size: size, transparent: true)

    // Safe zone is the inner ~66% (Android masks the outer ring).
    // Place the F inside an even tighter rect so it reads at all mask shapes.
    let safeInset: CGFloat = 290
    let monoRect = CGRect(x: safeInset, y: safeInset, width: size.width - safeInset * 2, height: size.height - safeInset * 2)
    drawForgeMonogram(in: ctx, rect: monoRect, color: accentOrange, withSpark: false)

    writePNG(ctx, to: assetsDir.appendingPathComponent("adaptive-icon.png").path)
}

// MARK: - 3) Splash (1242x1242, FORGE wordmark in Bebas)
// Expo splash uses resizeMode: contain — the image is centered, not screen-sized.
// 1242px is the iPhone Pro Max width; larger is wasted bytes.
func renderSplash() {
    let size = CGSize(width: 1242, height: 1242)
    let ctx = makeContext(size: size)

    // Soft glow behind wordmark
    drawCornerGlow(in: ctx, size: size,
                   corner: CGPoint(x: size.width / 2, y: size.height / 2),
                   radius: 550,
                   color: glowOrange)

    // FORGE wordmark
    let text = "FORGE"
    let font = loadBebas(size: 320)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(cgColor: accentOrange) as Any,
        .kern: 32
    ]
    let attr = NSAttributedString(string: text, attributes: attrs)
    let line = CTLineCreateWithAttributedString(attr)
    let bounds = CTLineGetBoundsWithOptions(line, .useOpticalBounds)

    let x = (size.width - bounds.width) / 2 - bounds.minX
    let y = (size.height - bounds.height) / 2 - bounds.minY
    ctx.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, ctx)

    // Tagline (DM Mono-ish via system mono — Bebas only has uppercase, so use a thin caps tagline below)
    let taglineFont = loadBebas(size: 40)
    let taglineAttrs: [NSAttributedString.Key: Any] = [
        .font: taglineFont,
        .foregroundColor: NSColor(white: 0.42, alpha: 1.0) as Any,
        .kern: 14
    ]
    let tagline = NSAttributedString(string: "6-DAY TRANSFORMATION PROTOCOL", attributes: taglineAttrs)
    let tagLine = CTLineCreateWithAttributedString(tagline)
    let tagBounds = CTLineGetBoundsWithOptions(tagLine, .useOpticalBounds)
    let tx = (size.width - tagBounds.width) / 2 - tagBounds.minX
    let ty = y + bounds.minY - 80 - tagBounds.height
    ctx.textPosition = CGPoint(x: tx, y: ty)
    CTLineDraw(tagLine, ctx)

    // Thin orange underline accent between wordmark and tagline
    let lineW: CGFloat = 180
    let lineH: CGFloat = 3
    ctx.setFillColor(accentOrange)
    ctx.fill(CGRect(x: (size.width - lineW) / 2,
                    y: y + bounds.minY - 24,
                    width: lineW,
                    height: lineH))

    writePNG(ctx, to: assetsDir.appendingPathComponent("splash.png").path)
}

// MARK: - 4) Favicon (small icon for web)
func renderFavicon() {
    let size = CGSize(width: 256, height: 256)
    let ctx = makeContext(size: size)
    let inset: CGFloat = 38
    let monoRect = CGRect(x: inset, y: inset, width: size.width - inset * 2, height: size.height - inset * 2)
    drawForgeMonogram(in: ctx, rect: monoRect, color: accentOrange, withSpark: false)
    writePNG(ctx, to: assetsDir.appendingPathComponent("favicon.png").path)
}

// MARK: - Main
renderAppIcon()
renderAdaptiveIconForeground()
renderSplash()
renderFavicon()
print("done.")
