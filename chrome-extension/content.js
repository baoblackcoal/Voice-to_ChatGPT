﻿// TALK TO CHATGPT
// ---------------
// Author		: C. NEDELCU
// Version		: 1.6.1
// Git repo 	: https://github.com/C-Nedelcu/talk-to-chatgpt
// Chat GPT URL	: https://chat.openai.com/chat
// How to use   : https://www.youtube.com/watch?v=VXkLQMEs3lA


// ----------------------------
// SETTINGS (FEEL FREE TO EDIT)
// ----------------------------
// These are the default settings. Since v1.3, a 'settings' menu allows to change most of the below values in the UI
// Since v1.4, these settings are saved. So there is no need to edit them out anymore.

// Settings for the text-to-speech functionality (the bot's voice)
var CN_TEXT_TO_SPEECH_RATE = 1; // The higher the rate, the faster the bot will speak
var CN_TEXT_TO_SPEECH_PITCH = 1; // This will alter the pitch for the bot's voice

// Indicate a locale code such as 'fr-FR', 'en-US', to use a particular language for the speech recognition functionality (when you speak into the mic)
// If you leave this blank, the system's default language will be used
var CN_WANTED_LANGUAGE_SPEECH_REC = ""; //"fr-FR";

// Determine which word will cause this scrip to stop.
var CN_SAY_THIS_WORD_TO_STOP = "stop";

// Determine which word will cause this script to temporarily pause
var CN_SAY_THIS_WORD_TO_PAUSE = "pause";

// Determine whether messages are sent immediately after speaing
var CN_AUTO_SEND_AFTER_SPEAKING = false;

// Determine which word(s) will cause this script to send the current message (if auto-send disabled)
var CN_SAY_THIS_TO_SEND = "send message now";

// Indicate "locale-voice name" (the possible values are difficult to determine, you should just ignore this and use the settings menu instead)
var CN_WANTED_VOICE_NAME = "";

var CN_SPEAKING_DISABLED = false;

var CN_SPEAKING_ITEM_DISABLED = true;

// ----------------------------


const recordButtonRecordSvg = " <svg stroke='currentColor' stroke-width='1.3' viewBox='0 0 24 24'  fill='none' height='22px' width='22px'  xmlns='http://www.w3.org/2000/svg'> <path fill-rule='evenodd' clip-rule='evenodd' d='M8 6C8 3.79086 9.79086 2 12 2C14.2091 2 16 3.79086 16 6V11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11V6Z' fill='#152C70'/> 		<path d='M5 9C5.55228 9 6 9.44772 6 10V11C6 14.3137 8.68629 17 12 17C15.3137 17 18 14.3137 18 11V10C18 9.44772 18.4477 9 19 9C19.5523 9 20 9.44772 20 10V11C20 15.0803 16.9453 18.4471 12.9981 18.9383C12.9994 18.9587 13 18.9793 13 19V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V19C11 18.9793 11.0006 18.9587 11.0019 18.9383C7.05466 18.4471 4 15.0803 4 11V10C4 9.44772 4.44772 9 5 9Z' fill='#152C70'/> </svg> ";
const recordButtonSendSvg = "<svg  stroke-width='1.3' viewBox='0 0 48 48'  fill='none' height='22px' width='22px'  xmlns='http://www.w3.org/2000/svg'> <path d='M48 0H0V48H48V0Z'  /> <path d='M43 5L29.7 43L22.1 25.9L5 18.3L43 5Z' stroke='currentColor' stroke-width='4' stroke-linejoin='round'  /> <path  d='M43.0001 5L22.1001 25.9' stroke='currentColor' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/> </svg>";

// -------------------
// CODE (DO NOT ALTER)
// -------------------
var CN_MESSAGE_COUNT = 0;
var CN_CURRENT_MESSAGE = null;
var CN_CURRENT_MESSAGE_SENTENCES = [];
var CN_CURRENT_MESSAGE_SENTENCES_NEXT_READ = 0;
var CN_SPEECHREC = null;
var CN_IS_READING = false;
var CN_IS_LISTENING = false;
var CN_FINISHED = false;
var CN_PAUSED = false;
var CN_WANTED_VOICE = null;
var CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = null;
var CN_TIMEOUT_KEEP_SPEECHREC_WORKING = null;
var CN_SPEECH_REC_SUPPORTED = false;
var CN_SPEECHREC_DISABLED = false;

var CN_MOUSE_CLICK = 1; //0-DOWN, 1-UP
var CHECK_RECOGNITION_INTERVAL_ID = null;
var CHECK_RECOGNITION_INTERVAL_CNT = 0;
var CHECK_RECOGNITION_STATE = -1; //-1-ready, 0-start listening, 1-listening and not get words, 2-listening and get words, 3-stop listening
var CHECK_LISTEN_DOT = ' .';
var CN_EXIST_TEXT = '';
var RecordSendState = 0; //0: recording, 1: sending


// This function will say the given text out loud using the browser's speech synthesis API
function CN_SayOutLoud(text) {
	if (!CN_SPEAKING_ITEM_DISABLED) {
		CN_SPEAKING_ITEM_DISABLED = true;
	} else if (!text || CN_SPEAKING_DISABLED ) {
		if (CN_SPEECH_REC_SUPPORTED && CN_SPEECHREC && !CN_IS_LISTENING && !CN_PAUSED && !CN_SPEECHREC_DISABLED) CN_SPEECHREC.start();
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
		return;
	}

	// Are we speaking?
	if (CN_SPEECHREC) {
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_SPEECHREC.stop();
	}

	// Let's speak out loud
	console.log("Saying out loud: " + text);
	var msg = new SpeechSynthesisUtterance();
	msg.text = text;

	if (CN_WANTED_VOICE) msg.voice = CN_WANTED_VOICE;
	msg.rate = CN_TEXT_TO_SPEECH_RATE;
	msg.pitch = CN_TEXT_TO_SPEECH_PITCH;
	msg.onstart = () => {
		// Make border green
		$("#TTGPTSettings").css("border-bottom", "8px solid green");

		// If speech recognition is active, disable it
		if (CN_IS_LISTENING) CN_SPEECHREC.stop();

		if (CN_FINISHED) return;
		CN_IS_READING = true;
		clearTimeout(CN_TIMEOUT_KEEP_SYNTHESIS_WORKING);
		CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(CN_KeepSpeechSynthesisActive, 5000);
	};
	msg.onend = () => {
		CN_AfterSpeakOutLoudFinished();
	}
	CN_IS_READING = true;
	window.speechSynthesis.speak(msg);
}

// Occurs when speaking out loud is finished
function CN_AfterSpeakOutLoudFinished() {
	// Make border grey again
	$("#TTGPTSettings").css("border", "2px solid #888");

	if (CN_FINISHED) return;

	// Finished speaking
	clearTimeout(CN_TIMEOUT_KEEP_SYNTHESIS_WORKING);
	console.log("Finished speaking out loud");

	// restart listening
	CN_IS_READING = false;
	setTimeout(function () {
		if (!window.speechSynthesis.speaking) {
			if (CN_SPEECH_REC_SUPPORTED && CN_SPEECHREC && !CN_IS_LISTENING && !CN_PAUSED && !CN_SPEECHREC_DISABLED) CN_SPEECHREC.start();
			clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
			CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
		}
	}, 500);
}

// This is a workaround for Chrome's bug in the speech synthesis API (https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts)
function CN_KeepSpeechSynthesisActive() {
	console.log("Keeping speech synthesis active...");
	window.speechSynthesis.pause();
	window.speechSynthesis.resume();
	CN_TIMEOUT_KEEP_SYNTHESIS_WORKING = setTimeout(CN_KeepSpeechSynthesisActive, 5000);
}

// Split the text into sentences so the speech synthesis can start speaking as soon as possible
function CN_SplitIntoSentences(text) {
	var sentences = [];
	var currentSentence = "";

	for (var i = 0; i < text.length; i++) {
		//
		var currentChar = text[i];

		// Add character to current sentence
		currentSentence += currentChar;

		// is the current character a delimiter? if so, add current part to array and clear
		if (
			// Latin punctuation
			currentChar == ','
			|| currentChar == ':'
			|| currentChar == '.'
			|| currentChar == '!'
			|| currentChar == '?'
			|| currentChar == ';'
			|| currentChar == '…'
			// Chinese/japanese punctuation
			|| currentChar == '、'
			|| currentChar == '，'
			|| currentChar == '。'
			|| currentChar == '．'
			|| currentChar == '！'
			|| currentChar == '？'
			|| currentChar == '；'
			|| currentChar == '：'
		) {
			if (currentSentence.trim() != "") sentences.push(currentSentence.trim());
			currentSentence = "";
		}
	}

	return sentences;
}

