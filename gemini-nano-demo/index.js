(async () => {
  const errorMessage = document.getElementById("error-message");
  const costSpan = document.getElementById("cost");
  const promptArea = document.getElementById("prompt-area");
  const problematicArea = document.getElementById("problematic-area");
  const promptInput = document.getElementById("prompt-input");
  const responseArea = document.getElementById("response-area");
  const copyLinkButton = document.getElementById("copy-link-button");
  const resetButton = document.getElementById("reset-button");
  const copyHelper = document.querySelector("small");
  const rawResponse = document.querySelector("details div");
  const form = document.querySelector("form");
  const maxTokensInfo = document.getElementById("max-tokens");
  const temperatureInfo = document.getElementById("temperature");
  const tokensLeftInfo = document.getElementById("tokens-left");
  const tokensSoFarInfo = document.getElementById("tokens-so-far");
  const topKInfo = document.getElementById("top-k");
  const sessionTemperature = document.getElementById("session-temperature");
  const sessionTopK = document.getElementById("session-top-k");

  responseArea.style.display = "none";

  let session = null;

  if (!self.ai || !self.ai.languageModel) {
    errorMessage.style.display = "block";
    errorMessage.innerHTML = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    return;
  }

  promptArea.style.display = "block";
  copyLinkButton.style.display = "none";
  copyHelper.style.display = "none";

  const promptModel = async (highlight = false) => {
    copyLinkButton.style.display = "none";
    copyHelper.style.display = "none";
    problematicArea.style.display = "none";
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    responseArea.style.display = "block";
    const heading = document.createElement("h3");
    heading.classList.add("prompt", "speech-bubble");
    heading.textContent = prompt;
    responseArea.append(heading);
    const p = document.createElement("p");
    p.classList.add("response", "speech-bubble");
    p.textContent = "Generating response...";
    responseArea.append(p);
    let fullResponse = "";

    try {
      if (!session) {
        await updateSession();
        updateStats();
      }
      const stream = await session.promptStreaming(prompt);
      var speechPtr = 0;

      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        p.innerHTML = fullResponse;
        rawResponse.innerText = fullResponse;

        chrome.tts.speak(fullResponse.slice(speechPtr), {'enqueue': true});
        // console.log('"' + fullResponse.slice(speechPtr) + '"');
        speechPtr = fullResponse.length;
      }
    } catch (error) {
      p.textContent = `Error: ${error.message}`;
    } finally {
      if (highlight) {
        problematicArea.style.display = "block";
        problematicArea.querySelector("#problem").innerText =
          decodeURIComponent(highlight).trim();
      }
      copyLinkButton.style.display = "inline-block";
      copyHelper.style.display = "inline";
      updateStats();
    }
  };

  const updateStats = () => {
    if (!session) {
      return;
    }
    const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } = session;
    maxTokensInfo.textContent = new Intl.NumberFormat("en-US").format(
      maxTokens,
    );
    (temperatureInfo.textContent = new Intl.NumberFormat("en-US", {
      maximumSignificantDigits: 5,
    }).format(temperature)),
      (tokensLeftInfo.textContent = new Intl.NumberFormat("en-US").format(
        tokensLeft,
      ));
    tokensSoFarInfo.textContent = new Intl.NumberFormat("en-US").format(
      tokensSoFar,
    );
    topKInfo.textContent = new Intl.NumberFormat("en-US").format(topK);
  };

  const params = new URLSearchParams(location.search);
  const urlPrompt = params.get("prompt");
  const highlight = params.get("highlight");
  if (urlPrompt) {
    promptInput.value = decodeURIComponent(urlPrompt).trim();
    await promptModel(highlight);
  }

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

  const resetUI = () => {
    responseArea.style.display = "none";
    responseArea.innerHTML = "";
    rawResponse.innerHTML = "";
    problematicArea.style.display = "none";
    copyLinkButton.style.display = "none";
    copyHelper.style.display = "none";
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

  copyLinkButton.addEventListener("click", () => {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    const url = new URL(self.location.href);
    url.searchParams.set("prompt", encodeURIComponent(prompt));
    const selection = getSelection().toString() || "";
    if (selection) {
      url.searchParams.set("highlight", encodeURIComponent(selection));
    } else {
      url.searchParams.delete("highlight");
    }
    navigator.clipboard.writeText(url.toString()).catch((err) => {
      alert("Failed to copy link: ", err);
    });
    const text = copyLinkButton.textContent;
    copyLinkButton.textContent = "Copied";
    setTimeout(() => {
      copyLinkButton.textContent = text;
    }, 3000);
  });

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

  // Text to Speech
  document.getElementById("tts-button").addEventListener("click", async () => {
      let value = document.getElementById("response-area").value;
      await chrome.tts.speak(value);
  });

  // Speech to Text
  document.getElementById("stt-button").addEventListener("click", async () => {
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
  document.getElementById("reset-button").addEventListener("click", () => {
      document.getElementById("prompt-input").value = "";
  });


  function startListening() {
      document.getElementById("stt-button").innerHTML = "Click to Stop Speaking";
      document.getElementById("prompt-input").placeholder = "Listening...";
      document.getElementById("prompt-input").value = "";

      document.getElementById("response-area").innerHTML = "Listening...";

      if (!recognition) {
      recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = true;
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

  async function searchWithPromptGiven(prompt) {
      stopListening();
      // document.getElementById("response-area").innerHTML = prompt;
      // chrome.tts.speak(prompt);
      await promptModel();

      // TODO if settings is set, continuous listening. listen for prompt word. Restart prompt here
  }

  // TODO auto resize textarea based on the amount of words spoken

  /* End of TTS STT */
})();


function getTitle() { return document.body.innerText; }

chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    console.log(tab.id)
    chrome.scripting.executeScript({
      target : {tabId : tab.id},
      func : getTitle,
    }).then(([{result}]) => console.log(result)); // content of each tab is printed to the console
  }
  
    
  );
})
