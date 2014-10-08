function showAlert() {
    $("#myAlert").addClass("out");
}

jQuery(document).ready(function($){
	window.setTimeout(function () {
   		showAlert();
	}, 3000);
});