function sayItem(text) {
	window.speechSynthesis.pause(); // Pause, and then...
	window.speechSynthesis.cancel(); // Cancel everything
	CN_CURRENT_MESSAGE = null; // Remove current message
	CN_SPEAKING_ITEM_DISABLED = false; // Enable speaking items
	CN_SayOutLoud(text);
}

// Check for new messages the bot has sent. If a new message is found, it will be read out loud
function CN_CheckNewMessages(isInit = false) {
	// Any new messages?
	var currentMessageCount = jQuery(".text-base").length;
	// console.log("isInit="+isInit)
	// console.log("Current message count: " + currentMessageCount + ", previous message count: " + CN_MESSAGE_COUNT)
	if (currentMessageCount != CN_MESSAGE_COUNT) {
		CN_MESSAGE_COUNT = currentMessageCount;
		if (!isInit) {
			// New message!
			CN_CURRENT_MESSAGE = jQuery(".text-base:last");
			CN_CURRENT_MESSAGE_SENTENCES = []; // Reset list of parts already spoken
			CN_CURRENT_MESSAGE_SENTENCES_NEXT_READ = 0;
		}
	}

	// Split current message into parts
	if (CN_CURRENT_MESSAGE && CN_CURRENT_MESSAGE.length) {
		var currentText = CN_CURRENT_MESSAGE.text() + "";
		var newSentences = CN_SplitIntoSentences(currentText);
		if (newSentences != null && newSentences.length != CN_CURRENT_MESSAGE_SENTENCES.length) {
			// There is a new part of a sentence!
			var nextRead = CN_CURRENT_MESSAGE_SENTENCES_NEXT_READ;
			for (i = nextRead; i < newSentences.length; i++) {
				CN_CURRENT_MESSAGE_SENTENCES_NEXT_READ = i + 1;

				var lastPart = newSentences[i];
				CN_SayOutLoud(lastPart);
			}
			CN_CURRENT_MESSAGE_SENTENCES = newSentences;
		}
	}

	setTimeout(CN_CheckNewMessages, 100);
}

// Send a message to the bot (will simply put text in the textarea and simulate a send button click)
function CN_SendMessage(text) {
	// Put message in textarea
	jQuery("textarea:first").focus();
	var existingText = jQuery("textarea:first").val();

	// Is there already existing text?
	if (!existingText ) {
		jQuery("textarea").val(text);
	} else if (CHECK_RECOGNITION_STATE == 1) {
		CHECK_RECOGNITION_STATE = 2;
		CN_EXIST_TEXT = text
		jQuery("textarea").val(CN_EXIST_TEXT);
	} else {
		CN_EXIST_TEXT = CN_EXIST_TEXT + ',' + text
		jQuery("textarea").val(CN_EXIST_TEXT);
	}

	// Change height in case
	var fullText = existingText + " " + text;
	var rows = Math.ceil(fullText.length / 88);
	var height = rows * 24;
	jQuery("textarea").css("height", height + "px");

	// Send the message, if autosend is enabled
	if (CN_AUTO_SEND_AFTER_SPEAKING) {
		jQuery("textarea").closest("div").find("button").click();

		// Stop speech recognition until the answer is received
		if (CN_SPEECHREC) {
			clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
			CN_SPEECHREC.stop();
		}
	} else {
		// No autosend, so continue recognizing
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
	}
}

// Start speech recognition using the browser's speech recognition API
function CN_StartSpeechRecognition() {
	if (CN_IS_READING) {
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
		return;
	}
	if (!CN_SPEECH_REC_SUPPORTED) return;
	CN_SPEECHREC = ('webkitSpeechRecognition' in window) ? new webkitSpeechRecognition() : new SpeechRecognition();
	CN_SPEECHREC.continuous = true;
	CN_SPEECHREC.lang = CN_WANTED_LANGUAGE_SPEECH_REC;
	CN_SPEECHREC.onstart = () => {
		// Make border red
		$("#TTGPTSettings").css("border-bottom", "8px solid red");

		CN_IS_LISTENING = true;
		console.log("I'm listening");
	};
	CN_SPEECHREC.onend = () => {
		// Make border grey again
		$("#TTGPTSettings").css("border", "2px solid #888");

		CN_IS_LISTENING = false;
		console.log("I've stopped listening");
	};
	CN_SPEECHREC.onerror = () => {
		CN_IS_LISTENING = false;
		console.log("Error while listening");
	};
	CN_SPEECHREC.onresult = (event) => {
		var final_transcript = "";
		for (let i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal)
				final_transcript += event.results[i][0].transcript;
		}
		console.log("You have said the following words: " + final_transcript);
		if (CN_MOUSE_CLICK == 1) {
			console.log("mouse not press: " + final_transcript);
			return;
		}
		// else if (final_transcript.toLowerCase() == CN_SAY_THIS_WORD_TO_STOP) {
		// 	console.log("You said '"+ CN_SAY_THIS_WORD_TO_STOP+"'. Conversation ended");
		// 	CN_FINISHED = true;
		// 	CN_PAUSED = false;
		// 	CN_SPEECHREC.stop();
		// 	CN_SayOutLoud("Bye bye");
		// 	alert("Conversation ended. Click the Start button to resume");

		// 	// Show start button, hide action buttons
		// 	jQuery(".CNStartZone").show();
		// 	jQuery(".CNActionButtons").hide();

		// 	return;
		// } else if (final_transcript.toLowerCase() == CN_SAY_THIS_WORD_TO_PAUSE) {
		// 	console.log("You said '"+ CN_SAY_THIS_WORD_TO_PAUSE+"' Conversation paused");
		// 	CN_PAUSED = true;
		// 	if (CN_SPEECHREC) CN_SPEECHREC.stop();
		// 	alert("Conversation paused, the browser is no longer listening. Click OK to resume");
		// 	CN_PAUSED = false;
		// 	console.log("Conversation resumed");
		// 	return;
		// } else if (final_transcript.toLowerCase().trim() == CN_SAY_THIS_TO_SEND.toLowerCase().trim() && !CN_AUTO_SEND_AFTER_SPEAKING) {			
		// 	console.log("You said '"+ CN_SAY_THIS_TO_SEND+"' - the message will be sent");

		// 	// Click button
		// 	jQuery("textarea").closest("div").find("button").click();

		// 	// Stop speech recognition until the answer is received
		// 	if (CN_SPEECHREC) {
		// 		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		// 		CN_SPEECHREC.stop();
		// 	}

		// 	return;
		// }

		CN_SendMessage(final_transcript);
	};
	if (!CN_IS_LISTENING && CN_SPEECH_REC_SUPPORTED && !CN_SPEECHREC_DISABLED) CN_SPEECHREC.start();
	clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
	CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
}

// Make sure the speech recognition is turned on when the bot is not speaking
function CN_KeepSpeechRecWorking() {
	if (CN_FINISHED) return; // Conversation finished
	clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
	CN_TIMEOUT_KEEP_SPEECHREC_WORKING = setTimeout(CN_KeepSpeechRecWorking, 100);
	if (!CN_IS_READING && !CN_IS_LISTENING && !CN_PAUSED) {
		if (!CN_SPEECHREC)
			CN_StartSpeechRecognition();
		else {
			if (!CN_IS_LISTENING) {
				try {
					if (CN_SPEECH_REC_SUPPORTED && !window.speechSynthesis.speaking && !CN_SPEECHREC_DISABLED)
						CN_SPEECHREC.start();
				} catch (e) { }
			}
		}
	}
}


function CN_ToggleButtonKeyDown() {
	var action = $(this).data("cn");
	console.log("CN_ToggleButtonKeyDown");
	switch (action) {
		case "sayfinish":
			$(this).css("display", "none");
			$(".CNToggle[data-cn=saystart]").css("display", "");

			CN_MOUSE_CLICK = 0;

			window.speechSynthesis.pause(); // Pause, and then...
			window.speechSynthesis.cancel(); // Cancel everything
			CN_CURRENT_MESSAGE = null; // Remove current message

			// Enable speech rec
			CN_SPEECHREC_DISABLED = false;
			if (CN_SPEECHREC && !CN_IS_LISTENING && !CN_IS_READING) CN_SPEECHREC.start();

			// Restart listening maybe?
			CN_AfterSpeakOutLoudFinished();
			return
	}
}


