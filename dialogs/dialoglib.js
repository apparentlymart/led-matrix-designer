
document.write("<link rel='stylesheet' type='text/css' href='jquery-ui-1.9.2.custom.min.css'>");
document.write("<link rel='stylesheet' type='text/css' href='dialoglib.css'>");
document.write("<script type='text/javascript' src='../js/jquery-1.8.3.js'></script>");
document.write("<script type='text/javascript' src='jquery-ui-1.9.2.custom.min.js'></script>");

var dialog = {};

(function () {

     var jQueryPoll = setInterval(function () {
         if (! window.$) return;
         clearInterval(jQueryPoll);
         $(document).ready(function () {

             $("#dialogactions button").button();

             var $dialog = $("#dialog");
             window.parent.__notifyDialogReady($dialog.width(), $dialog.height());
         });
     }, 500);

     dialog.cancel = function () {
         window.parent.__notifyDialogCancel();
     };
     dialog.confirm = function (data) {
         window.parent.__notifyDialogConfirm(data);
     };
     dialog.getArgs = function () {
         return window.parent.__getDialogArgs();
     };

})();

