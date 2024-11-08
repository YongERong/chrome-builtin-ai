var isListening = false;
var recognition;

// Text to Speech
document.getElementById("tts-button").addEventListener("click", () => {
    let value = document.getElementById("prompt-input").value;
    chrome.tts.speak(value);
});

// Speech to Text
document.getElementById("stt-button").addEventListener("click", () => {
    isListening = !isListening;

    if (isListening) {
        // TODO prompt user for microphone access if not given. not sure why cannot.
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                // Microphone permission granted, proceed with recognition
                startListening();
            })
            .catch((error) => {
                alert("Please enable microphone access in your browser settings to use this feature.");
                // Permission denied, inform the user
                console.error("Microphone access denied:", error);
            });
    } else {
        // End STT
        // Stop the speech recognition
        stopListening();
        console.log("recongtion.stop");
    }
});

// Clear button
document.getElementById("clear-input").addEventListener("click", () => {
    document.getElementById("prompt-input").value = "";
});


function startListening() {
    document.getElementById("stt-button").innerHTML = "Click to Stop Speaking";
    document.getElementById("prompt-input").placeholder = "Listening...";
    document.getElementById("prompt-input").value = "";

    document.getElementById("search-results").innerHTML = "Listening...";

    if (!recognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = true;  // Allows you to get partial results
    recognition.lang = 'en-US';  // Set the language (optional)

    if (isListening) {
        stopListening();
    }

    recognition.onresult = (e) => {
        let interim = "";
        let final = "";

        const error = e.results === undefined || (typeof e.results) === "undefined";
        if (error) {
            recognition.onend = null;
            recognition.stop();
            console.log(error.code)
            console.error(error);
            return;
        }

        for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
                final += e.results[i][0].transcript;
            } else {
                interim += e.results[i][0].transcript;
            }
        }

        if (interim) {
            document.getElementById("prompt-input").value = interim;
        } else if (final) {
            document.getElementById("prompt-input").value = final;
            searchWithPromptGiven(final)
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
        // // Automatically restart if listening mode is still active
        // if (isListening) recognition.start();
    };
    }

    recognition.start();
    isListening = true;
}

function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    isListening = false;

    document.getElementById("stt-button").innerHTML = "Click to Speak";
    document.getElementById("prompt-input").placeholder = "\"Click to Speak\" or type something...";
}

function searchWithPromptGiven(prompt) {
    stopListening();
    document.getElementById("search-results").innerHTML = prompt;
    chrome.tts.speak(prompt);

    // TODO if settings is set, continuous listening. listen for prompt word. Restart prompt here
}

// TODO auto resize textarea based on the amount of words spoken