function CN_ToggleButtonKeyUp() {
	console.log("CN_ToggleButtonKeyUp");

	var action = $(this).data("cn");
	switch (action) {
		case "saystart":
			$(this).css("display", "none");
			$(".CNToggle[data-cn=sayfinish]").css("display", "");

			CN_MOUSE_CLICK = 1;

			// Click button
			jQuery("textarea").closest("div").find("button").click();
			// Stop speech recognition until the answer is received
			if (CN_SPEECHREC) {
				clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
				CN_SPEECHREC.stop();
			}

			// Disable speech rec
			CN_SPEECHREC_DISABLED = true;
			if (CN_SPEECHREC && CN_IS_LISTENING) CN_SPEECHREC.stop();

			return
	}
}


function CN_HoldToTalkButtonKeyDown() {
	// $(this).css("display", "none");
	// $(".CNToggle[data-cn=saystart]").css("display", "");
	console.log("CN_HoldToTalkButtonKeyDown");

	jQuery("#CancelButton").show()
	jQuery("#EditButton").show()


	jQuery("#HoldToTalkButton").text("Release To Send");

	CN_MOUSE_CLICK = 0;

	window.speechSynthesis.pause(); // Pause, and then...
	window.speechSynthesis.cancel(); // Cancel everything
	CN_CURRENT_MESSAGE = null; // Remove current message

	// Enable speech rec
	CN_SPEECHREC_DISABLED = false;
	if (CN_SPEECHREC && !CN_IS_LISTENING && !CN_IS_READING) CN_SPEECHREC.start();

	CHECK_RECOGNITION_STATE = 0;
	CHECK_RECOGNITION_INTERVAL_ID = setInterval(CN_checkRecognition, 100);

	// Restart listening maybe?
	CN_AfterSpeakOutLoudFinished();

}

function CN_checkRecognition(event) {
	// console.log("CN_checkRecognition CHECK_RECOGNITION_STATE="+CHECK_RECOGNITION_STATE);

	// Put message in textarea
	jQuery("textarea:first").focus();

	switch (CHECK_RECOGNITION_STATE) {
		case 0:
			// Is there already existing text?
			CN_EXIST_TEXT = "Listening";
			jQuery("textarea").val(CN_EXIST_TEXT);
			CHECK_RECOGNITION_STATE++;
			break;
		case 1:
			break;
		case 2:
			break;
		case 3:
			CHECK_RECOGNITION_INTERVAL_CNT = 0;
			CHECK_RECOGNITION_STATE = -1;
			clearInterval(CHECK_RECOGNITION_INTERVAL_ID);
			break;
	}

	// show listening state
	CHECK_RECOGNITION_INTERVAL_CNT++;
	if (CHECK_RECOGNITION_INTERVAL_CNT % 5 == 0 && CHECK_RECOGNITION_STATE != 3) {
		if (CHECK_LISTEN_DOT == ' .' ) {
			CHECK_LISTEN_DOT = ' ..';
		} else if (CHECK_LISTEN_DOT == ' ..' ) {
			CHECK_LISTEN_DOT = ' ...';
		} else {	
			CHECK_LISTEN_DOT = ' .';
		}
		jQuery("textarea").val(CN_EXIST_TEXT + CHECK_LISTEN_DOT);
	}

}

//0-send, 1-cancel
function CN_HoldToTalkHandle(sendOrCancel) {
	// $(this).css("display", "none");
	// $(".CNToggle[data-cn=sayfinish]").css("display", "");
	// console.log("CN_HoldToTalkButtonKeyUp");

	jQuery("#CancelButton").hide()
	jQuery("#EditButton").hide()
	jQuery("#HoldToTalkButton").text("Hold to Talk");

	CN_MOUSE_CLICK = 1;

	// Click button
	if (sendOrCancel == 0) {
		if (CN_EXIST_TEXT != "") {
			jQuery("textarea").val(CN_EXIST_TEXT);
			jQuery("textarea").closest("div").find("button").click();
		}
	}

	// Stop speech recognition until the answer is received
	if (CN_SPEECHREC) {
		clearTimeout(CN_TIMEOUT_KEEP_SPEECHREC_WORKING);
		CN_SPEECHREC.stop();
	}

	CHECK_RECOGNITION_STATE = 3;

	// Disable speech rec
	CN_SPEECHREC_DISABLED = true;
	if (CN_SPEECHREC && CN_IS_LISTENING) CN_SPEECHREC.stop();
}


function showToastMessage(message) {
	var toastMessage = $("#toast-message");
	toastMessage.text(message);
	toastMessage.fadeIn().delay(1000).fadeOut();
  }

function sendRecordText() {
	if (CHECK_RECOGNITION_STATE == 1) {
		CN_EXIST_TEXT = "";
		jQuery("textarea").val(CN_EXIST_TEXT);
		showToastMessage("You haven't spoken yet.");
	}
	CN_HoldToTalkHandle(0)
}

function recordToEdit() {
	// console.log("CN_EditlButtonMouseOver");
	if (CHECK_RECOGNITION_STATE == 1) {
		jQuery("textarea").val("");
		showToastMessage("You haven't spoken yet.");
	} else if (CHECK_RECOGNITION_STATE == 2) {
		showToastMessage("Edit your message now.");
		jQuery("textarea").val(CN_EXIST_TEXT);
	}
	CN_HoldToTalkHandle(1)
	recordButtonHandle(0);
}

document.addEventListener('mouseup', function(event) {
	// console.log("document mouseup");
	try {
		var RecordButton = document.getElementById('RecordButton');
		if (!RecordButton.contains(event.target)) {
			recordToEdit();
		}
	} catch (e) {
		console.log("document mouseup error: " + e);
	}

	// try {
	// 	var HoldToTalkButton = document.getElementById('HoldToTalkButton');
	// 	var EditButton = document.getElementById('EditButton');
	// 	var CancelButton = document.getElementById('CancelButton');

	// 	if (CancelButton.contains(event.target)) {
	// 		console.log("CN_CanceButtonMouseOver");
	// 		CN_HoldToTalkHandle(1)
	// 		jQuery("textarea").val("");
	// 	} else if (EditButton.contains(event.target)) {
	// 		console.log("CN_EditlButtonMouseOver");
	// 		if (CHECK_RECOGNITION_STATE == 1) {
	// 			jQuery("textarea").val("");
	// 			showToastMessage("You have not say anything yet.");
	// 		} else if (CHECK_RECOGNITION_STATE == 2) {
	// 			showToastMessage("You can edit your message now.");
	// 			jQuery("textarea").val(CN_EXIST_TEXT);
	// 		}
	// 		CN_HoldToTalkHandle(1)
	// 	} else if (HoldToTalkButton.contains(event.target)) {
	// 		if (CHECK_RECOGNITION_STATE == 1) {
	// 			CN_EXIST_TEXT = "";
	// 			jQuery("textarea").val(CN_EXIST_TEXT);
	// 			showToastMessage("You have not say anything yet.");
	// 		}
	// 		CN_HoldToTalkHandle(0)
	// 	} else if (CHECK_RECOGNITION_STATE != -1) {
	// 		console.log("mouse up outside to cancel");
	// 		CN_HoldToTalkHandle(1)
	// 		jQuery("textarea").val("");
	// 	}
	// } catch (error) {
	// 	console.log("error: " + error);
	// }
});



// function CN_HoldZoneMouseOut(event) {
// 	console.log("CN_HoldZoneMouseOut");
// 	if (jQuery("#HoldZone").has(event.relatedTarget).length == 0) {
// 		jQuery("textarea").val("");
// 		CN_HoldToTalkButtonKeyUp(1)
// 	}
// }

function speakStop() {
	// Stop current message (equivalent to 'skip')
	window.speechSynthesis.pause(); // Pause, and then...
	window.speechSynthesis.cancel(); // Cancel everything
	CN_CURRENT_MESSAGE = null; // Remove current message
	CN_IS_READING = false;
}

