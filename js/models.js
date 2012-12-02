
////// Data models

// A collection of frames that share the same physical characteristics.
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

// A single frame, containing 2d pixel data.
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

// An additional array of pixel data intended for temporary overlays over
// the main pixel data for UI purposes.
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

//// Pixel Formats: There are a few flavors of these. Each is responsible
//// for defining a pixel data format and then converting from that format
//// to an [r, g, b] array that can be used for display in the UI. In future
//// these will also be responsible for finding a nearest color to a
//// particular [r, g, b] array to handle pixel format conversions as well
//// as imports of RGB data from other sources.

// Indexed Pixel Format represents a pixel as an index into its palette array.
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

// RGB Pixel Format represents a pixel as an [r, g, b] array with a specified
// number of bits in each channel. It can convert this to an 8-bit-per-channel
// RGB array for display purposes.
// This is not fully implemented yet, nor is it selectable from the UI.
function RGBPixelFormat(bitsPerChannel) {
    this.bitsPerChannel = bitsPerChannel;
}
RGBPixelFormat.prototype = {};
RGBPixelFormat.prototype.getDefaultPixelData = function () {
    return [0, 0, 0];
};
