import { Color } from "../types";
import { forwardRef, Ref, useImperativeHandle } from "react";
import colors from "../colors";
import { analytics } from "../firebase";
import { logEvent } from "firebase/analytics";
import { P5Instance, ReactP5Wrapper } from "react-p5-wrapper";

/*
 * =============================
 *   Component Controlled Data
 * =============================
 */
let background: Color = colors[12];
let color: Color = colors[0];
let paused: boolean = false;
let pixelHeight: number = 25;
let pixelWidth: number = 25;
let showGrid: boolean = true;

/*
 * ==================
 *   P5 Sketch Data
 * ==================
 */

const MAX_PIXEL_SIZE = 30;
let P5: P5Instance | null = null;
let hoverPixelKey: string | null = null;
let pixels: { [key: string]: Color } = JSON.parse(
  localStorage.getItem("pixels") || "{}"
);
let pixelSize = MAX_PIXEL_SIZE;

/*
 * =============
 *   P5 Sketch
 * =============
 */

function sketch(p5: P5Instance) {
  P5 = p5;

  p5.updateWithProps = (props) => {
    const { width, height } = props.pixelDimensions;

    if (
      typeof width === "number" &&
      typeof height === "number" &&
      (width !== pixelWidth || height !== pixelHeight)
    ) {
      pixelWidth = width;
      pixelHeight = height;
      updatePixelSize();
      p5.resizeCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
    }

    background = props.background;
    color = props.color;
    paused = props.paused;
    showGrid = props.showGrid;
  };

  p5.setup = () => {
    updatePixelSize();
    p5.createCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
  };

  p5.draw = () => {
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

  p5.mouseMoved = () => {
    hoverPixelKey = screenCoordsToKey(p5.mouseX, p5.mouseY);
  };

  p5.mousePressed = () => {
    placePixel(p5.mouseX, p5.mouseY);
    console.log("press");
  };

  p5.mouseDragged = () => {
    placePixel(p5.mouseX, p5.mouseY);
  };

  p5.windowResized = () => {
    updatePixelSize();
    p5.resizeCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
  };
}

/*
 * ====================
 *   Helper Functions
 * ====================
 */

function clearCanvas() {
  updatePixelSize();
  hoverPixelKey = null;
  pixels = JSON.parse(localStorage.getItem("pixels") || "{}") as {
    [key: string]: Color;
  };
}

function updatePixelSize() {
  const possiblePixelSize1 = Math.floor((window.innerWidth - 20) / pixelWidth);
  const possiblePixelSize2 = Math.floor(
    (window.innerHeight - 170) / pixelHeight
  );
  pixelSize = Math.min(possiblePixelSize1, possiblePixelSize2, MAX_PIXEL_SIZE);
}

function screenCoordsToKey(screenX: number, screenY: number): string | null {
  const pixelX = Math.floor(screenX / pixelSize);
  const pixelY = Math.floor(screenY / pixelSize);

  if (
    pixelX < 0 ||
    pixelX > pixelWidth - 1 ||
    pixelY < 0 ||
    pixelY > pixelHeight - 1
  ) {
    return null;
  }
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

function drawNub(p5: P5Instance, x: number, y: number, rot = 0) {
  const nubLen = p5.floor(pixelSize * 0.25);
  const nubWidth = p5.floor(pixelSize * 0.1);

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

function placePixel(screenX: number, screenY: number) {
  if (paused) return;

  const pixelKey = screenCoordsToKey(screenX, screenY);
  hoverPixelKey = pixelKey;

  if (pixelKey) {
    pixels[pixelKey] = { ...color };
    localStorage.setItem("pixels", JSON.stringify(pixels));

    logEvent(analytics, "placed_pixel", {
      position: pixelKey,
      colorName: color.name,
      colorHex: color.hex,
    });
  }
}

/*
 * ===================
 *   React Component
 * ===================
 */

export type CanvasRefProps = {
  getSketch: () => P5Instance | null;
  clearCanvas: () => void;
};

export type CanvasRef = Ref<CanvasRefProps>;

function Canvas(
  {
    background = colors[12],
    color,
    paused,
    pixelDimensions,
    showGrid,
  }: {
    background?: Color;
    color: Color;
    paused: boolean;
    pixelDimensions: {
      width?: number;
      height?: number;
    };
    showGrid: boolean;
  },
  ref: CanvasRef
) {
  useImperativeHandle(ref, () => ({
    getSketch: () => {
      return P5;
    },
    clearCanvas: () => {
      clearCanvas();
    },
  }));

  return (
    <>
      <ReactP5Wrapper
        sketch={sketch}
        background={background}
        color={color}
        paused={paused}
        pixelDimensions={pixelDimensions}
        showGrid={showGrid}
      />
    </>
  );
}

export default forwardRef(Canvas);
