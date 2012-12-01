
function FrameSet(numRows, numCols, pixelFormat, numFrames) {
    this.numRows = numRows;
    this.numCols = numCols;
    this.pixelFormat = pixelFormat;

    if (numFrames == null) numFrames = 1;

    this.frames = [];
    for (var i = 0; i < numFrames; i++) {
        this.frames.push(new Frame(this));
    }
}

function Frame(set) {
    this.set = set;
    this.data = [];
    for (var y = 0; y < set.numRows; y++) {
        var row = [];
        for (var x = 0; x < set.numCols; x++) {
            row.push(this.set.pixelFormat.getDefaultPixelData());
        }
        this.data.push(row);
    }
}

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
}
FrameSetView.prototype = {};
FrameSetView.prototype.update = function (frameSet) {
    var update = d3.select(this.containerElem).selectAll(".frame").data(frameSet.frames);

    var enter = update.enter().append("div");
    enter.attr("class", "frame");

    var rowsUpdate = update.selectAll(".matrix-row").data(function (d) {
        // The set of rows from each frame.
        return d.data;
    });
    var rowsEnter = rowsUpdate.enter().append("div");
    rowsEnter.attr("class", "matrix-row");
    rowsUpdate.exit().remove();

    var colsUpdate = rowsUpdate.selectAll(".matrix-cell").data(function (d) {
        // The pixel data from each row in storage (not display) format.
        return d;
    });
    var colsEnter = colsUpdate.enter().append("div");
    colsEnter.attr("class", "matrix-cell");
    colsUpdate.style("background-color", function (d) {
        // Input is a pixel in storage format. We must use the frameset's
        // pixel format to convert to an RGB value we can actually render,
        // and then finally convert that into a CSS color value.
        var dispColor = frameSet.pixelFormat.storageToDisplay(d);
        return "rgb(" + dispColor.join(",") + ")";
    });
    colsUpdate.exit().remove();

    update.exit().remove();
};

var frameSet = null;
var frameSetView = null;

function init() {

    var pixelFormat = new IndexedPixelFormat([[0, 0, 0], [255, 0, 0]]);
    var frameSet = new FrameSet(8, 5, pixelFormat, 4);

    var frameSetView = new FrameSetView(document.getElementById("workspace"));

    frameSetView.update(frameSet);

}


$("#matrix").ready(init);