function speakOn() {
	$(this).css("display", "none");
	$(".CNToggle[data-cn=speakoff]").css("display", "");
	CN_SPEAKING_DISABLED = true;

	// Stop current message (equivalent to 'skip')
	window.speechSynthesis.pause(); // Pause, and then...
	window.speechSynthesis.cancel(); // Cancel everything
	CN_CURRENT_MESSAGE = null; // Remove current message
}

function speakOff() {
	$(this).css("display", "none");
	$(".CNToggle[data-cn=speakon]").css("display", "");
	CN_SPEAKING_DISABLED = false;
}

// Toggle button clicks: settings, pause, skip...
function CN_ToggleButtonClick() {
	var action = $(this).data("cn");
	switch (action) {

		// Open settings menu
		case "settings":
			CN_OnSettingsIconClick();
			return;

		// The microphone is on. Turn it off
		case "micon":
			// Show other icon and hide this one
			$(this).css("display", "none");
			$(".CNToggle[data-cn=micoff]").css("display", "");

			// Disable speech rec
			CN_SPEECHREC_DISABLED = true;
			if (CN_SPEECHREC && CN_IS_LISTENING) CN_SPEECHREC.stop();

			return;

		// The microphone is off. Turn it on
		case "micoff":
			// Show other icon and hide this one
			$(this).css("display", "none");
			$(".CNToggle[data-cn=micon]").css("display", "");

			// Enable speech rec
			CN_SPEECHREC_DISABLED = false;
			if (CN_SPEECHREC && !CN_IS_LISTENING && !CN_IS_READING) CN_SPEECHREC.start();

			return;

		// The bot's voice is on. Turn it off
		case "speakon":
			speakOn();
			return;

		// The bot's voice is off. Turn it on
		case "speakoff":
			speakOff();
			return;

		// Skip current message being read
		case "skip":
			window.speechSynthesis.pause(); // Pause, and then...
			window.speechSynthesis.cancel(); // Cancel everything
			CN_CURRENT_MESSAGE = null; // Remove current message

			// Restart listening maybe?
			CN_AfterSpeakOutLoudFinished();
			return;
	}
}

function SpeakTextBaseButtonClick() {
	console.log("SpeakTextBaseButtonClick");
}

// Start Talk-to-GPT (Start button)
function CN_StartTTGPT() {
	// CN_SayOutLoud("OK");
	CN_FINISHED = false;

	// Hide start button, show action buttons
	jQuery(".CNStartZone").hide();
	jQuery(".CNActionButtons").show();
	// jQuery(".TalkZone").show();

	setTimeout(function () {
		// Start speech rec
		CN_StartSpeechRecognition();

		// Check for new messages
		CN_CheckNewMessages(true);
	}, 1000);

	// Disable speech rec
	CN_SPEECHREC_DISABLED = true;
	if (CN_SPEECHREC && CN_IS_LISTENING) CN_SPEECHREC.stop();
}

document.addEventListener("keyup", function(event) {
	if (event.key === 'Escape') {
		if (RecordSendState == 1) {
			console.log("Escape");
			recordButtonHandle(0);
			CN_HoldToTalkHandle(1)
			jQuery("textarea").val("");
		}
	} else if (event.key === 'Space') {
		if (RecordSendState == 1) {
			recordButtonHandle(1);
		}
	}
});

document.addEventListener("keydown", function(event) {
	if (event.key === 'Space') {
		if (RecordSendState == 0) {
			recordButtonHandle(1);
		}
	}
});

//0: cancel, 1: handle
function recordButtonHandle(cancelOrHandleEvent) {
	const recordButton = document.querySelector('#RecordButton');
	recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
	if (cancelOrHandleEvent == 1) {
		if (RecordSendState == 0) {
			CN_HoldToTalkButtonKeyDown();
		} else {
			sendRecordText();
		}
		RecordSendState = 1 - RecordSendState;
	} else {
		RecordSendState = 0;
	}
	recordButton.innerHTML = RecordSendState == 0 ? recordButtonRecordSvg : recordButtonSendSvg;
	if (RecordSendState == 0) {
		if (cancelOrHandleEvent == 0) {
			recordButton.style.opacity = '0.2';
			recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
		} else {
			recordButton.style.opacity = '0.6';
			recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
		}
	} else {
		recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
	}
	
}

function recordButtonClick() {
	recordButtonHandle(1);
}

function itemsSpeakAndNavCheck() {	
	const nav = document.querySelector('nav');
	const voiceZone = document.querySelector('.VoiceZone');
	if (!nav && voiceZone.style.left != '0px') {
		voiceZone.style.left = '0px';
	} else if (nav && voiceZone.style.left != '260px') {
		voiceZone.style.left = '260px';
	}

	const openaiLogos = document.querySelectorAll('div.text-gray-400.flex.self-end');
	// console.log("openaiLogos length: " + openaiLogos.length);
	for (let i = 0; i < openaiLogos.length; i++) {
		const speakTextBaseButton = openaiLogos[i].querySelector('#SpeakTextBaseButton');
		if (speakTextBaseButton == null) {
			const speakDiv = document.createElement('div');
			speakDiv.innerHTML = "<button id='SpeakTextBaseButton' style='' class=> <svg width='20px' height='20px' version='1.1' id='Capa_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 314 314' style='enable-background:new 0 0 314 314;' xml:space='preserve'> <g> <path d='M156.02,50.16c-2.07-1.275-4.652-1.387-6.821-0.291l-101.92,51.363H16.815C7.543,101.232,0,108.775,0,118.045v77.912 c0,9.27,7.543,16.813,16.815,16.813h30.465l101.92,51.361c0.993,0.502,2.073,0.75,3.15,0.75c1.275,0,2.549-0.35,3.671-1.041 c2.069-1.273,3.329-3.529,3.329-5.959V56.121C159.35,53.691,158.09,51.434,156.02,50.16z M14,195.957v-77.912 c0-1.525,1.289-2.813,2.815-2.813h25.133v83.537H16.815C15.289,198.77,14,197.482,14,195.957z M145.35,246.514l-89.402-45.053 v-88.92l89.402-45.055V246.514z' fill='currentColor'/> <path  fill='currentColor' d='M204.018,124.686c-2.756,2.711-2.792,7.143-0.08,9.899c5.587,5.68,8.791,13.85,8.791,22.414 c0,8.568-3.204,16.738-8.791,22.416c-2.712,2.756-2.676,7.188,0.08,9.898c1.363,1.342,3.136,2.012,4.909,2.012 c1.81,0,3.62-0.699,4.989-2.092c8.143-8.275,12.813-20.023,12.813-32.234c0-12.209-4.67-23.957-12.813-32.232 C211.204,122.01,206.773,121.973,204.018,124.686z'/> <path  fill='currentColor' d='M241.011,107.881c-2.756,2.713-2.792,7.145-0.081,9.9c9.809,9.969,15.435,24.264,15.435,39.217 c0,14.957-5.626,29.252-15.435,39.223c-2.711,2.756-2.675,7.188,0.081,9.898c1.363,1.342,3.137,2.01,4.909,2.01 c1.811,0,3.62-0.697,4.99-2.09c12.363-12.566,19.454-30.441,19.454-49.041c0-18.596-7.091-36.469-19.454-49.035 C248.196,105.205,243.766,105.17,241.011,107.881z'/> <path  fill='currentColor'd='M287.903,91.156c-2.712-2.758-7.145-2.793-9.899-0.082c-2.756,2.713-2.792,7.145-0.081,9.9 c14.03,14.26,22.077,34.68,22.077,56.023c0,21.346-8.047,41.768-22.077,56.029c-2.711,2.756-2.675,7.188,0.081,9.898 c1.363,1.342,3.137,2.01,4.909,2.01c1.811,0,3.62-0.697,4.99-2.09C304.488,205.988,314,181.988,314,156.998 C314,132.012,304.488,108.014,287.903,91.156z'/> </g> </svg></button>" 
			openaiLogos[i].append(speakDiv);

			const speakTextBaseButton = speakDiv.querySelector('#SpeakTextBaseButton');
			speakTextBaseButton.addEventListener('mouseenter', () => {
				speakTextBaseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
				// speakTextBaseButton.style.opacity = '1';
			});
			speakTextBaseButton.addEventListener('mouseleave', () => {
				speakTextBaseButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
				if (RecordSendState == 0) {
					// speakTextBaseButton.style.opacity = '0.8';
				}
			});

			//SpeakTextBaseButton class
			const speakUserClass = "p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400 md:invisible md:group-hover:visible";
			const speakResponseClass = "p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400";
			const textRespose = $(speakTextBaseButton).closest('.group').find('.prose p').text().trim();;
			speakTextBaseButton.className = (textRespose == "") ? speakUserClass : speakResponseClass;
			
			//SpeakTextBaseButton onclick
			speakTextBaseButton.addEventListener('click', function() {
				console.log("SpeakTextBaseButton clicked");
				this.style.outline = 'none';
				this.style.border = 'none';
				this.style.opacity = '1';
				// get the element containing the text
				const textRespose = $(this).closest('.group').find('.prose p').text().trim();
				const textUser = $(this).closest('.group').find('.min-h-\\[20px\\]').text().trim();
				text = textUser == "" ? textRespose : textUser;
				console.log(text);
				sayItem(text);
			});
		}
	 }
}

