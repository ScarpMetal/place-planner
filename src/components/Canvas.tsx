import Sketch, { SketchProps } from "react-p5";
import p5Types from "p5";
import { Color } from "../types";
import { Component, forwardRef, LegacyRef } from "react";
import colors from "../colors";
import { analytics } from "../firebase";
import { logEvent } from "firebase/analytics";

const pixels: { [key: string]: Color } = {};
const MAX_PIXEL_SIZE = 15;
let pixelSize = MAX_PIXEL_SIZE;
let hoverPixelKey: string | null = null;

function Canvas(
  {
    background = colors[12],
    color,
    pixelWidth,
    pixelHeight,
  }: {
    background?: Color;
    color: Color;
    pixelWidth: number;
    pixelHeight: number;
  },
  ref: LegacyRef<Component<SketchProps, any, any>>
) {
  function updatePixelSize(p5: p5Types) {
    const possiblePixelSize1 = p5.floor(p5.windowWidth / pixelWidth);
    const possiblePixelSize2 = p5.floor((p5.windowHeight - 160) / pixelHeight);
    pixelSize = Math.min(
      possiblePixelSize1,
      possiblePixelSize2,
      MAX_PIXEL_SIZE
    );
  }

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    updatePixelSize(p5);
    p5.createCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize).parent(
      canvasParentRef
    );
  };

  function screenCoordsToKey(screenX: number, screenY: number) {
    const pixelX = Math.floor(screenX / pixelSize);
    const pixelY = Math.floor(screenY / pixelSize);
    return `${pixelX},${pixelY}`;
  }

  function keyToScreenCoords(key: string) {
    const [xStr, yStr] = key.split(",");
    const x = parseInt(xStr);
    const y = parseInt(yStr);
    const screenX = x * pixelSize;
    const screenY = y * pixelSize;
    return [screenX, screenY];
  }

  const draw = (p5: p5Types) => {
    p5.background(background.hex);

    p5.noStroke();
    for (let key in pixels) {
      const { hex } = pixels[key];
      const [x, y] = keyToScreenCoords(key);
      p5.fill(hex);
      p5.rect(x, y, pixelSize, pixelSize);
    }

    if (hoverPixelKey) {
      const [x, y] = keyToScreenCoords(hoverPixelKey);
      p5.fill(color.hex);
      p5.rect(x, y, pixelSize, pixelSize);
    }
  };

  function placePixel(screenX: number, screenY: number) {
    const key = screenCoordsToKey(screenX, screenY);
    pixels[key] = { ...color };
    logEvent(analytics, "placed_pixel", { key, color });
  }

  const mouseMoved = (p5: p5Types) => {
    hoverPixelKey = screenCoordsToKey(p5.mouseX, p5.mouseY);
  };

  const mousePressed = (p5: p5Types) => {
    placePixel(p5.mouseX, p5.mouseY);
  };

  const mouseDragged = (p5: p5Types) => {
    placePixel(p5.mouseX, p5.mouseY);
  };

  const windowResized = (p5: p5Types) => {
    updatePixelSize(p5);
    p5.resizeCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
  };

  return (
    <Sketch
      ref={ref}
      setup={setup}
      draw={draw}
      mouseMoved={mouseMoved}
      mousePressed={mousePressed}
      mouseDragged={mouseDragged}
      windowResized={windowResized}
    />
  );
}

export default forwardRef(Canvas);
