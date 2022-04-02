import Sketch, { SketchProps } from "react-p5";
import p5Types from "p5";
import { Color } from "../types";
import { Component, forwardRef, LegacyRef } from "react";
import colors from "../colors";
import { analytics } from "../firebase";
import { logEvent } from "firebase/analytics";

const pixels: { [key: string]: Color } = JSON.parse(
  localStorage.getItem("pixels") || "{}"
);
const MAX_PIXEL_SIZE = 30;
let pixelSize = MAX_PIXEL_SIZE;
let hoverPixelKey: string | null = null;

function Canvas(
  {
    background = colors[12],
    color,
    showGrid,
    pixelWidth,
    pixelHeight,
  }: {
    background?: Color;
    color: Color;
    showGrid: boolean;
    pixelWidth: number;
    pixelHeight: number;
  },
  ref: LegacyRef<Component<SketchProps, any, any>>
) {
  function updatePixelSize(p5: p5Types) {
    const possiblePixelSize1 = p5.floor((p5.windowWidth - 20) / pixelWidth);
    const possiblePixelSize2 = p5.floor((p5.windowHeight - 170) / pixelHeight);
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

  function drawNub(p5: p5Types, x: number, y: number, rot = 0) {
    const nubLen = p5.floor(pixelSize * 0.25);
    const nubWidth = p5.floor(pixelHeight * 0.1);

    p5.push();
    p5.translate(x, y);
    p5.rotate(rot);
    p5.noStroke();
    p5.fill(255, 143);
    p5.rect(-nubWidth, -nubWidth, nubLen + nubWidth, nubWidth);
    p5.rect(-nubWidth, 0, nubWidth, nubLen);
    p5.fill(0, 143);
    p5.rect(0, 0, nubLen, nubWidth);
    p5.rect(0, nubWidth, nubWidth, nubLen - nubWidth);
    p5.pop();
  }

  const draw = (p5: p5Types) => {
    p5.background(background.hex);

    p5.noStroke();
    for (let key in pixels) {
      const { hex } = pixels[key];
      const [x, y] = keyToScreenCoords(key);
      p5.fill(hex);
      p5.noStroke();
      p5.rect(x, y, pixelSize, pixelSize);
    }

    if (hoverPixelKey) {
      const [x, y] = keyToScreenCoords(hoverPixelKey);

      drawNub(p5, x, y, 0);
      drawNub(p5, x + pixelSize, y, p5.HALF_PI);
      drawNub(p5, x + pixelSize, y + pixelSize, p5.PI);
      drawNub(p5, x, y + pixelSize, p5.HALF_PI * 3);
    }

    if (showGrid) {
      p5.noFill();
      p5.strokeWeight(1);
      for (let r = 0; r <= pixelHeight; r++) {
        p5.stroke(255, 60);
        p5.line(0, r * pixelSize, p5.width, r * pixelSize);
        p5.stroke(0, 60);
        p5.line(0, r * pixelSize, p5.width, r * pixelSize);
      }
      for (let c = 0; c <= pixelWidth; c++) {
        p5.stroke(255, 60);
        p5.line(c * pixelSize, 0, c * pixelSize, p5.height);
        p5.stroke(0, 60);
        p5.line(c * pixelSize, 0, c * pixelSize, p5.height);
      }
    }
  };

  function placePixel(p5: p5Types, screenX: number, screenY: number) {
    hoverPixelKey = screenCoordsToKey(p5.mouseX, p5.mouseY);
    const key = screenCoordsToKey(screenX, screenY);
    pixels[key] = { ...color };
    localStorage.setItem("pixels", JSON.stringify(pixels));
    logEvent(analytics, "placed_pixel", { key, ...color });
  }

  const mouseMoved = (p5: p5Types) => {
    hoverPixelKey = screenCoordsToKey(p5.mouseX, p5.mouseY);
  };

  const mousePressed = (p5: p5Types) => {
    placePixel(p5, p5.mouseX, p5.mouseY);
  };

  const mouseDragged = (p5: p5Types) => {
    placePixel(p5, p5.mouseX, p5.mouseY);
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
