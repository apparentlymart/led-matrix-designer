
var docActions = {
    new: {
        caption: 'New...',
        click: function (frameSet, toolState) {
            console.log("Clicked on 'new'");
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
