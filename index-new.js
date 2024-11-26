(async () => {
  const costSpan = document.getElementById("cost");
  // const promptArea = document.getElementById("prompt-area");
  // const problematicArea = document.getElementById("problematic-area");
  const promptInput = document.getElementById("prompt-input");
  // const responseArea = document.getElementById("response-area");
  // const copyLinkButton = document.getElementById("copy-link-button");
  const resetButton = document.getElementById("reset-button");
  // const copyHelper = document.querySelector("small");
  const rawResponse = document.querySelector("details div");
  const form = document.querySelector("form");
  const maxTokensInfo = document.getElementById("max-tokens");
  const temperatureInfo = document.getElementById("temperature");
  const tokensLeftInfo = document.getElementById("tokens-left");
  const tokensSoFarInfo = document.getElementById("tokens-so-far");
  const topKInfo = document.getElementById("top-k");
  const sessionTemperature = document.getElementById("session-temperature");
  const sessionTopK = document.getElementById("session-top-k");
  const chatDiv = document.getElementById("chat-div");
  const sttButton = document.getElementById("stt-button");
  const sttButtonIcon = document.getElementById("stt-button-icon");
  const menuButton = document.getElementById("menu-button");
  const menuDiv = document.getElementById("menu-div");
  const topBar = document.getElementById("top-bar");
  const triggerWordSettingCheckbox = document.getElementById("trigger-word-setting");

  const OUTGOING_MESSAGE_CLASS = "outgoing";
  const INCOMING_MESSAGE_CLASS = "incoming";

  var triggerWordSetting = false;
  triggerWordSetting = await restoreSetting("triggerWordSetting");
  triggerWordSettingCheckbox.checked = triggerWordSetting;
  alert(triggerWordSetting)
  const TRIGGER_WORD = "hey tabby".toLowerCase();
  const TRIGGER_WORD_PLACEHOLDER = 'Listening for "Hey Tabby"...';
  const PROMPT_INPUT_PLACEHOLDER = "What do you want to know?";
  const SPEECH_RECOGNITION_ERROR_NO_SPEECH = "no-speech";

  var isListening = false;

  // responseArea.style.display = "none";

  let session = null;

  var menuIsOpen = false;

  if (!self.ai || !self.ai.languageModel) {
    let errorMessage = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    let incomingDiv = await createIncomingMessage();
    updateIncomingMessage(incomingDiv, errorMessage);
    // return; // COMMENT OUT WHEN TESTING IF BROWSER NOT SUPPORTED.
  }

  // promptArea.style.display = "block";
  // copyLinkButton.style.display = "none";
  // copyHelper.style.display = "none";

  const promptModel = async (highlight = false) => {
    // copyLinkButton.style.display = "none";
    // copyHelper.style.display = "none";
    // problematicArea.style.display = "none";
    const prompt = promptInput.value.trim();
    promptInput.value = "";
    if (!prompt) return;
    // responseArea.style.display = "block";

    // TODO Should change this to create speech bubble?? need to confirm the theory

    // const heading = document.createElement("h3");
    // heading.classList.add("prompt", "speech-bubble");
    // heading.textContent = prompt;
    // responseArea.append(heading);

    // const p = document.createElement("p");
    // p.classList.add("response", "speech-bubble");
    // p.textContent = "Generating response...";
    // responseArea.append(p);
    let fullResponse = "";

    await createOutgoingMessage(prompt);
    const incomingDiv = await createIncomingMessage();

    // setTimeout(() => updateIncomingMessage(incomingDiv, "HOHOHO", true), 2000);

    
    try {
      if (!session) {
        await updateSession();
        updateStats();
      }
      const stream = await session.promptStreaming(prompt);
      var speechPtr = 0;

      // // old method with old html
      // for await (const chunk of stream) {
      //   fullResponse = chunk.trim();
      //   p.innerHTML = fullResponse;
      //   rawResponse.innerText = fullResponse;

      //   chrome.tts.speak(fullResponse.slice(speechPtr), {'enqueue': true});
      //   // console.log('"' + fullResponse.slice(speechPtr) + '"');
      //   speechPtr = fullResponse.length;
      // }
      
      // TODO new method with new html (UNTESTED)
      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        updateIncomingMessage(messageDiv, fullResponse, false);
        rawResponse.innerText = fullResponse;

        chrome.tts.speak(fullResponse.slice(speechPtr), {'enqueue': true});

        speechPtr = fullResponse.length;
      }

      updateIncomingMessage(incomingDiv, fullResponse, true);
    } catch (error) {
      // p.textContent = `Error: ${error.message}`;
      let err_msg = `Error: ${error.message}`;
      updateIncomingMessage(incomingDiv, err_msg, true);
      chrome.tts.speak(err_msg);
    } finally {
    //   if (highlight) {
    //     problematicArea.style.display = "block";
    //     problematicArea.querySelector("#problem").innerText =
    //       decodeURIComponent(highlight).trim();
    //   }
    //   copyLinkButton.style.display = "inline-block";
    //   copyHelper.style.display = "inline";
    //   updateStats();
    }
  };

  // const updateStats = () => {
  //   if (!session) {
  //     return;
  //   }
  //   const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
  //   maxTokensInfo.textContent = new Intl.NumberFormat("en-US").format(
  //     maxTokens,
  //   );
  //   (temperatureInfo.textContent = new Intl.NumberFormat("en-US", {
  //     maximumSignificantDigits: 5,
  //   }).format(temperature)),
  //     (tokensLeftInfo.textContent = new Intl.NumberFormat("en-US").format(
  //       tokensLeft,
  //     ));
  //   tokensSoFarInfo.textContent = new Intl.NumberFormat("en-US").format(
  //     tokensSoFar,
  //   );
  //   topKInfo.textContent = new Intl.NumberFormat("en-US").format(topK);
  // };

  // const params = new URLSearchParams(location.search);
  // const urlPrompt = params.get("prompt");
  // const highlight = params.get("highlight");
  // if (urlPrompt) {
  //   promptInput.value = decodeURIComponent(urlPrompt).trim();
  //   await promptModel(highlight);
  // }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await promptModel();
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });

  promptInput.addEventListener("focus", () => {
    promptInput.select();
  });

  promptInput.addEventListener("input", async () => {
    const value = promptInput.value.trim();
    if (!value) {
      return;
    }
    const cost = await session.countPromptTokens(value);
    if (!cost) {
      return;
    }
    costSpan.textContent = `${cost} token${cost === 1 ? '' : 's'}`;
  });

  triggerWordSettingCheckbox.addEventListener('change', (event) => {
    if (event.currentTarget.checked) {
      updateSettings({triggerWordSetting: true});
    } else {
      updateSettings({triggerWordSetting: false});
    }
  })

  const resetUI = () => {
    // responseArea.style.display = "none";s
    // responseArea.innerHTML = "";
    // rawResponse.innerHTML = "";
    // problematicArea.style.display = "none";
    // copyLinkButton.style.display = "none";
    // copyHelper.style.display = "none";
    chatDiv.innerHTML = ""; // Remove all the chats
    maxTokensInfo.textContent = "";
    temperatureInfo.textContent = "";
    tokensLeftInfo.textContent = "";
    tokensSoFarInfo.textContent = "";
    topKInfo.textContent = "";
    promptInput.focus();
  };

  resetButton.addEventListener("click", () => {
    promptInput.value = "";
    resetUI();
    session.destroy();
    session = null;
    updateSession();
  });

  menuButton.addEventListener("click", () => {
    if (menuIsOpen) {
      // If menu is open alr then hide everything
      menuDiv.style.display = "none";
      topBar.classList.remove("menu-open");
      menuIsOpen = false;
    } else {
      // if not open the show everything
      menuDiv.style.display = "inline-block";
      if (!topBar.classList.contains("menu-open")) {
        topBar.classList.add("menu-open");
      }
      menuIsOpen = true;
    }

  });

  if (triggerWordSetting) {
    // If listening for trigger word then just start immediately
    startListeningForTriggerWord();
  } else {
    // If not listening for trigger word, then click to speak
    sttButton.addEventListener("click", async () => {
      if (!isListening) {
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
          stopListening(recognition);
          console.log("recongtion.stop");
      }
    });
  }

  // copyLinkButton.addEventListener("click", () => {
  //   const prompt = promptInput.value.trim();
  //   if (!prompt) return;
  //   const url = new URL(self.location.href);
  //   url.searchParams.set("prompt", encodeURIComponent(prompt));
  //   const selection = getSelection().toString() || "";
  //   if (selection) {
  //     url.searchParams.set("highlight", encodeURIComponent(selection));
  //   } else {
  //     url.searchParams.delete("highlight");
  //   }
  //   navigator.clipboard.writeText(url.toString()).catch((err) => {
  //     alert("Failed to copy link: ", err);
  //   });
  //   const text = copyLinkButton.textContent;
  //   copyLinkButton.textContent = "Copied";
  //   setTimeout(() => {
  //     copyLinkButton.textContent = text;
  //   }, 3000);
  // });

  const updateSession = async () => {
    session = await self.ai.languageModel.create({
      temperature: Number(sessionTemperature.value),
      topK: Number(sessionTopK.value),
    });
    resetUI();
    updateStats();
  };

  sessionTemperature.addEventListener("input", async () => {
    await updateSession();
  });

  sessionTopK.addEventListener("input", async () => {
    await updateSession();
  });

  if (!session) {
    const { defaultTopK, maxTopK, defaultTemperature } =
      await self.ai.languageModel.capabilities();
    sessionTemperature.value = defaultTemperature;
    sessionTopK.value = defaultTopK;
    sessionTopK.max = maxTopK;
    await updateSession();
  }

  

  /* TTS STT */
  var isListening = false;
  var recognition;
  var triggerWordRecognition;

  // // Text to Speech
  // document.getElementById("tts-button").addEventListener("click", async () => {
  //     let value = responseArea.value;
  //     await chrome.tts.speak(value);
  // });


  function startListeningForTriggerWord() {
    disableMicButtonCSS();
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    promptInput.value = "";

    let triggerWordSpoken = false;

    if (!triggerWordRecognition) {
      triggerWordRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      triggerWordRecognition.continuous = true;
      triggerWordRecognition.interimResults = false;
      triggerWordRecognition.lang = 'en-US';  // Set the language (optional)

      // Stop if already listening
      if (isListening) {
        stopListening(triggerWordRecognition);
      }

      triggerWordRecognition.onresult = (e) => {
          const error = e.results === undefined || (typeof e.results) === "undefined";
          if (error) {
              triggerWordRecognition.onend = null;
              triggerWordRecognition.stop();
              console.log(error.code)
              console.error(error);
              return;
          }

          let final = e.results[e.results.length-1][0].transcript; // Get last recorded sentence
          console.log(final);
          triggerWordSpoken = final.toLowerCase().includes(TRIGGER_WORD)

          if (triggerWordSpoken) {
            stopListening(triggerWordRecognition);
            startListening();
          }
      };

      triggerWordRecognition.onerror = (event) => {
        if (!event.error == SPEECH_RECOGNITION_ERROR_NO_SPEECH) {
          stopListening(triggerWordRecognition);
          console.error("Speech recognition error:", event.error);
        }
      };

      triggerWordRecognition.onend = () => {
          // Automatically restart if listening mode is still active
          if (isListening && !triggerWordSpoken) {
            triggerWordRecognition.start();
          }
      };
    }
    
    triggerWordRecognition.start();
    isListening = true;
  }

  function startListening() {
      if (!triggerWordSetting) {
        toggleMicButton(true);
      }
      promptInput.placeholder = "Listening...";
      promptInput.value = "";

      // responseArea.innerHTML = "Listening...";

      if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;  // Allows you to get partial results
        recognition.lang = 'en-US';  // Set the language (optional)

        // Stop if already listening
        if (isListening) {
            stopListening(recognition);
        }

        recognition.onresult = (e) => {
            let interim = "";
            let final = "";

            const error = e.results === undefined || (typeof e.results) === "undefined";
            if (error) {
                recognition.onend = null;
                // recognition.stop();
                stopListening(recognition);
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
                promptInput.value = interim;
                promptInput.scrollLeft = promptInput.scrollWidth;
            } else if (final) {
                promptInput.value = final;
                promptInput.scrollLeft = promptInput.scrollWidth;
                searchWithPromptGiven(final)
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          
        };
      }

      recognition.start();
      isListening = true;
  }

  function stopListening(recognition) {
    if (recognition) {
      recognition.stop();
    }
    isListening = false;

    // If trigger word setting then start immediately
    if (triggerWordSetting) {
      promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    } else {
      // else toggle mic button
      toggleMicButton(false)
      promptInput.placeholder = PROMPT_INPUT_PLACEHOLDER;
    }
  }

  async function searchWithPromptGiven(prompt) {
      stopListening(recognition);
      await promptModel();

      // If trigger word setting, start listening again
      if (triggerWordSetting) {
        startListeningForTriggerWord()
      }
      // TODO if settings is set, continuous listening. listen for prompt word. Restart prompt here
  }

  // Creates a message div with "..." while waiting for model response. 
  // Once model response is out, will replace the "..." with the response using "updateIncomingMessage"
  async function createIncomingMessage() {
    // Make div for the message
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(INCOMING_MESSAGE_CLASS, "typing");
    // Create bubble div to be a child of message div
    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("bubble");
    // Make the "..." div, add it for the message
    ["one", "two", "three"].forEach(num => {
      let e = document.createElement("div");
      e.classList.add("ellipsis", num);
      bubbleDiv.appendChild(e);
    })
    messageDiv.appendChild(bubbleDiv);
    
    // Show message
    chatDiv.append(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // Don't add TTS button first
    return messageDiv
  }

  // Updates the incoming message from "..." to the response
  async function updateIncomingMessage(messageDiv, text, isFinal) {
    // Remove "..." to show model is done loading
    messageDiv.firstChild.innerHTML = text;
    messageDiv.classList.remove("typing");

    // Text to speech is to be done OUTSIDE, because need to enqueue
    // chrome.tts.speak(text);

    if (isFinal) {
      // Add TTS button
      addTTSButton(messageDiv, text);
    }
    
    return messageDiv;
  }

  // Creates outgoing message
  async function createOutgoingMessage(text) {
    // Make div for the message
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(OUTGOING_MESSAGE_CLASS);
    // Create bubble div to be a child of message div
    const bubbleDiv = document.createElement("div");
    bubbleDiv.classList.add("bubble");
    // Add text for message
    bubbleDiv.innerText = text;
    messageDiv.appendChild(bubbleDiv);

    // Adds tts button and shows it
    addTTSButton(messageDiv, text);

    // Show message
    chatDiv.append(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    return messageDiv
  }

  // Adds the TTS Button to a message div
  async function addTTSButton(messageDiv, text) {
    const newButton = document.createElement("button");
    newButton.classList.add("tts")
    const speakerIcon = document.createElement("icon");
    speakerIcon.classList.add("fa", "fa-volume-up")
    newButton.appendChild(speakerIcon)
    newButton.addEventListener("click", function(e) {
        chrome.tts.speak(text);
    });
    // Combine everything
    messageDiv.appendChild(newButton);
  }

  function toggleMicButton(toggleOn) {
    console.log(sttButtonIcon.classList)
    if (toggleOn) {
      sttButtonIcon.classList.remove("fa-microphone");
      if (!sttButtonIcon.classList.contains("fa-microphone-slash")) {
        sttButtonIcon.classList.add("fa-microphone-slash");
      }
    } else {
      sttButtonIcon.classList.remove("fa-microphone-slash");
      if (!sttButtonIcon.classList.contains("fa-microphone")) {
        sttButtonIcon.classList.add("fa-microphone");
      }
    }
  }

  function disableMicButtonCSS() {
    toggleMicButton(true);
    if (!sttButtonIcon.classList.contains("disabled")) {
      sttButtonIcon.classList.add("disabled");
    }
    if (!promptInput.classList.contains("disabled")) {
      promptInput.classList.add("disabled");
    }
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
  }

  function enableMicButtonCSS() {
    sttButtonIcon.classList.remove("disabled");
    promptInput.classList.remove("disabled");
  }

  function updateSettings(settingsObject) {
    chrome.storage.sync.set(
      settingsObject,
      () => {
        alert("Settings Saved.")
      }
    );
  }

  // MUST await the settings to be restored before continuing anything
  async function restoreSetting(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(
          key,
          (items) => {
            alert(items[key])
            resolve(items[key]);
          });
      } catch (ex) {
        reject(ex);
      }
    });
  };

  // TODO auto resize textarea based on the amount of words spoken

  /* End of TTS STT */
})();

