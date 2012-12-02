
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
    this.setPixels([x, y], pixelData);
};
Frame.prototype.setPixels = function (coords, pixelData) {
    for (var i = 0; i < coords.length; i++) {
        this.data[coords[1]][coords[0]] = pixelData;
    }
    this.dataUpdateEvent.notifyListeners(this);
};
Frame.prototype.getPixel = function (x, y) {
    return this.data[y][x];
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
    this.cellClickEvent = new Listenable();
}
FrameSetView.prototype = {};
FrameSetView.prototype.update = function (frameSet, overlay) {
    var update = d3.select(this.containerElem).selectAll(".frame").data(frameSet.frames);

    var enter = update.enter().append("div");
    enter.attr("class", "frame");

    // Bind to a real local variable so that it'll be available in the
    // closures below.
    var thisFrameSetView = this;

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
    colsEnter.on("click", function (d) {
        thisFrameSetView.cellClickEvent.notifyListeners(
            thisFrameSetView,
            [d.frameIndex, d.cellIndex, d.rowIndex]
        );
    });
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
        click: function (frame, x, y, toolState) {
            frame.setPixel(x, y, toolState.currentColor);
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
        overlay: new Overlay(frameSet, null)
    };

    frameSetView.cellClickEvent.addListener(function (frameIndex, x, y) {
        var frame = frameSet.frames[frameIndex];
        currentTool.click(frame, x, y, toolState);
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
