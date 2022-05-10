import { on, showUI, emit } from "@create-figma-plugin/utilities";

import { DrawImageHandler, ImageInsertedHandler } from "./types";

const SAVED_VALS = [0, 0, 0];
export default function () {
  on<DrawImageHandler>(
    "DRAW_IMAGE",
    async function (base64: string, width, height, index, name) {
      if (index === 0) {
        SAVED_VALS[0] = 0;
        SAVED_VALS[1] = figma.viewport.center.x;
        SAVED_VALS[2] = figma.viewport.center.y;
      }

      const rect = figma.createFrame();
      rect.name = name;
      rect.x = SAVED_VALS[1] + SAVED_VALS[0];
      rect.y = SAVED_VALS[2];
      rect.resize(width, height);
      SAVED_VALS[0] = SAVED_VALS[0] + (width + 50);
      const image = figma.createImage(figma.base64Decode(base64));
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
      emit<ImageInsertedHandler>("IMAGE_INSERTED", index);
      figma.currentPage.selection = [rect];
    }
  );
  showUI({ width: 370, height: 484 });
}
