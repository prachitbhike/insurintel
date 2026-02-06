export async function exportChartAsPNG(
  containerRef: HTMLElement | null,
  filename: string = "chart.png"
): Promise<boolean> {
  if (!containerRef) return false;

  const svgElement = containerRef.querySelector("svg");
  if (!svgElement) return false;

  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = "anonymous";

    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2; // 2x for retina
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(false);
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          URL.revokeObjectURL(url);
          resolve(true);
        }, "image/png");
      };
      img.onerror = () => resolve(false);
      img.src = url;
    });
  } catch {
    return false;
  }
}
