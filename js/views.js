
/////// Views
/////// Each of these is responsible for presenting a particular kind of data
/////// via HTML and providing an interactive UI that fires high-level events
/////// that the controller can use to coordinate the app as a whole.

// Provides the main workspace with the frames presented as 2D grids,
// and surfaces events when the user interacts with the pixels using the mouse.
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


// Provides a UI for choosing colors from a given pixel format, and surfaces
// an event when the user chooses a new color.
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