// Perform initialization after jQuery is loaded
function CN_InitScript() {
	if (typeof $ === null || typeof $ === undefined) $ = jQuery;

	var warning = "";
	if ('webkitSpeechRecognition' in window) {
		console.log("Speech recognition API supported");
		CN_SPEECH_REC_SUPPORTED = true;
	} else {
		console.log("speech recognition API not supported.");
		CN_SPEECH_REC_SUPPORTED = false;
		warning = "\n\nWARNING: speech recognition (speech-to-text) is only available in Google Chrome desktop version at the moment. If you are using another browser, you will not be able to dictate text, but you can still listen to the bot's responses.";
	}

	// Restore settings
	CN_RestoreSettings();

	// Wait on voices to be loaded before fetching list
	window.speechSynthesis.onvoiceschanged = function () {
		if (!CN_WANTED_VOICE_NAME) {
			console.log("Reading with default browser voice");
		} else {
			speechSynthesis.getVoices().forEach(function (voice) {
				//console.log("Found possible voice: " + voice.name + " (" + voice.lang + ")");
				if (voice.lang + "-" + voice.name == CN_WANTED_VOICE_NAME) {
					CN_WANTED_VOICE = voice;
					console.log("I will read using voice " + voice.name + " (" + voice.lang + ")");
					return false;
				}
			});
			if (!CN_WANTED_VOICE)
				console.log("No voice found for '" + CN_WANTED_VOICE_NAME + "', reading with default browser voice");
		}

		// Voice OK
		setTimeout(function () {
			//CN_SayOutLoud("OK");
		}, 1000);
	};

	// Add icons on the top right corner
	jQuery("body").append("<span class = 'VoiceZone' style='position: fixed; fixed; bottom: 119px;; left: 260px; width: 30px;  font-size: 14px; text-align: center; z-index: 1111;   border: 0px; outline: none;' >" +
		"<button style='padding: 4px; margin: 6px 3px 3px 3px; background: rgba(0, 0, 0, 0); opacity: 0.2; border-radius: 4px;' id='SettingButton'> " +
		"<svg stroke='currentColor' stroke-width='1.3'  width='22px' height='22px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C17.93 1.25 22.75 6.07 22.75 12C22.75 17.93 17.93 22.75 12 22.75ZM12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 6.9 17.1 2.75 12 2.75Z' fill='#000000'/><path d='M12 13C11.44 13 11 12.55 11 12C11 11.45 11.45 11 12 11C12.55 11 13 11.45 13 12C13 12.55 12.56 13 12 13Z' fill='#000000'/><path d='M16 13C15.44 13 15 12.55 15 12C15 11.45 15.45 11 16 11C16.55 11 17 11.45 17 12C17 12.55 16.56 13 16 13Z' fill='#000000'/><path d='M8 13C7.44 13 7 12.55 7 12C7 11.45 7.45 11 8 11C8.55 11 9 11.45 9 12C9 12.55 8.56 13 8 13Z' fill='#000000'/></svg>" +
		// "<svg stroke='currentColor' stroke-width='1.3' viewBox='0 0 24 24' height='22px' width='22px'  fill='none' xmlns='http://www.w3.org/2000/svg'> <path fill-rule='evenodd' clip-rule='evenodd' d='M2.44044 10.2841L5.74755 4.28409C6.35499 3.18202 7.49767 2.5 8.73669 2.5H15.2633C16.5023 2.5 17.645 3.18202 18.2525 4.28409L21.5596 10.2841C22.1468 11.3495 22.1468 12.6505 21.5596 13.7159L18.2525 19.7159C17.645 20.818 16.5023 21.5 15.2633 21.5H8.73669C7.49767 21.5 6.35499 20.818 5.74755 19.7159L2.44044 13.7159C1.85319 12.6505 1.85319 11.3495 2.44044 10.2841ZM3.72151 11.0195L7.02861 5.01948C7.37572 4.38972 8.02868 4 8.73669 4H15.2633C15.9713 4 16.6243 4.38972 16.9714 5.01948L20.2785 11.0195C20.6141 11.6283 20.6141 12.3717 20.2785 12.9805L16.9714 18.9805C16.6243 19.6103 15.9713 20 15.2633 20H8.73669C8.02868 20 7.37572 19.6103 7.02861 18.9805L3.72151 12.9805C3.38593 12.3717 3.38593 11.6283 3.72151 11.0195Z' fill='#030D45'/> <path fill-rule='evenodd' clip-rule='evenodd' d='M12 9.75C10.7824 9.75 9.79526 10.7574 9.79526 12C9.79526 13.2426 10.7824 14.25 12 14.25C13.2176 14.25 14.2047 13.2426 14.2047 12C14.2047 10.7574 13.2176 9.75 12 9.75ZM8.32544 12C8.32544 9.92893 9.9706 8.25 12 8.25C14.0294 8.25 15.6746 9.92893 15.6746 12C15.6746 14.0711 14.0294 15.75 12 15.75C9.9706 15.75 8.32544 14.0711 8.32544 12Z' fill='#030D45'/> </svg>" +
		"</button>" +
		"<button style='padding: 4px; margin: 3px; background: rgba(0, 0, 0, 0); opacity: 0.2;  border-radius: 4px;' id='RecordButton'></button> " +
		"<div id='toast-message' style='display: none; position: fixed; opacity: 1; bottom: 20px; left: 40%; transform: translateX(-50%); padding: 10px; background-color: #333; color: #fff; border-radius: 5px; z-index: 9999;'></div>" +
		// " <a href='https://github.com/C-Nedelcu/talk-to-chatgpt' target=_blank title='Visit project website'>Talk-to-ChatGPT v1.6.1</a><br />" +
		// "<span style='font-size: 16px;' class='CNStartZone'>" +
		// "<button style='border: 1px solid #CCC; padding: 4px; margin: 6px; background: #FFF; border-radius: 4px; color:black;' id='CNStartButton'>▶️ START</button>" +
		// "</span>" +
		// "<span style='font-size: 20px; display:none;' class='CNActionButtons'>" +
		// // "<span class='CNToggle' title='Voice recognition enabled. Click to disable' data-cn='micon'>🎙️ </span>  " + // Microphone enabled
		// // "<span class='CNToggle' title='Voice recognition disabled. Click to enable' style='display:none;' data-cn='micoff'>🤫 </span>  " + // Microphone disabled
		// "<span class='CNToggle' title='Text-to-speech (bot voice) disabled. Click to enable' style='display:none;' data-cn='speakoff'>🔇 </span>  " + // Mute
		// // "<span class='CNToggle' title='Skip the message currently being read by the bot.' data-cn='skip'>⏩ </span>  " + // Skip
		// "<span class='CNToggle' title='Open settings menu to change bot voice, language, and other settings' data-cn='settings'>⚙️</span> " + // Settings
		// // "<span class='CNToggle' title='Voice recognition enabled. Click to disable' style='display:none;' data-cn='saystart'>🎙️ </span>  " + // Microphone enabled
		// // "<span class='CNToggle' title='Voice recognition disabled. Click to enable' data-cn='sayfinish'>🤫 </span>  " + // Microphone disabled
		// "</span><br />" +
		// "<span style='font-size: 16px;' class='TalkZone'>" +
		// 	"<button style='border: 1px solid #CCC; padding: 4px; margin: 6px; background: #FFF; border-radius: 4px; color:black;' id='HoldToTalkButton'> Hold To Talk </button>"+
		// "</span>"+
		// "<br />"+
		// "<span style='font-size: 16px;' class='TalkZone1'>" +
		// 	"<button id='HoldToTalkButton1' style='border: 1px solid #CCC; padding: 4px; margin: 6px; background: #FFF; border-radius: 4px; color:black;'>Hold to talk</button>"+
		// 	"<br />"+
		// 	"<button id='CancelButton1' style='display: none; border: 1px solid #CCC; padding: 4px; margin: 6px; background: #FFF; border-radius: 4px; color:black; width: 80px;'>Cancel</button>"+
		// 	"<button id='EditButton1' style='display: none; border: 1px solid #CCC; padding: 4px; margin: 6px; background: #FFF; border-radius: 4px; color:black; width: 80px;'>Edit</button>"+
		// 	"<br />"+
		// 	"<textarea id='Content1' style='display: none; height: 150px; width: 280px; color: black;'  placeholder='Listening1'></textarea>"+
		// 	// "<div id='CancelButton1' >Cancel</div>"+
		// 	// "<textarea id='Content1' ></textarea>"+
		// "</span>"+
		"</span>");

	
	const recordButton = document.querySelector('#RecordButton');
	recordButton.innerHTML = recordButtonRecordSvg;
	recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0);';
	recordButton.addEventListener('mouseenter', () => {
		recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
		recordButton.style.opacity = '0.6';
	});
	recordButton.addEventListener('mouseleave', () => {
		recordButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
		if (RecordSendState == 0) {
			recordButton.style.opacity = '0.2';
		}
	});
	recordButton.addEventListener('focus', () => {
		recordButton.style.outline = 'none';
		recordButton.style.border = 'none';
	  });
	recordButton.addEventListener('click', () => {
		recordButtonClick();
	});

	const settingButton = document.querySelector('#SettingButton');
	settingButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
	settingButton.addEventListener('mouseenter', () => {
		settingButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
		settingButton.style.opacity = '0.6';
	});
	settingButton.addEventListener('mouseleave', () => {
		settingButton.style.backgroundColor = 'rgba(0, 0, 0, 0)';
		settingButton.style.opacity = '0.2';
	});
	settingButton.addEventListener('focus', () => {
		settingButton.style.outline = 'none';
		settingButton.style.border = 'none';
	});
	// settingButton.addEventListener('click', () => {
	// 	CN_OnSettingsIconClick()
	// });

	// jQuery("textarea").on('click', () => {
	// 	console.log("textarea clicked");
	// 	if (RecordSendState == 1) {
	// 		recordButtonClick();
	// 	}
	// });
	
	setInterval(itemsSpeakAndNavCheck, 500); // calls myFunction every 1 second (1000 milliseconds)


	//menu
	const menu = document.createElement("div");
	menu.classList.add("menu");
	menu.innerHTML = `
		<ul style="list-style: none;  padding: 0; margin: 0;  border: 1px solid #CCC;  border-radius: 4px; width: 130px; color:black; user-select: none;">
		<li data-option="Setting" style="padding: 10px; background-color: #eee; border-bottom: 1px solid #ccc; cursor: pointer;">Setting</li>
		<li data-option="StopSpeaking" style="padding: 10px; background-color: #eee; border-bottom: 1px solid #ccc; cursor: pointer;">Stop Speaking</li>
		</ul>
	`;
	menu.style.display = "none";
	settingButton.addEventListener("click", (event) => {
		event.stopPropagation();
		if (menu.style.display === "none") {
			menu.style.display = "block";
		} else {
			menu.style.display = "none";
		}
	});
	// document.body.appendChild(button);
	const voiceZone = document.querySelector('.VoiceZone');
	// voiceZone.appendChild(menu);
	voiceZone.insertBefore(menu, settingButton);
	menu.addEventListener("click", (event) => {
		const option = event.target.dataset.option;
		if (option) {
			switch (option) {
				case "Setting":
					CN_OnSettingsIconClick();
					break;
				case "StopSpeaking":
					console.log("CN_IS_READING="+CN_IS_READING);
					if (!CN_IS_READING) {
						showToastMessage("Not speaking");
					} else {
						speakStop();
					}
					break;
			}				
			menu.style.display = "none";
		}
	});
	document.addEventListener("click", () => {
		menu.style.display = "none";
	});
		

	setTimeout(function () {
		// // create element
		// const targetDiv = document.querySelector('div.flex.ml-1.md\\:w-full.md\\:m-auto.md\\:mb-2.gap-0.md\\:gap-2.justify-center');
		// const newDiv = document.createElement('div');
		// newDiv.innerHTML = "" +
		// 	"<div style='font-size: 16px; text-align: center; justify-content: center; margin-top: 10px;' id='HoldZone'>" +
		// 		"<div id='toast-message' style='display: none; position: fixed; bottom: 20px; left: 40%; transform: translateX(-50%); padding: 10px; background-color: #333; color: #fff; border-radius: 5px; z-index: 9999;'></div>" +

		// 		"<div style=' display: inline-block; width: 230px; '>" +  
		// 			// "<span class='CNToggle' title='Voice to ChatGPT' style='padding-right: 10px; user-select: none;' data-cn='extension-name''>Voice-to-ChatGPT</span>" +
		// 			"<span class='CNToggle' title='Text-to-speech (bot voice) enabled. Click to disable. This will skip the current message entirely.' style=' padding-right: 5px;  font-size: 20px; user-select: none;' data-cn='speakon'>🔊</span>  " + // Speak out loud
		// 			"<span class='CNToggle' title='Text-to-speech (bot voice) disabled. Click to enable' style='display:none; padding-right: 5px;  font-size: 20px; user-select: none;' data-cn='speakoff'>🔇</span>  " + // Mute
		// 			"<span class='CNToggle' title='Open settings menu to change bot voice, language, and other settings'  style='padding-right: 5px;  font-size: 20px; user-select: none;' data-cn='settings'>⚙️</span> " + // Settings	

		// 			"<span class='CNToggle' title='Voice recognition enabled. Click to disable'  style='padding-right: 5px;  font-size: 20px; user-select: none;' data-cn='saystop'>🛑</span>  " + // Microphone enabled
		// 			"<span class='CNToggle' title='Voice recognition enabled. Click to disable'  style='padding-right: 5px;  font-size: 20px; user-select: none;' data-cn='saystart'>🎙️</span>  " + // Microphone enabled

		// 		"</div>" +

		// 		// "<div style=' display: inline-block; '>" +  
		// 		// 	"<button id='CancelButton' style='display: none; border: 1px solid #CCC; padding: 4px; background: #FFF; border-radius: 4px; color:black; width: 160px;'>Move here to Cancel</button>" +
		// 		// 	"<button id='HoldToTalkButton' style='border: 1px solid #CCC; padding: 6px;  margin-left: 5px; margin-right: 5px; background: #FFF; border-radius: 4px; color:black; width: 150px;'>Hold to talk</button>" +
		// 		// 	"<button id='EditButton' style='display: none; border: 1px solid #CCC; padding: 2px;  background: #FFF; border-radius: 4px; color:black; width: 160px;'>Move here to Edit</button>" +
		// 		// "</div>" +
		// 	"</div>";
		// targetDiv.append(newDiv);





		// Try and get voices
		speechSynthesis.getVoices();

		// Make icons clickable
		jQuery(".CNToggle").css("cursor", "pointer");
		jQuery(".CNToggle").on("click", CN_ToggleButtonClick);
		jQuery(".CNToggle").on("mousedown", CN_ToggleButtonKeyDown);
		jQuery(".CNToggle").on("mouseup", CN_ToggleButtonKeyUp);
		jQuery("#CNStartButton").on("click", CN_StartTTGPT);

		jQuery("#HoldToTalkButton").on("mousedown", CN_HoldToTalkButtonKeyDown);

		jQuery(".SpeakTextBaseButton").on("click", SpeakTextBaseButtonClick);

		// jQuery("#HoldToTalkButton").on("mouseup", CN_HoldToTalkButtonKeyUp);
		// jQuery("#HoldToTalkButton").on("mouseout", CN_HoldButtonMouseOut);

		// jQuery("#CancelButton").on("mouseover", CN_CancelButtonMouseOver);
		// jQuery("#EditButton").on("mouseover", CN_EditButtonMouseOver);
		
		// jQuery("#HoldZone").on("mouseout", CN_HoldZoneMouseOut);

	}, 500);

	CN_StartTTGPT();

}





