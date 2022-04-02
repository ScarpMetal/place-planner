import { logEvent } from "firebase/analytics";
import { Component, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SketchProps } from "react-p5/@types";
import "./App.css";
import colors from "./colors";
import Canvas from "./components/Canvas";
import { analytics } from "./firebase";

function App() {
  const canvasRef = useRef<Component<SketchProps, any, any>>(null);
  const errorTimeout = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const color = useMemo(() => colors[colorIndex], [colorIndex]);

  // detect unmount of component
  useLayoutEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // hide error after 2.5 seconds
  useLayoutEffect(() => {
    if (errorTimeout.current) {
      clearTimeout(errorTimeout.current);
    }
    errorTimeout.current = setTimeout(() => {
      if (mounted.current) {
        setError(null);
      }
    }, 5000);
  }, [error]);

  const getCanvasDataURL = () => {
    // @ts-ignore p5 sketch did not type this
    if (!canvasRef.current?.sketch?.canvas?.toDataURL) {
      return null;
    }

    // @ts-ignore p5 sketch did not type this
    return canvasRef.current.sketch.canvas.toDataURL();
  };

  const handleDownloadToComputer = () => {
    const dataURL = getCanvasDataURL();
    if (!dataURL) {
      setError("Could not download image, try again.");
      logEvent(analytics, "error_downloading_image_to_computer");
      return;
    }

    const dateStr = new Date().toISOString();
    const link = document.createElement("a");
    link.download = `PlacePlannerDrawing@${dateStr}.png`;
    link.href = dataURL;
    link.click();

    logEvent(analytics, "downloaded_image_to_computer", { dataURL });
  };

  // const handleShareToReddit = () => {
  //   const dataURL = getCanvasDataURL();
  //   if (!dataURL) {
  //     setError("Could not share image, try again.");
  //   }
  // };

  return (
    <div className="App">
      {error && (
        <div className="error" key={error}>
          {error}
        </div>
      )}
      <div className="canvas-container">
        <div className="canvas-content-container">
          <div className="options">
            {/* <button
              type="button"
              className="reddit-share"
              onClick={handleShareToReddit}
            >
              Reddit Share
            </button> */}
            <a
              className="feedback"
              target="_blank"
              rel="noreferrer"
              href="https://www.reddit.com/user/ScarpMetal/comments/tu478n/rplace_planner_feedback_thread/"
              onClick={() => {
                logEvent(analytics, "feedback_link_clicked");
              }}
            >
              Feedback
            </a>
            <button
              type="button"
              className="download"
              onClick={handleDownloadToComputer}
            >
              Download Image
            </button>
          </div>
          <Canvas
            ref={canvasRef}
            color={color}
            pixelWidth={25}
            pixelHeight={25}
          />
        </div>
      </div>
      <div className="colors-container">
        <div className="colors">
          {colors.map((color, index) => {
            return (
              <button
                key={index}
                type="button"
                data-selected={index === colorIndex}
                data-white={color.name === "white"}
                style={{ backgroundColor: color.hex }}
                onClick={() => {
                  setColorIndex(index);
                  logEvent(analytics, "selected_color", color);
                }}
              >
                <div className="tooltip">{color.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
