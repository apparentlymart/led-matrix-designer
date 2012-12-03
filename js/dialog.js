
//// Common code for showing modal dialog boxes.
//// The actual modal dialog implementations are HTML files under
//// the dialogs/ directory.

var showDialog;
var __notifyDialogReady;
var __notifyDialogConfirm;
var __notifyDialogCancel;
var __getDialogArgs;

(function () {

     var currentShroud = null;
     var currentCallback = null;
     var currentArgs = null;

     showDialog = function (dialogName, args, cb) {

         if (currentShroud != null) {
             console.log("Tried to show a dialog when one is already showing");
             return;
         }

         var dialogUrl = "dialogs/" + dialogName + ".html";

         var shroud = d3.select(document.body).append("div");
         currentShroud = shroud;
         shroud.attr("id", "dialogshroud");
         shroud.on('keyup', function (d, i) {
             if (d3.event.keyCode == 27) {
                 __notifyDialogCancel();
             }
         });

         var dialog = shroud.append("div");
         dialog.attr("id", "dialog");
         dialog.style('width', '0').style('height', '0');

         var throbber = shroud.append("div");
         throbber.attr("id", "dialogthrobber");

         var title = dialog.append("div");
         title.attr("id", "dialogtitle");

         var frame = dialog.append("iframe");
         frame.attr("id", "dialogframe");
         frame.attr("src", dialogUrl);

         currentCallback = cb;
         currentArgs = args;

     };

     // Called from inside the dialog iframes to signal that they are
     // ready to be shown.
     __notifyDialogReady = function (width, height) {
         if (currentShroud == null) return;
         d3.select("#dialogthrobber").remove();
         var title = document.getElementById("dialogframe").contentDocument.title;
         d3.select("#dialogtitle").text(title).style("width", (width - 8) + "px"); // the -8 here is to account for the padding applied in the stylesheet :(
         d3.select("#dialogframe").style("width", width + "px").style("height", height + "px");
         d3.select("#dialog").style("width", "").style("height", "");
     };

     __notifyDialogCancel = function () {
         if (currentCallback != null) {
             currentCallback(null);
         }
         currentShroud.remove();
         currentShroud = null;
         currentCallback = null;
         currentArgs = null;
     };
     __notifyDialogConfirm = function (data) {
         if (currentCallback != null) {
             currentCallback(data);
         }
         currentShroud.remove();
         currentShroud = null;
         currentCallback = null;
         currentArgs = null;
     };
     __getDialogArgs = function () {
         return currentArgs;
     };

})();