// Open settings menu
function CN_OnSettingsIconClick() {
	console.log("Opening settings menu");
	console.log("CN_SPEAKING_DISABLED: " + CN_SPEAKING_DISABLED);

	// Stop listening
	CN_PAUSED = true;
	if (CN_SPEECHREC) CN_SPEECHREC.stop();

	// Prepare settings row
	var rows = "";

	// 1. Bot's voice
	var voices = "";
	var n = 0;
	speechSynthesis.getVoices().forEach(function (voice) {
		var label = `${voice.name} (${voice.lang})`;
		if (voice.default) label += ' — DEFAULT';
		var SEL = (CN_WANTED_VOICE && CN_WANTED_VOICE.lang == voice.lang && CN_WANTED_VOICE.name == voice.name) ? "selected=selected" : "";
		voices += "<option value='" + n + "' " + SEL + ">" + label + "</option>";
		n++;
	});
	rows += "<tr><td>AI voice and language:</td><td><select id='TTGPTVoice' style='width: 300px; color: black; border-radius: 4px; '>" + voices + "</select></td></tr>";

	rows += "<tr><td>Auto speak new responses:</td><td><input  type='checkbox' id='TextToSpeeh' style='padding: 10px; color: black; border:2px solid white; border-radius: 4px; '></input></td></tr>";

	// 2. AI talking speed
	rows += "<tr><td>AI talking speed (speech rate):</td><td><input type=number step='.1' id='TTGPTRate' style='color: black; width: 100px; border-radius: 4px; ' value='" + CN_TEXT_TO_SPEECH_RATE + "' /></td></tr>";

	// 3. AI voice pitch
	rows += "<tr><td>AI voice pitch:</td><td><input type=number step='.1' id='TTGPTPitch' style='width: 100px; color: black; border-radius: 4px; ' value='" + CN_TEXT_TO_SPEECH_PITCH + "' /></td></tr>";

	// 4. Speech recognition language CN_WANTED_LANGUAGE_SPEECH_REC
	var languages = "<option value=''></option>";
	// Iterate over all languages
	for (var i in CN_SPEECHREC_LANGS) {
		var languageName = CN_SPEECHREC_LANGS[i][0];
		// Iterate over all language codes
		for (var j in CN_SPEECHREC_LANGS[i]) {
			if (j == 0) continue;
			var languageCode = CN_SPEECHREC_LANGS[i][j][0];
			var isSelected = languageCode == CN_WANTED_LANGUAGE_SPEECH_REC;
			var selectionString = isSelected ? "selected='selected'" : "";
			languages += "<option value='" + languageCode + "' " + selectionString + ">" + languageName + " - " + languageCode + "</option>";
		}
	}
	rows += "<tr><td>Speech recognition language:</td><td><select id='TTGPTRecLang' style='width: 300px; color: black; border-radius: 4px; ' >" + languages + "</select></td></tr>";

	// 5. 'Stop' word
	// rows += "<tr><td>'Stop' word:</td><td><input type=text id='TTGPTStopWord' style='width: 100px; color: black;' value='"+CN_SAY_THIS_WORD_TO_STOP+"' /></td></tr>";

	// 6. 'Pause' word
	// rows += "<tr><td>'Pause' word:</td><td><input type=text id='TTGPTPauseWord' style='width: 100px; color: black;' value='"+CN_SAY_THIS_WORD_TO_PAUSE+"' /></td></tr>";

	// 7. Autosend
	// rows += "<tr><td>Automatic send:</td><td><input type=checkbox id='TTGPTAutosend' "+(CN_AUTO_SEND_AFTER_SPEAKING?"checked=checked":"")+" /> <label for='TTGPTAutosend'>Automatically send message to ChatGPT after speaking</label></td></tr>";

	// 8. Manual send word
	// rows += "<tr><td>Manual send word(s):</td><td><input type=text id='TTGPTSendWord' style='width: 300px; color: black;' value='"+CN_SAY_THIS_TO_SEND+"' /> If 'automatic send' is disabled, you can trigger the sending of the message by saying this word (or sequence of words)</td></tr>";

	// Prepare save/close buttons
	var closeRow = "<tr><td colspan=2 style='text-align: center'><br /><button id='TTGPTSave' style='border: 1px solid #CCC; padding: 4px; background: #FFF; border-radius: 4px; color:black; width: 80px;'>Save</button>&nbsp;<button id='TTGPTCancel' style='margin-left: 20px; border: 1px solid #CCC; padding: 4px; margin-left: 100px; background: #FFF; border-radius: 4px; color:black; width: 80px;'>Cancel</button></td></tr>";

	// Prepare settings table
	var table = "<table cellpadding=6 cellspacing=0 style='margin: 30px; font-size:20px; color: white; justify-content: center; align-items: center; display: flex;'>" + rows + closeRow + "</table>";

	// A short text at the beginning
	var desc = "<div style='margin: 8px;'><b>Enjoy chatting with ChatGPT using your voice. </b>  <br /> <div style='color: gray;'> <br /> Please note: Voice-to-ChatGPT is inspired by <a href='https://chrome.google.com/webstore/detail/talk-to-chatgpt/hodadfhfagpiemkeoliaelelfbboamlk'>Talk-to-ChatGPT</a> and most souce code come from Talk-to-ChatGPT, thanks to Talk-to-ChatGPT. <br />" + 
		"some the voices and speech recognition languages do not appear to work. If the one you select doesn't work, try reloading the page. <br />" +
		"If it still doesn't work after reloading the page, please try selecting another voice or language. <br />" +
		"Also, sometimes the text-to-speech API takes time to kick in, give it a few seconds to hear the bot speak.<br />" + 
		" <div >" +
		"</div>";
	
	var support = "" +
		" <div style='margin-top: 150px; color: white;'>" +
		"<span style='justify-content: center; align-items: center; display: flex;'><b>If you discover this extension's worth, kindly support me in glee, Through your generous assistance, I'll refine its capabilities, just wait and see.</b></span><br />" +
		"<div style='margin-top: 10px; justify-content: center; align-items: center; display: flex; '> <a href='https://www.buymeacoffee.com/baoblackcoal' target='_blank'><img src='https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png' alt='Buy Me A Coffee' style='height: 60px !important;width: 217px !important;' ></a>" +
		"</div>";

	// Open a whole screenful of settings
	jQuery("body").append("<div style='background: rgba(0,0,0,0.8); position: absolute; top: 0; right: 0; left: 0; bottom: 0; z-index: 999999; padding: 20px; color: white; font-size: 14px;  justify-content: center; align-items: center; display: flex;' id='TTGPTSettingsArea'><div style='margin: 8px; width: 1000px'><h1>⚙️ Voice-to-ChatGPT settings</h1>" + desc + table + support + "</div></div>");

	var checkBox = document.getElementById("TextToSpeeh");
	checkBox.checked = !CN_SPEAKING_DISABLED;

	// Assign events
	setTimeout(function () {
		jQuery("#TTGPTSave").on("click", CN_SaveSettings);
		jQuery("#TTGPTCancel").on("click", CN_CloseSettingsDialog);
	}, 100);
}

