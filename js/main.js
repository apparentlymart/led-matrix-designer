
var numRows = 8;
var numCols = 24;

function initMatrix() {

    for (var r = 0; r < numRows; r++) {
        var $row = $("<div class='matrix-row'></div>");
        for (var c = 0; c < numCols; c++) {
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


$("#matrix").ready(initMatrix);
