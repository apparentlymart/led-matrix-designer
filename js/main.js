
function init() {

    var pixelFormat = new IndexedPixelFormat([[0, 0, 0], [255, 0, 0]]);
    var frameSet = new FrameSet(8, 5, pixelFormat, 4);

    var frameSetView = new FrameSetView(document.getElementById("workspace"));
    var colorPickerView = new ColorPickerView(document.getElementById("colors"));
    var currentTool = tools.freehand;
    var toolState = {
        currentColor: pixelFormat.getDefaultPixelData(),
        overlay: new Overlay(frameSet, null),
        dragStartX: null,
        dragStartY: null,
        dragStartFrameIndex: null
    };

    frameSetView.cellEvents.mouseDown.addListener(function (frameIndex, x, y) {
        var frame = frameSet.frames[frameIndex];
        toolState.dragStartFrameIndex = frameIndex;
        toolState.dragStartX = x;
        toolState.dragStartY = y;
        if (currentTool.beginDrag) {
            currentTool.beginDrag(frame, x, y, toolState);
        }
        // We also artificially fire continueDrag so that
        // the tool can immediately draw whatever affordance it uses
        // to give feedback about the drag.
        if (currentTool.continueDrag) {
            currentTool.continueDrag(frame, toolState.dragStartX, toolState.dragStartY, x, y, toolState);
        }
    });
    frameSetView.cellEvents.mouseUp.addListener(function (frameIndex, x, y) {
        if (frameIndex != null && toolState.dragStartFrameIndex == frameIndex) {
            var frame = frameSet.frames[frameIndex];
            toolState.dragStartFrameIndex = null;
            if (currentTool.endDrag) {
                currentTool.endDrag(frame, toolState.dragStartX, toolState.dragStartY, x, y, toolState);
            }
        }
        else if (toolState.dragStartFrameIndex != null) {
            var frame = frameSet.frames[toolState.dragStartFrameIndex];
            toolState.dragStartFrameIndex = null;
            if (currentTool.cancelDrag) {
                currentTool.cancelDrag(frame, toolState);
            }
        }
    });
    frameSetView.cellEvents.mouseOver.addListener(function (frameIndex, x, y) {
        if (toolState.dragStartFrameIndex != null) {
            // We have a drag in progress so notify the tool about
            // the change in cell.
            var frame = frameSet.frames[toolState.dragStartFrameIndex];
            if (currentTool.continueDrag) {
                currentTool.continueDrag(frame, toolState.dragStartX, toolState.dragStartY, x, y, toolState);
            }
        }
        else {
            // Otherwise tell the tool we're hovering so it can update
            // any overlay it uses.
            var frame = frameSet.frames[toolState.dragStartFrameIndex];
            if (currentTool.hoverOver) {
                currentTool.hoverOver(frame, x, y, toolState);
            }
        }
    });
    frameSetView.cellEvents.mouseOut.addListener(function (frameIndex, x, y) {
        if (toolState.dragStartFrameIndex != null) {
            // We have a drag in progress so notify the tool that we're not
            // in any cell right now and so the drag is paused.
            var frame = frameSet.frames[toolState.dragStartFrameIndex];
            if (currentTool.pauseDrag) {
                currentTool.pauseDrag(frame, toolState.dragStartX, toolState.dragStartY, toolState);
            }
        }
        else {
            // Otherwise tell the tool we're no longer hovering so it can update
            // any overlay it uses.
            var frame = frameSet.frames[toolState.dragStartFrameIndex];
            if (currentTool.hoverOut) {
                currentTool.hoverOut(frame, x, y, toolState);
            }
        }
    });

    frameSetView.frameEvents.mouseOver.addListener(function (frameIndex) {
        toolState.overlay.frameIndex = frameIndex;
        toolState.overlay.clear();
        frameSetView.update(frameSet, toolState.overlay);
    });
    frameSetView.frameEvents.mouseOut.addListener(function (frameIndex) {
        toolState.overlay.frameIndex = null;
        frameSetView.update(frameSet, toolState.overlay);
    });

    colorPickerView.update(pixelFormat, toolState.currentColor);
    colorPickerView.colorPickEvent.addListener(function (selectedColor) {
        toolState.currentColor = selectedColor;
        colorPickerView.update(pixelFormat, toolState.currentColor);
    });

    frameSetView.update(frameSet, toolState.overlay);
    frameSet.dataUpdateEvent.addListener(function () {
        frameSetView.update(frameSet, toolState.overlay);
    });
    toolState.overlay.dataUpdateEvent.addListener(function () {
        frameSetView.update(frameSet, toolState.overlay);
    });
}

$("#matrix").ready(init);
