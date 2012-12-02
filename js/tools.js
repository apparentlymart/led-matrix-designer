
////// Tools respond to clicks and drags on the image surface to
////// enable the user to draw certain primitives.
var tools = {
    freehand: {
        continueDrag: function (frame, x1, y1, x2, y2, toolState) {
            frame.setPixel(x2, y2, toolState.currentColor);
        }
    },
    rectangle: {
        continueDrag: function (frame, x1, y1, x2, y2, toolState) {
            var overlay = toolState.overlay;
            overlay.clear();
            overlay.frame.drawRect(x1, y1, x2, y2, toolState.currentColor);
        },
        pauseDrag: function (frame, x1, y1, toolState) {
            toolState.overlay.clear();
        },
        endDrag: function (frame, x1, y1, x2, y2, toolState) {
            toolState.overlay.clear();
            frame.drawRect(x1, y1, x2, y2, toolState.currentColor);
        }
    }
};
