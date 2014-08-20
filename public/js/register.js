function showAlert() {
    $("#myAlert").addClass("out");
}

$(document).ready($){
	window.setTimeout(function () {
   		showAlert();
	}, 3000);
}
