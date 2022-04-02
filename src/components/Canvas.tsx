import Sketch, { SketchProps } from "react-p5";
import p5Types from "p5";
import { Color } from "../types";
import {
  Component,
  forwardRef,
  Ref,
  useCallback,
  useLayoutEffect,
} from "react";
import colors from "../colors";
import { analytics } from "../firebase";
import { logEvent } from "firebase/analytics";

const MAX_PIXEL_SIZE = 30;
let pixels: { [key: string]: Color } = JSON.parse(
  localStorage.getItem("pixels") || "{}"
);
let pixelSize = MAX_PIXEL_SIZE;
let hoverPixelKey: string | null = null;

function updatePixelSize(pixelWidth: number, pixelHeight: number) {
  const possiblePixelSize1 = Math.floor((window.innerWidth - 20) / pixelWidth);
  const possiblePixelSize2 = Math.floor(
    (window.innerHeight - 170) / pixelHeight
  );
  pixelSize = Math.min(possiblePixelSize1, possiblePixelSize2, MAX_PIXEL_SIZE);
}

function Canvas(
  {
    lastClear,
    paused,
    background = colors[12],
    color,
    showGrid,
    pixelWidth,
    pixelHeight,
  }: {
    lastClear: string;
    paused: boolean;
    background?: Color;
    color: Color;
    showGrid: boolean;
    pixelWidth: number;
    pixelHeight: number;
  },
  ref: Ref<Component<SketchProps, any, any>>
) {
  // Set initial pixels and hoverPixelKey when there is a new canvas
  useLayoutEffect(() => {
    pixels = JSON.parse(localStorage.getItem("pixels") || "{}") as {
      [key: string]: Color;
    };
    hoverPixelKey = null;
  }, [lastClear]);

  // set canvas size whenever pixelWidth and pixelHeight change
  useLayoutEffect(() => {
    // @ts-ignore
    const p5: p5Types | undefined = ref.current?.sketch;
    // @ts-ignore using this hack to see if canvas is already setup
    if (p5 && p5._setupDone) {
      console.log("resize");
      updatePixelSize(pixelWidth, pixelHeight);
      p5.resizeCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
    }
  }, [pixelHeight, pixelWidth, ref]);

  const setup = useCallback(
    (p5: p5Types, canvasParentRef: Element) => {
      console.log("setup");
      updatePixelSize(pixelWidth, pixelHeight);
      p5.createCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize).parent(
        canvasParentRef
      );
    },
    [pixelHeight, pixelWidth]
  );

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

  function drawNub(p5: p5Types, x: number, y: number, rot = 0) {
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

  const mouseMoved = (p5: p5Types) => {
    hoverPixelKey = screenCoordsToKey(p5.mouseX, p5.mouseY);
  };

  const mousePressed = (p5: p5Types) => {
    placePixel(p5.mouseX, p5.mouseY);
    console.log("mousePressed", screenCoordsToKey(p5.mouseX, p5.mouseY));
  };

  const mouseDragged = (p5: p5Types) => {
    placePixel(p5.mouseX, p5.mouseY);
    console.log("mouseDragged", screenCoordsToKey(p5.mouseX, p5.mouseY));
  };

  const windowResized = (p5: p5Types) => {
    updatePixelSize(pixelWidth, pixelHeight);
    p5.resizeCanvas(pixelWidth * pixelSize, pixelHeight * pixelSize);
  };

  return (
    <>
      <Sketch
        ref={ref}
        setup={setup}
        draw={draw}
        mouseMoved={mouseMoved}
        mousePressed={mousePressed}
        mouseDragged={mouseDragged}
        windowResized={windowResized}
      />
    </>
  );
}

export default forwardRef(Canvas);
