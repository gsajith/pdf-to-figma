import { EventHandler } from "@create-figma-plugin/utilities";

export interface DrawImageHandler extends EventHandler {
  name: "DRAW_IMAGE";
  handler: (
    base64: string,
    width: number,
    height: number,
    index: number,
    fileName: string
  ) => void;
}

export interface ImageInsertedHandler extends EventHandler {
  name: "IMAGE_INSERTED";
  handler: (index: number) => void;
}
