
function Listenable() {
    this.listeners = [];
}
Listenable.prototype = {};
Listenable.prototype.addListener = function (cb) {
    this.listeners.push(cb);
}
Listenable.prototype.notifyListeners = function (emitter, args) {
    if (args == null) args = [];
    for (var i = 0; i < this.listeners.length; i++) {
        this.listeners[i].apply(emitter, args);
    }
}

function FrameSet(numRows, numCols, pixelFormat, numFrames) {
    this.numRows = numRows;
    this.numCols = numCols;
    this.pixelFormat = pixelFormat;
    this.dataUpdateEvent = new Listenable();

    if (numFrames == null) numFrames = 1;

    var thisFrameSet = this;
    var notifyDataUpdateListeners = function () {
        thisFrameSet.dataUpdateEvent.notifyListeners(thisFrameSet);
    };

    this.frames = [];
    for (var i = 0; i < numFrames; i++) {
        var frame = new Frame(this);
        frame.dataUpdateEvent.addListener(notifyDataUpdateListeners);
        this.frames.push(frame);
    }
}
FrameSet.prototype = {};

function Frame(set) {
    this.set = set;
    this.data = [];
    this.dataUpdateEvent = new Listenable();
    for (var y = 0; y < set.numRows; y++) {
        var row = [];
        for (var x = 0; x < set.numCols; x++) {
            row.push(this.set.pixelFormat.getDefaultPixelData());
        }
        this.data.push(row);
    }
}
Frame.prototype = {};
Frame.prototype.setPixel = function (x, y, pixelData) {
    this.setPixels([[x, y]], pixelData);
};
Frame.prototype.setPixels = function (coords, pixelData) {
    for (var i = 0; i < coords.length; i++) {
        this.data[coords[i][1]][coords[i][0]] = pixelData;
    }
    this.dataUpdateEvent.notifyListeners(this);
};
Frame.prototype.getPixel = function (x, y) {
    return this.data[y][x];
};
Frame.prototype.drawRect = function (x1, y1, x2, y2, pixelData) {
    if (x1 > x2) {
        var swapX = x2;
        x2 = x1;
        x1 = swapX;
    }
    if (y1 > y2) {
        var swapY = y2;
        y2 = y1;
        y1 = swapY;
    }
    var coords = [];
    for (var y = y1; y <= y2; y++) {
        coords.push([x1, y]);
        coords.push([x2, y]);
    }
    for (var x = x1 + 1; x < x2; x++) {
        coords.push([x, y1]);
        coords.push([x, y2]);
    }
    this.setPixels(coords, pixelData);
};

function Overlay(frameSet, frameIndex) {
    this.set = frameSet;
    this.frameIndex = frameIndex;
    this.frame = new Frame(frameSet);
    this.dataUpdateEvent = new Listenable();
    this.clear();
    var thisOverlay = this;
    this.frame.dataUpdateEvent.addListener(function () {
        thisOverlay.dataUpdateEvent.notifyListeners(thisOverlay);
    });
}
Overlay.prototype = {};
Overlay.prototype.clear = function () {
    for (var y = 0; y < this.set.numRows; y++) {
        for (var x = 0; x < this.set.numCols; x++) {
            this.frame.data[y][x] = null;
        }
    }
    this.dataUpdateEvent.notifyListeners(this);
};

function IndexedPixelFormat(palette) {
    this.palette = palette;
}
IndexedPixelFormat.prototype = {};
IndexedPixelFormat.prototype.getDefaultPixelData = function () {
    return 0;
};
IndexedPixelFormat.prototype.storageToDisplay = function (idx) {
    return this.palette[idx];
};

function RGBPixelFormat(bitsPerChannel) {
    this.bitsPerChannel = bitsPerChannel;
}
RGBPixelFormat.prototype = {};
RGBPixelFormat.prototype.getDefaultPixelData = function () {
    return [0, 0, 0];
};

