
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
            row.push(this.set.pixelFormat.getDefaultPixelData);
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

function RGBPixelFormat(bitsPerChannel) {
    this.bitsPerChannel = bitsPerChannel;
}
RGBPixelFormat.prototype = {};
RGBPixelFormat.prototype.getDefaultPixelData = function () {
    return [0, 0, 0];
};

var frameSet = null;

function init() {

    var pixelFormat = new IndexedPixelFormat([[0, 0, 0], [255, 0, 0]]);
    var frameSet = new FrameSet(8, 24, pixelFormat, 1);

    for (var r = 0; r < frameSet.numRows; r++) {
        var $row = $("<div class='matrix-row'></div>");
        for (var c = 0; c < frameSet.numCols; c++) {
            var $cell = $("<div class='matrix-cell'></div>");
            $row.append($cell);
        }
        $("#matrix").append($row);
    }

    $(".matrix-cell").bind('click', function () {
        var $this = $(this);

        console.log("It's ", this.style.backgroundColor);

        if (this.style.backgroundColor != "") {
            console.log("off");
            $this.css("background-color", "");
        }
        else {
            console.log("on");
            $this.css("background-color", "red");
        }
    });
}


$("#matrix").ready(init);
