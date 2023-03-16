document.addEventListener('mouseup', function(event) {
	// console.log("document mouseup");
	try {
		var HoldToTalkButton = document.getElementById('HoldToTalkButton');
		var EditButton = document.getElementById('EditButton');
		var CancelButton = document.getElementById('CancelButton');

		if (CancelButton.contains(event.target)) {
			console.log("CN_CanceButtonMouseOver");
			CN_HoldToTalkHandle(1)
			jQuery("textarea").val("");
		} else if (EditButton.contains(event.target)) {
			console.log("CN_EditlButtonMouseOver");
			if (CHECK_RECOGNITION_STATE == 1) {
				jQuery("textarea").val("");
				showToastMessage("You have not say anything yet.");
			} else if (CHECK_RECOGNITION_STATE == 2) {
				showToastMessage("You can edit your message now.");
				jQuery("textarea").val(CN_EXIST_TEXT);
			}
			CN_HoldToTalkHandle(1)
		} else if (HoldToTalkButton.contains(event.target)) {
			if (CHECK_RECOGNITION_STATE == 1) {
				CN_EXIST_TEXT = "";
				jQuery("textarea").val(CN_EXIST_TEXT);
				showToastMessage("You have not say anything yet.");
			}
			CN_HoldToTalkHandle(0)
		} else if (CHECK_RECOGNITION_STATE != -1) {
			console.log("mouse up outside to cancel");
			CN_HoldToTalkHandle(1)
			jQuery("textarea").val("");
		}
	} catch (error) {
		console.log("error: " + error);
	}
});