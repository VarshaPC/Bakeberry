import pptxgen from "pptxgenjs";
import { imageSize } from "image-size";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const asset = (name) => path.join(root, "public", name);
const pptx = new pptxgen();

pptx.layout = "LAYOUT_WIDE";
pptx.author = "BAKEBERRY Project Team";
pptx.subject = "Artisanal bakery storefront and ordering platform";
pptx.title = "BAKEBERRY Project Overview";
pptx.company = "BAKEBERRY";
pptx.lang = "en-IN";
pptx.theme = {
  headFontFace: "Georgia",
  bodyFontFace: "Aptos",
  lang: "en-IN",
};
pptx.defineSlideMaster({
  title: "CONTENT",
  background: { color: "F8F5EF" },
  objects: [
    { rect: { x: 0, y: 7.18, w: 13.333, h: 0.32, line: { color: "30483C", transparency: 100 }, fill: { color: "30483C" } } },
    { text: { text: "BAKEBERRY  |  PROJECT OVERVIEW", options: { x: 0.55, y: 7.23, w: 5.2, h: 0.14, fontFace: "Aptos", fontSize: 8, color: "F8F5EF", charSpacing: 0.8, margin: 0 } } },
  ],
  slideNumber: { x: 12.35, y: 7.22, w: 0.45, h: 0.16, color: "F8F5EF", fontFace: "Aptos", fontSize: 8, align: "right", margin: 0 },
});

const colors = { ink: "252722", green: "30483C", rust: "AA563D", cream: "F8F5EF", pale: "E9EBDD", muted: "6A6B64", white: "FFFFFF" };

function addTitle(slide, eyebrow, title, subtitle = "") {
  slide.addText(eyebrow.toUpperCase(), { x: 0.65, y: 0.42, w: 5.4, h: 0.22, fontFace: "Aptos", fontSize: 9, bold: true, charSpacing: 1.5, color: colors.rust, margin: 0 });
  slide.addText(title, { x: 0.65, y: 0.76, w: 12.0, h: 0.58, fontFace: "Georgia", fontSize: 29, color: colors.ink, margin: 0, breakLine: false });
  if (subtitle) slide.addText(subtitle, { x: 0.68, y: 1.4, w: 11.6, h: 0.35, fontFace: "Aptos", fontSize: 12, color: colors.muted, margin: 0 });
}

function addBulletList(slide, items, x, y, w, opts = {}) {
  const fontSize = opts.fontSize || 17;
  items.forEach((text, index) => {
    const top = y + index * (opts.gap || 0.66);
    slide.addShape(pptx.ShapeType.ellipse, { x, y: top + 0.13, w: 0.1, h: 0.1, line: { color: colors.rust, transparency: 100 }, fill: { color: colors.rust } });
    slide.addText(text, { x: x + 0.24, y: top, w: w - 0.24, h: 0.48, fontFace: "Aptos", fontSize, color: colors.ink, margin: 0.02, breakLine: false, valign: "mid", fit: "shrink" });
  });
}

function addImageContain(slide, imagePath, x, y, w, h) {
  const { width, height } = imageSize(readFileSync(imagePath));
  const scale = Math.min(w / width, h / height);
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  slide.addImage({ path: imagePath, x: x + (w - imageWidth) / 2, y: y + (h - imageHeight) / 2, w: imageWidth, h: imageHeight });
}

{
  const slide = pptx.addSlide();
  slide.background = { color: colors.green };
  slide.addText("BAKEBERRY", { x: 0.75, y: 0.65, w: 6.2, h: 0.42, fontFace: "Georgia", fontSize: 19, bold: true, color: "F4D6C7", charSpacing: 1.1, margin: 0 });
  slide.addText("A little joy,\nlayer by layer.", { x: 0.75, y: 1.5, w: 6.4, h: 2.25, fontFace: "Georgia", fontSize: 42, color: colors.cream, margin: 0, breakLine: false, fit: "shrink" });
  slide.addText("Artisanal cake storefront & ordering platform", { x: 0.8, y: 4.12, w: 5.9, h: 0.45, fontFace: "Aptos", fontSize: 17, color: "E6E6D8", margin: 0 });
  slide.addText("PROJECT OVERVIEW  •  2026", { x: 0.8, y: 6.6, w: 4.0, h: 0.22, fontFace: "Aptos", fontSize: 9, bold: true, charSpacing: 1.3, color: "E6E6D8", margin: 0 });
  addImageContain(slide, asset("bakeberry_home_screenshot.png"), 6.85, 0.85, 5.85, 5.95);
}

