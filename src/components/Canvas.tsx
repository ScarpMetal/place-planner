import Sketch, { SketchProps } from "react-p5";
import p5Types from "p5";
import { Color } from "../types";
import { Component, forwardRef, LegacyRef } from "react";

let x = 50;
const y = 50;
const PIXEL_SIZE = 5;

function Canvas(
  {
    color,
    pixelWidth,
    pixelHeight,
  }: {
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

  const draw = (p5: p5Types) => {
    p5.background(0);
    p5.ellipse(x, y, 70, 70);
  };

  return <Sketch ref={ref} setup={setup} draw={draw} />;
}

export default forwardRef(Canvas);
