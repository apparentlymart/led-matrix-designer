
var docActions = {
    new: {
        caption: 'New...',
        click: function (actionData) {
            console.log("Clicked on 'new'");
            showDialog("newFrameSet", {}, function (data) {
                if (data == null) return;

                var palette = [
                    [ 0, 0, 0 ],
                    [ 255, 0, 0 ]
                ];

                for (var i = palette.length; i < data.pixelFormat.colors; i++) {
                    palette.push([ 0, 0, 0 ]);
                }

                var pixelFormat = new IndexedPixelFormat(palette);
                var frameSet = new FrameSet(data.height, data.width, pixelFormat, 1);

                actionData.replaceFrameSet(frameSet);
            });
        }
    },
    open: {
        caption: 'Open...',
        click: function (frameSet, toolState) {
            console.log("Clicked on 'open'");
        }
    },
    save: {
        caption: 'Save',
        click: function (frameSet, toolState) {
            console.log("Clicked on 'save'");
        }
    },
    'export': {
        caption: 'Export...',
        click: function (frameSet, toolState) {

        }
    },
    undo: {
        caption: 'Undo',
        click: function (frameSet, toolState) {

        }
    },
    redo: {
        caption: 'Redo',
        click: function (frameSet, toolState) {

        }
    },
    properties: {
        caption: 'Properties',
        click: function (frameSet, toolState) {

        }
    }
};
var docActionsOrder = [
    "new",
    "open",
    "save",
    "export",
    "undo",
    "redo",
    "properties"
];
