(async () => {
  const promptInput = document.getElementById("prompt-input");
  const resetButton = document.getElementById("reset-button");

  const titleModelParams = {
    temperature: 1,
    topK: 3,
    systemPrompt: `I will give you a question, followed by a list of website titles. From the following list of website titles, choose the one that has the highest chance of answering the question. If none of them look promising, say <TABBY NOT FOUND>. Only say the title, without reasoning.`,
  };

  const questionModelParams = {
    temperature: 0.5,
    topK: 1,
    systemPrompt: `I will give you a question, followed by a text. If the question can be answered based on the text provided, give a relevant and concise answer. If the question is not related to the text, explain why.`,
  };

  const form = document.querySelector("form");
  const chatDiv = document.getElementById("chat-div");
  const sttButton = document.getElementById("stt-button");
  const sttButtonIcon = document.getElementById("stt-button-icon");
  const menuButton = document.getElementById("menu-button");
  const menuDiv = document.getElementById("menu-div");
  const topBar = document.getElementById("top-bar");
  const triggerWordSettingCheckbox = document.getElementById(
    "trigger-word-setting"
  );

  const OUTGOING_MESSAGE_CLASS = "outgoing";
  const INCOMING_MESSAGE_CLASS = "incoming";

  const TRIGGER_WORD_SETTING_SYNC_VARIABLE = "triggerWordSetting";
  restoreTriggerWordCheckboxSetting(TRIGGER_WORD_SETTING_SYNC_VARIABLE);

  function getTriggerWordSetting() {
    return triggerWordSettingCheckbox.checked;
  }

  const TRIGGER_WORD = "hey tabby".toLowerCase();
  const TRIGGER_WORD_PLACEHOLDER = 'Listening for "Hey Tabby"...';
  const PROMPT_INPUT_PLACEHOLDER = "What do you want to know?";
  const SPEECH_RECOGNITION_ERROR_NO_SPEECH = "no-speech";

  // tabId: tabSummary
  // var tabInfos = {}

  //   const TITLE_PROMPT =
  // "You will be answering a question based on the text given to you. The format will be as follows: \
  // \
  // \"Question\": [question] \
  // \"Text\": [Text] \
  // \
  // You are not limited to solely finding an answer in the text, but prioritise finding the answer in the context of the text. \
  // You may include your own information if the text is not relevant or you need more information";
  //   const TITLE_PROMPT =
  // `"I will give you a question, followed by a text. If the question can be answered based on the text provided, give a relevant and concise answer. If the text does not provide enough information to answer the question, say the following words exactly: 'The websites you have opened are not relevant, so here is a Google Search link for your question.' Do not include a Google Search link.`
  //say the following words exactly "${IRRELEVANT_ANSWER}". If it is not related, explain why` // Generate a percentage of how confident you are of your answer, and say "IRRELEVANT" if that percentage is lower than 60%.`// If the percentage is less than 60%, say the following WITHOUT providing a google search link: '${IRRELEVANT_ANSWER}'`;//. `

  const IRRELEVANT_ANSWER = `Your open websites are all not related, click here to search for it.`;

  // const SYSTEM_PROMPT_FIND_RELEVANT_TAB = `I will give you a question, followed by a list of website titles. From the following list of website titles, choose the one that has the highest chance of answering the question. If none of them look promising, say "false"`;

  // DO NOT USE THE WORD IRRELEVANT. use related
  // IMPORTANT: Filtering a related passage will be done with the summaries. If it is chosen, means confirm related. If none are related, we will provide the google search link then.
  // This prompt api will be confident it is related, so if it cannot answer the question it will be due to missing info in the text, not because it is the wrong website.

  function generateIrrelevantAnswerWithGoogleSearchLink(prompt) {
    let searchLink = `https://www.google.com/search?q=${prompt.replaceAll(
      " ",
      "+"
    )}`;
    return `<a href="${searchLink}" target="_blank">${IRRELEVANT_ANSWER}</a>`;
  }

  function generateTitlePrompt(question, tabTitles) {
    // DO NOT ENCLOSE THEM IN DOUBLE QUOTES, the model will output the double quotes which messes it up
    let tabTitlesString = tabTitles.join("\n");
    return `"Question": ${question}

"${tabTitlesString}`;
  }

  var isListening = false;

  // responseArea.style.display = "none";

  let titleModel = null;
  let questionModel = null;

  var menuIsOpen = false;

  let startingMessageDiv = await createIncomingMessage();
  updateIncomingMessage(startingMessageDiv, "Hey there this is Tabby, ask me any question you would like to be answered by your tabs.", false, "");

  // Update here when using a new API
  //if (!self.ai || !self.ai.languageModel || !self.ai.summarizer) {
  if (!self.ai || !self.ai.languageModel) {
    let errorMessage = `Your browser doesn't support the Prompt API. If you're on Chrome, join the <a href="https://developer.chrome.com/docs/ai/built-in#get_an_early_preview">Early Preview Program</a> to enable it.`;
    let incomingDiv = await createIncomingMessage();
    updateIncomingMessage(incomingDiv, errorMessage, false, "");
    // return; // COMMENT OUT WHEN TESTING IF BROWSER NOT SUPPORTED. TODO comment back in once finalized?
  }

  // Expected output from prompt API: confidence percent followed by answer
  // If confidence below threshold, show irrelevant answer text, else show answer
  function textRelevanceCheck(response, confidenceThreshold) {
    percentLoc = response.search("%");
    if (percentLoc != -1) {
      return 0, IRRELEVANT_ANSWER;
    } else {
      let confidence = response.slice(0, percentLoc).trim();
      let answer = response.slice(percentLoc + 1).trim();
      if (isNumeric(confidence) && confidence >= confidenceThreshold) {
        answer = IRRELEVANT_ANSWER;
      }

      return confidence, answer;
    }
  }

  function isNumeric(str) {
    if (typeof str != "string") return false; // we only process strings!
    return (
      !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str))
    ); // ...and ensure strings of whitespace fail
  }

  // Let model decide which website is relevant
  // (Prompt 1)
  const promptTitleModel = async (promptInputValue) => {
    // Get tab titles and id
    var tabInfos = await loadTabTitles();
    var tabTitles = Object.values(tabInfos);

    if (!promptInputValue) return;

    await createOutgoingMessage(promptInputValue);
    const incomingDiv = await createIncomingMessage();

    if (!titleModel) {
      await createTitleModel();
    }

    promptInput.value = "";

    let titlePrompt = generateTitlePrompt(promptInputValue, tabTitles);
    console.log(titlePrompt);
    const selectedTabTitle = await titleModel.prompt(titlePrompt);
    console.log("title response: " + selectedTabTitle);

    // TODO: when comparing, check if the shorter text is found in the longer text
    if (tabTitles.includes(selectedTabTitle)) {
      // If one of the website is relevant, get the websiteContent from innerText
      let websiteContent = getRelevantTabContent(selectedTabTitle, tabInfos);
      //alert(selectedTabTitle);
      // Prompt question model with prompt and website content
      return promptQuestionModel(promptInputValue, websiteContent, incomingDiv);
    } else {
      // If non of the websites are relevant, show irrelevant message
      return updateIncomingMessageIrrelevantAnswer(
        incomingDiv,
        promptInputValue
      );
    }
  };

  const promptQuestionModel = async (
    promptInputValue,
    websiteContent,
    incomingDiv
  ) => {
    const prompt = generateQuestionPrompt(promptInputValue, websiteContent);
    // `"Question": what temperature should the cookies be baked at?

    // "Website Titles":
    // Whatsapp Web
    // New Tab
    // Cookie Clicker`

    if (!prompt) return;

    let fullResponse = "";

    try {
      if (!questionModel) {
        await createQuestionModel();
      }
      // const titleStream = await titleModel.promptStreaming(prompt); // change from stream to prompt

      const questionStream = await questionModel.promptStreaming(
        generateQuestionPrompt
      );
      var speechPtr = 0;

      for await (const chunk of questionStream) {
        fullResponse = chunk.trim();
        updateIncomingMessage(
          incomingDiv,
          fullResponse,
          false,
          promptInputValue
        );

        chrome.tts.speak(fullResponse.slice(speechPtr), { enqueue: true });

        speechPtr = fullResponse.length;
      }

      updateIncomingMessage(incomingDiv, fullResponse, true, promptInputValue);
    } catch (error) {
      let err_msg = `Error: ${error.message}`;
      updateIncomingMessage(incomingDiv, err_msg, true, promptInputValue);
      chrome.tts.speak(err_msg);
    } finally {
    }
  };

  // Two ways to send prompt:
  // (Option 1) User keys in and presses submit form.addEventListener("submit")
  // (Option 2) searchWithPromptGiven();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    promptTitleModel(promptInput.value);
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
  });

  triggerWordSettingCheckbox.addEventListener("change", (event) => {
    if (event.currentTarget.checked) {
      updateSettings({ TRIGGER_WORD_SETTING_SYNC_VARIABLE: true });
      startListeningForTriggerWord();
    } else {
      enableMicButtonCSS();
      updateSettings({ TRIGGER_WORD_SETTING_SYNC_VARIABLE: false });
      stopListening(triggerWordRecognition);
    }
  });

  const resetUI = () => {
    // responseArea.style.display = "none";s
    // responseArea.innerHTML = "";
    // rawResponse.innerHTML = "";
    // problematicArea.style.display = "none";
    // copyLinkButton.style.display = "none";
    // copyHelper.style.display = "none";
    chatDiv.innerHTML = ""; // Remove all the chats
    // maxTokensInfo.textContent = "";
    // temperatureInfo.textContent = "";
    // tokensLeftInfo.textContent = "";
    // tokensSoFarInfo.textContent = "";
    // topKInfo.textContent = "";
    promptInput.focus();
  };

  resetButton.addEventListener("click", () => {
    promptInput.value = "";
    resetUI();
    // questionModel.destroy();
    // questionModel = null;
    // updateSession();
  });

  menuButton.addEventListener("click", () => {
    if (menuIsOpen) {
      // If menu is open alr then hide everything
      menuDiv.style.display = "none";
      menuIsOpen = false;
    } else {
      // if not open then show everything
      menuDiv.style.display = "inline-block";
      menuIsOpen = true;
    }
  });

  // Main Code
  if (getTriggerWordSetting()) {
    // If listening for trigger word then just start immediately
    startListeningForTriggerWord();
  } else {
    // If not listening for trigger word, then click to speak
    sttButton.addEventListener("click", async () => {
      if (!isListening) {
        // TODO prompt user for microphone access if not given. not sure why cannot.
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Microphone permission granted, proceed with recognition
            startListening();
          })
          .catch((error) => {
            alert(
              "Please enable microphone access in your browser settings to use this feature."
            );
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

  // const updateSession = async () => {
  const createTitleModel = async () => {
    titleModel = await self.ai.languageModel.create({
      temperature: Number(titleModelParams.temperature),
      topK: Number(titleModelParams.topK),
      systemPrompt: titleModelParams.systemPrompt,
    });
  };

  const createQuestionModel = async () => {
    questionModel = await self.ai.languageModel.create({
      temperature: Number(questionModelParams.temperature),
      topK: Number(questionModelParams.topK),
      systemPrompt: questionModelParams.systemPrompt,
    });
  };

  // if (!questionModel) {
  //   const { defaultTopK, maxTopK, defaultTemperature } =
  //     await self.ai.languageModel.capabilities();
  //   console.log(await self.ai.languageModel.capabilities())
  //   sessionTemperature.value = defaultTemperature;
  //   sessionTopK.value = defaultTopK;
  //   sessionTopK.max = maxTopK;
  //   await updateSession();
  // }

  var isListening = false;
  var recognition;
  var triggerWordRecognition;

  function startListeningForTriggerWord() {
    disableMicButtonCSS();
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    promptInput.value = "";

    let triggerWordSpoken = false;

    if (!triggerWordRecognition) {
      triggerWordRecognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      triggerWordRecognition.continuous = true;
      triggerWordRecognition.interimResults = false;
      triggerWordRecognition.lang = "en-US"; // Set the language (optional)

      // Stop if already listening
      if (isListening) {
        stopListening(triggerWordRecognition);
      }

      triggerWordRecognition.onresult = (e) => {
        const error =
          e.results === undefined || typeof e.results === "undefined";
        if (error) {
          triggerWordRecognition.onend = null;
          triggerWordRecognition.stop();
          console.log(error.code);
          console.error(error);
          return;
        }

        let final = e.results[e.results.length - 1][0].transcript; // Get last recorded sentence
        console.log(final);
        triggerWordSpoken = final.toLowerCase().includes(TRIGGER_WORD);

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
    if (!getTriggerWordSetting()) {
      slashMicButton(true);
    }
    promptInput.placeholder = "Listening...";
    promptInput.value = "";

    // responseArea.innerHTML = "Listening...";

    if (!recognition) {
      recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true; // Allows you to get partial results
      recognition.lang = "en-US"; // Set the language (optional)

      // Stop if already listening
      if (isListening) {
        stopListening(recognition);
      }

      recognition.onresult = (e) => {
        let interim = "";
        let final = "";

        const error =
          e.results === undefined || typeof e.results === "undefined";
        if (error) {
          recognition.onend = null;
          // recognition.stop();
          stopListening(recognition);
          console.log(error.code);
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
          searchWithPromptGiven();
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {};
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
    if (getTriggerWordSetting()) {
      promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
    } else {
      // else toggle mic button
      slashMicButton(false);
      promptInput.placeholder = PROMPT_INPUT_PLACEHOLDER;
    }
  }

  // Two ways to send prompt:
  // (Option 1) User keys in and presses submit form.addEventListener("submit")
  // (Option 2) searchWithPromptGiven();
  async function searchWithPromptGiven() {
    stopListening(recognition);
    await promptTitleModel(promptInput.value);

    // If trigger word setting, start listening again
    if (getTriggerWordSetting()) {
      startListeningForTriggerWord();
    }
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
    ["one", "two", "three"].forEach((num) => {
      let e = document.createElement("div");
      e.classList.add("ellipsis", num);
      bubbleDiv.appendChild(e);
    });
    messageDiv.appendChild(bubbleDiv);

    // Show message
    chatDiv.append(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;

    // Don't add TTS button first
    return messageDiv;
  }

  // Updates the incoming message from "..." to the irrelevant response
  async function updateIncomingMessageIrrelevantAnswer(
    messageDiv,
    promptInputValue
  ) {
    return updateIncomingMessage(
      messageDiv,
      IRRELEVANT_ANSWER,
      true,
      promptInputValue
    );
  }

  // Updates the incoming message from "..." to the response
  async function updateIncomingMessage(
    messageDiv,
    text,
    isFinal,
    promptInputValue
  ) {
    let textToShow = text;
    let textToTTS = text;
    // If irrelevant, give google search link
    // TODO: If the answer is close enough to IRRELEVANT_ANSWER, also accept
    //       https://gist.github.com/andrei-m/982927
    if (text == IRRELEVANT_ANSWER) {
      textToShow =
        generateIrrelevantAnswerWithGoogleSearchLink(promptInputValue);
    }

    // Remove "..." to show model is done loading
    // IMPORTANT to use innerHTML NOT innerText because the google search link is using <a>
    messageDiv.firstChild.innerHTML = textToShow;
    messageDiv.classList.remove("typing");

    // Text to speech is to be done OUTSIDE, because need to enqueue
    // chrome.tts.speak(text);

    if (isFinal) {
      // Add TTS button
      addTTSButton(messageDiv, textToTTS);
    }

    chatDiv.scrollTop = chatDiv.scrollHeight;
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
    return messageDiv;
  }

  // Adds the TTS Button to a message
  // TODO Change to update where it updates from stopTTS => startTTS chrome.tts.stop();
  async function addTTSButton(messageDiv, text) {
    const newButton = document.createElement("button");
    newButton.classList.add("tts");
    const speakerIcon = document.createElement("icon");
    speakerIcon.classList.add("fa", "fa-volume-up");
    newButton.appendChild(speakerIcon);
    newButton.addEventListener("click", function (e) {
      chrome.tts.speak(text);
    });
    // Combine everything
    messageDiv.appendChild(newButton);
  }

  // false to show mic button. true to show slashed mic button
  function slashMicButton(toggleOn) {
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

  // Call when disabling mic button when trigger word setting is active only
  function disableMicButtonCSS() {
    slashMicButton(true);
    if (!sttButtonIcon.classList.contains("disabled")) {
      sttButtonIcon.classList.add("disabled");
    }
    if (!promptInput.classList.contains("disabled")) {
      promptInput.classList.add("disabled");
    }
    promptInput.placeholder = TRIGGER_WORD_PLACEHOLDER;
  }

  // Call when enabling mic button when trigger word setting is deactivated only
  function enableMicButtonCSS() {
    slashMicButton(false);
    sttButtonIcon.classList.remove("disabled");
    promptInput.classList.remove("disabled");
    promptInput.placeholder = PROMPT_INPUT_PLACEHOLDER;
  }

  // Update the settings page to local storage
  function updateSettings(settingsObject) {
    chrome.storage.local.set(settingsObject, () => {
      // alert("Settings Saved.")
    });
  }

  // Restore the settings page from local storage
  function restoreTriggerWordCheckboxSetting(key) {
    chrome.storage.local.get(key, (items) => {
      triggerWordSettingCheckbox.checked = items[key];
      triggerWordSettingCheckbox.dispatchEvent(new Event("change"));
    });
  }

  // TODO auto resize textarea based on the amount of words spoken

  // // TODO check if the tabs changed. If no change no need to reload everything
  // // Get summaries of all open tabs
  // function loadTabInfos(prompt) {
  //   tabInfos = {};
  //   alert("TEST")

  //   chrome.tabs.query({}, (tabs) => {
  //     tabs.forEach((tab) => {
  //       console.log(tab.id)
  //       chrome.scripting.executeScript({
  //         target : {tabId : tab.id},
  //         func : () => {
  //           alert('tse')
  //           console.log(document.title)
  //           return getTabInfo(tab)
  //         },
  //       }).then(([{tabInfo}]) => {
  //         // TODO Ignore "New Tab"
  //         alert(tabInfo)
  //         console.log(tabInfo)
  //         // if (tabInfo.tabTitle == "New Tab") {
  //         //   console.log("Ignoring new tab")
  //         //   return
  //         // }

  //         tabInfos[tabInfo.tabId] = tabInfo.tabTitle;
  //       }); // content of each tab is printed to the console
  //     });

  //     // relevantTab = getRelevantTab(prompt);
  //     console.log(tabInfos)
  //   })
  // }
  // loadTabInfos("tset");

  // // Counts tabs that are not New Tab and chrome://
  // // The foreach will fail so we need to ignore them also
  // function countValidTabs() {

  // }

  function getTitle() {
    console.log("YES");
    // try {
    //   return document.title;
    // } catch (err) {
    //   console.error(err);
    //   return "";
    // }
    return document.title;
  }

  // // TODO currently not working for snoozed tabs
  // async function loadTabTitles() {
  //   let tabIds = [];
  //   let tabTitles = [];
  //   // let tabInfos = {}
  //   // let numOfTabsLoaded = 0;

  //   chrome.tabs.query({}, (tabs) => {
  //     // let numOfValidTabs = countValidTabs(tabs);
  //     tabs.forEach((tab) => {
  //       chrome.scripting.executeScript({
  //         target : {tabId : tab.id},
  //         func : getTitle,
  //       }, ([{result}]) => {
  //         // https://stackoverflow.com/questions/26517988/unchecked-runtime-lasterror-while-running-tabs-executescript/45603880#45603880
  //         // If new tab or chrome:// will show error. Still count it as a tab.
  //         // let e = chrome.runtime.lastError;
  //         // console.log(e);
  //         // if(e !== undefined){
  //         //   console.log("Chrome error");
  //         //   numOfTabsLoaded++;
  //         //   console.log(tabId, _, e);
  //         //   return;
  //         // }
  //         tabIds.push(tab.id);
  //         tabTitles.push(result);
  //       });
  //     });
  //   })
  //   console.log([tabIds, tabTitles])
  //   return [tabIds, tabTitles];
  // }

  async function loadTabTitles() {
    let tabInfos = {};

    // Get tabs
    const tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new Error("Failed to query tabs"));
        } else {
          resolve(tabs);
        }
      });
    });

    console.log("Tabs fetched:", tabs); // Log the fetched tabs to check

    // Create an array of promises for script execution
    tabs.forEach((tab) => {
      tabInfos[tab.id] = tab.title;
    });

    // Return the final tab IDs and titles
    return tabInfos;
  }

  // // Testing only can delete later
  // tabInfos = await loadTabTitles();
  // console.log(tabInfos)

  // Summarise tab content
  function summariseTabContent(tabContent) {
    tabContent = preprocessTabContent(tabContent);
  }

  // TODO preprocess the tab summaries
  function preprocessTabContent(tabContent) {
    return tabContent;
  }

  function generateQuestionPrompt(question, websiteContent) {
    return `"Question": ${question}
    "Text": ${websiteContent}"`;
  }

  function getBodyText() {
    return document.body.innerText;
  }

  function getRelevantTabContent(selectedTabTitle, tabInfos) {
    // For each key,
    // selectedTabID = Object.keys(tabInfos).find(key => tabInfos[key] === selectedTabTitle);
    let selectedTabID = -1;
    for (let key in tabInfos) {
      if (tabInfos[key] === selectedTabTitle) {
        selectedTabID = key;
        break; // Stop once the key is found
      }
    }

    if (selectedTabID == -1) {
      // TODO handle it
      alert("NOT FOUND.");
    } else {
      return chrome.scripting.executeScript({
        target: { tabId: Number(selectedTabID) },
        function: getBodyText,
      });
    }
  }
})();
