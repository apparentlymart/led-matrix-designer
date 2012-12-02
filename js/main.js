
function FrameSet(numRows, numCols, pixelFormat, numFrames) {
    this.numRows = numRows;
    this.numCols = numCols;
    this.pixelFormat = pixelFormat;
    this.dataUpdateListeners = [];

    if (numFrames == null) numFrames = 1;

    var thisFrameSet = this;
    var notifyDataUpdateListeners = function () {
        for (i = 0; i < this.dataUpdateListeners.length; i++) {
            thisFrameSet.dataUpdateListeners[i].call(thisFrameSet);
        }
    };

    this.frames = [];
    for (var i = 0; i < numFrames; i++) {
        var frame = new Frame(this);
        frame.addDataUpdateListener(notifyDataUpdateListeners);
        this.frames.push(frame);
    }
}
FrameSet.prototype = {};
FrameSet.prototype.addDataUpdateListener = function (cb) {
    this.dataUpdateListeners.push(cb);
};

function Frame(set) {
    this.set = set;
    this.data = [];
    this.dataUpdateListeners = [];
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
    for (i = 0; i < this.dataUpdateListeners.length; i++) {
        this.dataUpdateListeners[i].call(this);
    }
};
Frame.prototype.getPixel = function (x, y) {
    return this.data[y][x];
};
Frame.prototype.addDataUpdateListener = function (cb) {
    this.dataUpdateListeners.push(cb);
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
    this.cellClickListeners = [];
}
FrameSetView.prototype = {};
FrameSetView.prototype.update = function (frameSet) {
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
        var clickListeners = thisFrameSetView.cellClickListeners;
        for (var i = 0; i < clickListeners.length; i++) {
            clickListeners[i].call(
                thisFrameSetView,
                d.frameIndex,
                d.cellIndex,
                d.rowIndex
            );
        }
    });
    colsUpdate.style("background-color", function (d) {
        // Input is a pixel in storage format. We must use the frameset's
        // pixel format to convert to an RGB value we can actually render,
        // and then finally convert that into a CSS color value.
        var dispColor = frameSet.pixelFormat.storageToDisplay(d.pixelData);
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
    this.colorPickListeners = [];
    this.lastPixelFormat = null;
};
ColorPickerView.prototype = {};
ColorPickerView.prototype.update = function (pixelFormat, currentColor) {
    var container = d3.select(this.containerElem);

    var thisColorPickerView = this;
    var notifyColorPickListeners = function (selectedColor) {
        var listeners = thisColorPickerView.colorPickListeners;
        for (var i = 0; i < listeners.length; i++) {
            listeners[i].call(thisColorPickerView, selectedColor);
        }
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

function init() {

    var pixelFormat = new IndexedPixelFormat([[0, 0, 0], [255, 0, 0]]);
    var frameSet = new FrameSet(8, 5, pixelFormat, 4);

    var frameSetView = new FrameSetView(document.getElementById("workspace"));
    var colorPickerView = new ColorPickerView(document.getElementById("colors"));
    var currentColor = pixelFormat.getDefaultPixelData();

    frameSetView.addCellClickListener(function (frameIndex, x, y) {
        var frame = frameSet.frames[frameIndex];
        frame.setPixel(x, y, currentColor);
    });

    colorPickerView.update(pixelFormat, currentColor);
    colorPickerView.addColorPickListener(function (selectedColor) {
        currentColor = selectedColor;
        colorPickerView.update(pixelFormat, currentColor);
    });

    frameSetView.update(frameSet);
    frameSet.addDataUpdateListener(function () {
        frameSetView.update(frameSet);
    });


}


$("#matrix").ready(init);
