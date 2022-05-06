import { EventHandler } from "@create-figma-plugin/utilities";

export interface InsertCodeHandler extends EventHandler {
  name: "INSERT_CODE";
  handler: (code: string) => void;
}

export interface DrawImageHandler extends EventHandler {
  name: "DRAW_IMAGE";
  handler: (
    uint8: Uint8Array,
    width: number,
    height: number,
    index: number
  ) => void;
}