function FrameSetView(containerElem) {
    this.containerElem = containerElem;
    this.cellEvents = {
        mouseOver: new Listenable(),
        mouseOut: new Listenable(),
        mouseUp: new Listenable(),
        mouseDown: new Listenable()
    };
    this.frameEvents = {
        mouseOver: new Listenable(),
        mouseOut: new Listenable()
    };
    // Used to keep track of which frame we last saw the mouse cursor
    // inside so we can fire events when this changes. This works
    // around glitchy event dispatching when we see events from the
    // row and cell elements.
    this.mouseOverFrameIndex = null;
    // Used to keep track of which frame we last saw a mousedown event
    // so that we can attach a mouseup event to the document body and still
    // know which frame to fire the event against.
    this.mouseDownFrameIndex = null;
}
FrameSetView.prototype = {};
FrameSetView.prototype.update = function (frameSet, overlay) {
    var update = d3.select(this.containerElem).selectAll(".frame").data(frameSet.frames);

    // Bind to a real local variable so that it'll be available in the
    // closures below.
    var thisFrameSetView = this;

    var fireFrameEvent = function (eventName, frameIndex) {
        var listenable = thisFrameSetView.frameEvents[eventName];
        listenable.notifyListeners(thisFrameSetView, [frameIndex]);
    };

    var enter = update.enter().append("div");
    enter.attr("class", "frame");
    enter.on('mouseover', function (d, i) {
        if (i != thisFrameSetView.mouseOverFrameIndex) {
            if (thisFrameSetView.mouseOverFrameIndex != null) {
                fireFrameEvent("mouseOut", i);
            }
            thisFrameSetView.mouseOverFrameIndex = i;
            fireFrameEvent("mouseOver", i);
        }
    }, true);
    enter.on('mouseout', function (d, i) {
        // Ignore events bubbling up from children.
        if (d3.event.fromElement.className != "frame") return;
        fireFrameEvent("mouseOut", i);
        thisFrameSetView.mouseOverFrameIndex = null;
    }, true);

    var rowsUpdate = update.selectAll(".matrix-row").data(function (d, i) {
        return d.data.map(function (row, rowIndex) {
            return {
                frameIndex: i,
                rowIndex: rowIndex,
                cells: row
            };
        });
    });
    var rowsEnter = rowsUpdate.enter().append("div");
    rowsEnter.attr("class", "matrix-row");
    rowsUpdate.exit().remove();

    var colsUpdate = rowsUpdate.selectAll(".matrix-cell").data(function (d, i) {
        // The pixel data from each row in storage (not display) format.
        return d.cells.map(function (pixelData, cellIndex) {
            return {
                frameIndex: d.frameIndex,
                rowIndex: d.rowIndex,
                cellIndex: cellIndex,
                pixelData: pixelData
            };
        });
    });
    var colsEnter = colsUpdate.enter().append("div");
    colsEnter.attr("class", "matrix-cell");

    var cellEventHandler = function (eventName) {
        var listenable = thisFrameSetView.cellEvents[eventName];
        return function (d) {
            if (eventName == "mouseDown") {
                thisFrameSetView.mouseDownFrameIndex = d.frameIndex;
            }
            else if (eventName == "mouseUp") {
                // Unset this so that our document-wide mouseup handler
                // won't try to re-fire this event after it bubbles.
                thisFrameSetView.mouseDownFrameIndex = null;
            }
            listenable.notifyListeners(thisFrameSetView, [d.frameIndex, d.cellIndex, d.rowIndex]);
        };
    };

    colsEnter.on("mousedown", cellEventHandler("mouseDown"));
    colsEnter.on("mouseup", cellEventHandler("mouseUp"));
    d3.select(document.body).on("mouseup.framesetview", function () {
        // This is to catch the case where the user puts the mouse down
        // while over a cell but then moves the mouse out of all of the
        // cells before releasing it. We need to still raise the
        // event in this case so the controller can tell that the drag
        // was cancelled.
        if (thisFrameSetView.mouseDownFrameIndex != null) {
            thisFrameSetView.cellEvents.mouseUp.notifyListeners(
                thisFrameSetView,
                [ null, null, null ]
            );
        }
    });
    colsEnter.on("mouseup", cellEventHandler("mouseUp"));
    colsEnter.on("mouseover", cellEventHandler("mouseOver"));
    colsEnter.on("mouseout", cellEventHandler("mouseOut"));

    colsUpdate.style("background-color", function (d) {
        // Input is a pixel in storage format. We must use the frameset's
        // pixel format to convert to an RGB value we can actually render,
        // and then finally convert that into a CSS color value.
        var dispColor = frameSet.pixelFormat.storageToDisplay(d.pixelData);
        if (d.frameIndex == overlay.frameIndex) {
            // overlay can optionally override our color
            var overlayColor = overlay.frame.data[d.rowIndex][d.cellIndex];
            if (overlayColor != null) {
                dispColor = frameSet.pixelFormat.storageToDisplay(overlayColor);
            }
        }
        return "rgb(" + dispColor.join(",") + ")";
    });
    colsUpdate.exit().remove();

    update.exit().remove();
}
FrameSetView.prototype.addCellClickListener = function (cb) {
    this.cellClickListeners.push(cb);
};

function ColorPickerView(containerElem) {
    this.containerElem = containerElem;
    this.colorPickEvent = new Listenable();
    this.lastPixelFormat = null;
};
ColorPickerView.prototype = {};
ColorPickerView.prototype.update = function (pixelFormat, currentColor) {
    var container = d3.select(this.containerElem);

    var thisColorPickerView = this;
    var notifyColorPickListeners = function (selectedColor) {
        thisColorPickerView.colorPickEvent.notifyListeners(
            thisColorPickerView,
            [selectedColor]
        );
    };

    if (pixelFormat !== this.lastPixelFormat) {
        // If we've changed to a new pixelFormat object then we might
        // have changed our color model altogether and so we should
        // just tear down the whole UI and start from scratch in case
        // the new format requires a completely different sort of UI.
        container.text('');
    }

    if (pixelFormat instanceof IndexedPixelFormat) {
        var update = container.selectAll(".color-well").data(pixelFormat.palette);
        var enter = update.enter().append("div");
        enter.attr('class', 'color-well');
        enter.on('click', function (d, i) {
            notifyColorPickListeners(i);
        });

        update.style('background-color', function (d) {
            return 'rgb(' + d.join(',') + ')';
        });
        update.classed('current', function (d, i) {
             return (i == currentColor ? true : false);
        });
    }
};
ColorPickerView.prototype.addColorPickListener = function (cb) {
    this.colorPickListeners.push(cb);
};

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
