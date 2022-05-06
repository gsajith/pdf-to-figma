import { on, showUI } from "@create-figma-plugin/utilities";

import { DrawImageHandler } from "./types";

const savedVals = [0, 0, 0];

export default function () {
  on<DrawImageHandler>(
    "DRAW_IMAGE",
    async function (uint8: Uint8Array, width, height, index) {
      if (index === 0) {
        savedVals[0] = 0;
        savedVals[1] = figma.viewport.center.x;
        savedVals[2] = figma.viewport.center.y;
      }

      const rect = figma.createRectangle();
      rect.x = savedVals[1] + savedVals[0];
      rect.y = savedVals[2];
      rect.resize(width, height);
      savedVals[0] = savedVals[0] + (width + 50);
      const image = figma.createImage(uint8);
      rect.fills = [
        {
          type: "IMAGE",
          scaleMode: "FILL",
          imageHash: image.hash,
          visible: true,
        },
      ];
      figma.currentPage.appendChild(rect);
      figma.viewport.scrollAndZoomIntoView([rect]);
      figma.currentPage.selection = [rect];
    }
  );
  showUI({ width: 400, height: 550 });
}
