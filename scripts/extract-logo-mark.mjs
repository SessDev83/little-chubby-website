import sharp from "sharp";

const sourcePath = "Untitled design (12).png";
const logoOutput = "public/images/brand/logo-mark.png";
const faviconOutput = "public/favicon.png";

const sourceMeta = await sharp(sourcePath).metadata();
const topHeight = Math.floor((sourceMeta.height ?? 0) * 0.68);

await sharp(sourcePath)
  .extract({
    left: 0,
    top: 0,
    width: sourceMeta.width ?? 0,
    height: topHeight
  })
  .trim({ threshold: 10 })
  .resize(1024, 1024, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(logoOutput);

await sharp(logoOutput)
  .resize(64, 64, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile(faviconOutput);

console.log("Created:");
console.log(`- ${logoOutput}`);
console.log(`- ${faviconOutput}`);