// Save settings and close dialog box
function CN_SaveSettings() {

	// Save settings
	try {
		// AI voice settings: voice/language, rate, pitch
		var wantedVoiceIndex = jQuery("#TTGPTVoice").val();
		var allVoices = speechSynthesis.getVoices();
		CN_WANTED_VOICE = allVoices[wantedVoiceIndex];
		CN_WANTED_VOICE_NAME = CN_WANTED_VOICE.lang + "-" + CN_WANTED_VOICE.name;

		var checkBox = document.getElementById("TextToSpeeh");
		CN_SPEAKING_DISABLED = !(checkBox.checked);
		if (CN_SPEAKING_DISABLED) 
			speakStop();

		CN_TEXT_TO_SPEECH_RATE = Number(jQuery("#TTGPTRate").val());
		CN_TEXT_TO_SPEECH_PITCH = Number(jQuery("#TTGPTPitch").val());

		// Speech recognition settings: language, stop, pause
		CN_WANTED_LANGUAGE_SPEECH_REC = jQuery("#TTGPTRecLang").val();
		CN_SAY_THIS_WORD_TO_STOP = jQuery("#TTGPTStopWord").val();
		CN_SAY_THIS_WORD_TO_PAUSE = jQuery("#TTGPTPauseWord").val();
		CN_AUTO_SEND_AFTER_SPEAKING = jQuery("#TTGPTAutosend").prop("checked");
		CN_SAY_THIS_TO_SEND = jQuery("#TTGPTSendWord").val();

		// Apply language to speech recognition instance
		if (CN_SPEECHREC) CN_SPEECHREC.lang = CN_WANTED_LANGUAGE_SPEECH_REC;

		// Save settings in cookie
		var settings = [
			CN_WANTED_VOICE_NAME,
			CN_SPEAKING_DISABLED,
			CN_TEXT_TO_SPEECH_RATE,
			CN_TEXT_TO_SPEECH_PITCH,
			CN_WANTED_LANGUAGE_SPEECH_REC,
			CN_SAY_THIS_WORD_TO_STOP,
			CN_SAY_THIS_WORD_TO_PAUSE,
			CN_AUTO_SEND_AFTER_SPEAKING ? 1 : 0,
			CN_SAY_THIS_TO_SEND
		];
		CN_SetCookie("CN_TTGPT", JSON.stringify(settings));
	} catch (e) { alert('Invalid settings values'); return; }

	// Close dialog
	console.log("Closing settings dialog");
	jQuery("#TTGPTSettingsArea").remove();

	// Resume listening
	CN_PAUSED = false;
}

