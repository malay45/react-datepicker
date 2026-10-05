// Bundles the game into one self-contained HTML body (inline CSS and JS) for
// hosts that serve a single page, such as a claude.ai artifact.
// Usage: node build.js [out-file]   (default: dist/sustainable-futures-lab.html)
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), "utf8");
const out = process.argv[2] || path.join(dir, "dist", "sustainable-futures-lab.html");

const html = read("index.html");
const body = html.split("<!--BODY-->")[1].split("<!--/BODY-->")[0].trim();
const fonts = html.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]+>/)[0];
const js = ["lab-data.js", "lab-engine.js", "lab-app.js"].map(read).join("\n");
if (js.includes("</script")) throw new Error("Script contains a closing script tag");

const page = [
  "<title>Sustainable Futures Lab</title>",
  fonts,
  "<style>\n" + read("lab.css") + "</style>",
  body,
  "<script>\n" + js + "</script>",
  ""
].join("\n");

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log("Wrote " + out + " (" + page.length + " bytes)");
