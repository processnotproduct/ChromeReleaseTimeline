$(document).ready(function(){
//This code freezes the headers of the table called requestList
$(document).scroll(function () {
    if ($('#releasesTable').size() > 0) {
        var deltaA = $(window).scrollTop() - $("#releasesTable thead.top").offset().top;
        if (deltaA > -190) {
            translate($("#releasesTable thead.top tr"), 0, deltaA + 190);
        } else {
            translate($("#releasesTable thead.top tr"), 0, 0);
        }
    }

    if ($('#devicesTable').size() > 0) {
        var deltaB = $(window).scrollLeft() - $("#devicesTable tbody.side").offset().left;
        // window.console && console.log('deltaB: ' + deltaB);
        if (deltaB > 0) {
            translate($("#devicesTable tbody.side tr"), deltaB, 0);
        } else {
            translate($("#devicesTable tbody.side tr"), 0, 0);
        }
    }
});


function translate(element, x, y) {
    var translation = "translate(" + x + "px," + y + "px)";

    element.css({
        "transform": translation,
        "-ms-transform": translation,
        "-webkit-transform": translation,
        "-o-transform": translation,
        "-moz-transform": translation,
    });

}

});