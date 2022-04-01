import Sketch, { SketchProps } from "react-p5";
import p5Types from "p5";
import { Color } from "../types";
import { Component, forwardRef, LegacyRef } from "react";
import colors from "../colors";

const PIXEL_SIZE = 10;
const pixels: { [key: string]: Color } = {};

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
  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(pixelWidth * PIXEL_SIZE, pixelHeight * PIXEL_SIZE).parent(
      canvasParentRef
    );
  };

  function screenCoordsToKey(screenX: number, screenY: number) {
    const pixelX = Math.floor(screenX / PIXEL_SIZE);
    const pixelY = Math.floor(screenY / PIXEL_SIZE);
    return `${pixelX},${pixelY}`;
  }

  function keyToScreenCoords(key: string) {
    const [xStr, yStr] = key.split(",");
    const x = parseInt(xStr);
    const y = parseInt(yStr);
    const screenX = x * PIXEL_SIZE;
    const screenY = y * PIXEL_SIZE;
    return [screenX, screenY];
  }

  const draw = (p5: p5Types) => {
    p5.background(background.hex);

    p5.noStroke();
    for (let key in pixels) {
      const { hex } = pixels[key];
      const [x, y] = keyToScreenCoords(key);
      p5.fill(hex);
      p5.rect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    }
  };

  function placePixel(screenX: number, screenY: number) {
    const key = screenCoordsToKey(screenX, screenY);
    pixels[key] = { ...color };
  }

  const mousePressed = (p5: p5Types) => {
    placePixel(p5.mouseX, p5.mouseY);
  };

  const mouseDragged = (p5: p5Types) => {
    console.log("dragged");
  };

  return (
    <Sketch
      ref={ref}
      setup={setup}
      draw={draw}
      mousePressed={mousePressed}
      mouseDragged={mouseDragged}
    />
  );
}

export default forwardRef(Canvas);