{
  const slide = pptx.addSlide("CONTENT");
  addTitle(slide, "The idea", "One bakery. Two ways to celebrate.", "A single-shop experience that connects everyday cake discovery with planned celebrations.");
  addBulletList(slide, [
    "Browse a curated cake collection with clear stock and flavour details.",
    "Order ready cakes for pickup or local delivery.",
    "Book made-to-order cakes with date and kitchen-capacity checks.",
    "Follow orders from checkout through pickup or delivery.",
  ], 0.85, 2.2, 7.0, { fontSize: 17, gap: 0.78 });
  slide.addShape(pptx.ShapeType.rect, { x: 8.7, y: 2.15, w: 3.65, h: 3.6, rectRadius: 0.04, line: { color: "D7D1C6", width: 1 }, fill: { color: "EEE9DF" } });
  slide.addText("CUSTOMER PROMISE", { x: 9.05, y: 2.6, w: 2.9, h: 0.25, fontFace: "Aptos", fontSize: 9, bold: true, charSpacing: 1.2, color: colors.rust, margin: 0 });
  slide.addText("Thoughtful,\nsmall-batch cakes\nfor the moments\nthat matter.", { x: 9.05, y: 3.0, w: 2.95, h: 2.1, fontFace: "Georgia", fontSize: 24, color: colors.green, margin: 0, breakLine: false, fit: "shrink" });
}

{
  const slide = pptx.addSlide("CONTENT");
  addTitle(slide, "Product experience", "A storefront built around discovery", "Real screenshot from the running Vite application.");
  addImageContain(slide, asset("bakeberry_home_screenshot.png"), 0.7, 1.95, 8.4, 4.75);
  slide.addText("SHOPPING HIGHLIGHTS", { x: 9.45, y: 2.15, w: 3.0, h: 0.25, fontFace: "Aptos", fontSize: 9, bold: true, charSpacing: 1.2, color: colors.rust, margin: 0 });
  addBulletList(slide, ["Category browsing", "Stock-aware product cards", "Quick-add cart", "Advance celebration booking"], 9.45, 2.65, 3.1, { fontSize: 14, gap: 0.74 });
}

{
  const slide = pptx.addSlide("CONTENT");
  addTitle(slide, "How it works", "From cake choice to confirmed order", "Key customer and kitchen steps are coordinated through the API.");
  const steps = [
    ["01", "Discover", "Browse cakes and\nchoose a variant"],
    ["02", "Schedule", "Select pickup date\nand available slot"],
    ["03", "Checkout", "Server validates price\nand reserves capacity"],
    ["04", "Complete", "Verify payment and\ntrack order status"],
  ];
  steps.forEach(([num, title, desc], index) => {
    const x = 0.72 + index * 3.12;
    slide.addShape(pptx.ShapeType.rect, { x, y: 2.5, w: 2.7, h: 2.42, line: { color: "D8D2C7", width: 1 }, fill: { color: "FFFFFF" } });
    slide.addText(num, { x: x + 0.22, y: 2.73, w: 0.6, h: 0.35, fontFace: "Georgia", fontSize: 21, color: colors.rust, margin: 0 });
    slide.addText(title, { x: x + 0.22, y: 3.25, w: 2.25, h: 0.4, fontFace: "Georgia", fontSize: 19, color: colors.green, margin: 0 });
    slide.addText(desc, { x: x + 0.22, y: 3.85, w: 2.25, h: 0.7, fontFace: "Aptos", fontSize: 12, color: colors.muted, margin: 0, breakLine: false });
    if (index < steps.length - 1) slide.addText("→", { x: x + 2.78, y: 3.45, w: 0.28, h: 0.35, fontFace: "Aptos", fontSize: 18, color: colors.rust, margin: 0, align: "center" });
  });
  slide.addText("Made-to-order bookings require at least 3 days' notice; availability is checked against daily capacity.", { x: 0.78, y: 5.55, w: 11.7, h: 0.45, fontFace: "Aptos", fontSize: 13, color: colors.green, margin: 0.08, align: "center", breakLine: false });
}

{
  const slide = pptx.addSlide("CONTENT");
  addTitle(slide, "System architecture", "A modern web app with a transaction-aware API", "React storefront, Express services, and MongoDB replica-set transactions.");
  addImageContain(slide, asset("bakeberry_architecture_diagram.jpg"), 0.72, 1.9, 8.0, 4.75);
  addBulletList(slide, ["React 18 + Vite", "Node.js + Express REST API", "MongoDB / Mongoose", "Razorpay payments + geocoding"], 9.1, 2.3, 3.5, { fontSize: 14, gap: 0.8 });
}

{
  const slide = pptx.addSlide("CONTENT");
  addTitle(slide, "Reliability & next steps", "Orders designed for trust", "The core flows are implemented; production launch depends on live service configuration.");
  addImageContain(slide, asset("bakeberry_order_lifecycle_diagram.jpg"), 0.65, 1.92, 6.8, 4.65);
  addBulletList(slide, [
    "Atomic stock and booking-slot reservations.",
    "Idempotent checkout prevents duplicate orders.",
    "Unpaid reservations expire and release capacity.",
    "Tests cover booking rules, commerce and ownership.",
    "Next: configure production database, payment and delivery credentials.",
  ], 7.8, 2.05, 4.8, { fontSize: 13, gap: 0.72 });
}

await pptx.writeFile({ fileName: path.join(root, "BAKEBERRY_Project_Overview.pptx") });
console.log("Created BAKEBERRY_Project_Overview.pptx");