// Restore settings from cookie
function CN_RestoreSettings() {
	var settingsRaw = CN_GetCookie("CN_TTGPT");
	try {
		var settings = JSON.parse(settingsRaw);
		if (typeof settings == "object" && settings != null) {
			console.log("Reloading settings from cookie: " + settings);
			CN_WANTED_VOICE_NAME = settings[0];
			CN_SPEAKING_DISABLED = settings[1];
			CN_TEXT_TO_SPEECH_RATE = settings[2];
			CN_TEXT_TO_SPEECH_PITCH = settings[3];
			CN_WANTED_LANGUAGE_SPEECH_REC = settings[4];
			CN_SAY_THIS_WORD_TO_STOP = settings[5];
			CN_SAY_THIS_WORD_TO_PAUSE = settings[6];
			if (settings.hasOwnProperty(7)) CN_AUTO_SEND_AFTER_SPEAKING = settings[6] == 1;
			if (settings.hasOwnProperty(8)) CN_SAY_THIS_TO_SEND = settings[7];
		}
	} catch (ex) {
		console.error(ex);
	}
}

// Close dialog: remove area altogether
function CN_CloseSettingsDialog() {
	console.log("Closing settings dialog");
	jQuery("#TTGPTSettingsArea").remove();

	// Resume listening
	CN_PAUSED = false;
}

// Sets a cookie
function CN_SetCookie(name, value) {
	var days = 365;
	var date = new Date();
	date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	var expires = "; expires=" + date.toGMTString();
	document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
}

// Reads a cookie
function CN_GetCookie(name) {
	var nameEQ = encodeURIComponent(name) + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) === ' ')
			c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0)
			return decodeURIComponent(c.substring(nameEQ.length, c.length));
	}
	return null;
}

// MAIN ENTRY POINT
// Load jQuery, then run initialization function
(function () {

	setTimeout(function () {
		typeof jQuery == "undefined" ?
			alert("[Voice-to-ChatGPT] Sorry, but jQuery was not able to load. The script cannot run. Try using Google Chrome on Windows 11") :
			CN_InitScript();
	}, 500);

})();

// List of languages for speech recognition - Pulled from https://www.google.com/intl/en/chrome/demos/speech.html
var CN_SPEECHREC_LANGS =
	[['Afrikaans', ['af-ZA']],
	['አማርኛ', ['am-ET']],
	['Azərbaycanca', ['az-AZ']],
	['বাংলা', ['bn-BD', 'বাংলাদেশ'],
		['bn-IN', 'ভারত']],
	['Bahasa Indonesia', ['id-ID']],
	['Bahasa Melayu', ['ms-MY']],
	['Català', ['ca-ES']],
	['Čeština', ['cs-CZ']],
	['Dansk', ['da-DK']],
	['Deutsch', ['de-DE']],
	['English', ['en-AU', 'Australia'],
		['en-CA', 'Canada'],
		['en-IN', 'India'],
		['en-KE', 'Kenya'],
		['en-TZ', 'Tanzania'],
		['en-GH', 'Ghana'],
		['en-NZ', 'New Zealand'],
		['en-NG', 'Nigeria'],
		['en-ZA', 'South Africa'],
		['en-PH', 'Philippines'],
		['en-GB', 'United Kingdom'],
		['en-US', 'United States']],
	['Español', ['es-AR', 'Argentina'],
		['es-BO', 'Bolivia'],
		['es-CL', 'Chile'],
		['es-CO', 'Colombia'],
		['es-CR', 'Costa Rica'],
		['es-EC', 'Ecuador'],
		['es-SV', 'El Salvador'],
		['es-ES', 'España'],
		['es-US', 'Estados Unidos'],
		['es-GT', 'Guatemala'],
		['es-HN', 'Honduras'],
		['es-MX', 'México'],
		['es-NI', 'Nicaragua'],
		['es-PA', 'Panamá'],
		['es-PY', 'Paraguay'],
		['es-PE', 'Perú'],
		['es-PR', 'Puerto Rico'],
		['es-DO', 'República Dominicana'],
		['es-UY', 'Uruguay'],
		['es-VE', 'Venezuela']],
	['Euskara', ['eu-ES']],
	['Filipino', ['fil-PH']],
	['Français', ['fr-FR']],
	['Basa Jawa', ['jv-ID']],
	['Galego', ['gl-ES']],
	['ગુજરાતી', ['gu-IN']],
	['Hrvatski', ['hr-HR']],
	['IsiZulu', ['zu-ZA']],
	['Íslenska', ['is-IS']],
	['Italiano', ['it-IT', 'Italia'],
		['it-CH', 'Svizzera']],
	['ಕನ್ನಡ', ['kn-IN']],
	['ភាសាខ្មែរ', ['km-KH']],
	['Latviešu', ['lv-LV']],
	['Lietuvių', ['lt-LT']],
	['മലയാളം', ['ml-IN']],
	['मराठी', ['mr-IN']],
	['Magyar', ['hu-HU']],
	['ລາວ', ['lo-LA']],
	['Nederlands', ['nl-NL']],
	['नेपाली भाषा', ['ne-NP']],
	['Norsk bokmål', ['nb-NO']],
	['Polski', ['pl-PL']],
	['Português', ['pt-BR', 'Brasil'],
		['pt-PT', 'Portugal']],
	['Română', ['ro-RO']],
	['සිංහල', ['si-LK']],
	['Slovenščina', ['sl-SI']],
	['Basa Sunda', ['su-ID']],
	['Slovenčina', ['sk-SK']],
	['Suomi', ['fi-FI']],
	['Svenska', ['sv-SE']],
	['Kiswahili', ['sw-TZ', 'Tanzania'],
		['sw-KE', 'Kenya']],
	['ქართული', ['ka-GE']],
	['Հայերեն', ['hy-AM']],
	['தமிழ்', ['ta-IN', 'இந்தியா'],
		['ta-SG', 'சிங்கப்பூர்'],
		['ta-LK', 'இலங்கை'],
		['ta-MY', 'மலேசியா']],
	['తెలుగు', ['te-IN']],
	['Tiếng Việt', ['vi-VN']],
	['Türkçe', ['tr-TR']],
	['اُردُو', ['ur-PK', 'پاکستان'],
		['ur-IN', 'بھارت']],
	['Ελληνικά', ['el-GR']],
	['български', ['bg-BG']],
	['Pусский', ['ru-RU']],
	['Српски', ['sr-RS']],
	['Українська', ['uk-UA']],
	['한국어', ['ko-KR']],
	['中文', ['cmn-Hans-CN', '普通话 (中国大陆)'],
		['cmn-Hans-HK', '普通话 (香港)'],
		['cmn-Hant-TW', '中文 (台灣)'],
		['yue-Hant-HK', '粵語 (香港)']],
	['日本語', ['ja-JP']],
	['हिन्दी', ['hi-IN']],
	['ภาษาไทย', ['th-TH']]];
